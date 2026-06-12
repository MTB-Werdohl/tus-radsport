$ErrorActionPreference = "Stop"

$URL = "https://eazizesytrnknbgrnggj.supabase.co"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVheml6ZXN5dHJua25iZ3JuZ2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDM2NDcsImV4cCI6MjA5NDYxOTY0N30.fLTAzJvNurXru8maAZYkD5MjgArZ3l_KRnVrb_ftR-o"

$headers = @{
  apikey        = $ANON
  Authorization = "Bearer $ANON"
  "Content-Type" = "application/json"
}

function Invoke-Rpc($name, $bodyObj) {
  $body = $bodyObj | ConvertTo-Json -Compress
  return Invoke-RestMethod `
    -Uri "$URL/rest/v1/rpc/$name" `
    -Method Post `
    -Headers $headers `
    -Body $body
}

function Test-StreamIntegrity($payload) {
  if ($null -eq $payload) {
    return @{ ok = $false; detail = "null payload" }
  }

  $pc = [int]$payload.point_count
  $keys = @("distance", "altitude", "velocity_smooth", "latlng", "time")
  $issues = @()

  foreach ($key in $keys) {
    $arr = $payload.streams.$key
    if ($null -eq $arr) {
      $issues += "missing $key"
      continue
    }
    $len = @($arr).Count
    if ($len -ne $pc) {
      $issues += "$key length=$len expected=$pc"
    }
  }

  if ($payload.streams.version) {
    $issues += "unexpected version key inside streams JSON"
  }

  if ($issues.Count -eq 0) {
    return @{ ok = $true; detail = "all arrays length=$pc" }
  }

  return @{ ok = $false; detail = ($issues -join "; ") }
}

$results = @()

function Add-Result($id, $name, $sqlRpc, $eval, $pass) {
  $script:results += [pscustomobject]@{
    Testfall = $id
    Name     = $name
    Ergebnis = $sqlRpc
    Bewertung = if ($pass) { "bestanden" } else { "nicht bestanden" }
  }
}

# T1: RPC exists - null for random uuid
$randomId = [guid]::NewGuid().ToString()
$nullResult = Invoke-Rpc "get_public_activity_streams" @{ p_activity_id = $randomId }
Add-Result "T1" "RPC unbekannte UUID" "get_public_activity_streams('$randomId') => $(if($null -eq $nullResult){'null'}else{'data'})" "Erwartet null" ($null -eq $nullResult)

# T2: Direct table access blocked for anon
try {
  Invoke-RestMethod -Uri "$URL/rest/v1/activity_streams?select=activity_id&limit=1" -Headers $headers -Method Get
  Add-Result "T2" "RLS anon SELECT activity_streams" "SELECT erlaubt" "Soll blockiert sein" $false
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Add-Result "T2" "RLS anon SELECT activity_streams" "HTTP $code / permission denied" "Kein Client-Zugriff" ($code -eq 401 -or $code -eq 403 -or $code -eq 406)
}

# T3: Feed activities - streams RPC
$feed = Invoke-Rpc "get_public_activity_feed" @{ p_days = 90 }
$withStreams = @()
$withoutStreams = @()
$integrityFails = @()

foreach ($activity in $feed) {
  $streams = Invoke-Rpc "get_public_activity_streams" @{ p_activity_id = $activity.id }
  if ($null -eq $streams) {
    $withoutStreams += $activity.id
    continue
  }
  $check = Test-StreamIntegrity $streams
  if (-not $check.ok) {
    $integrityFails += "$($activity.id): $($check.detail)"
  } else {
    $withStreams += [pscustomobject]@{
      id = $activity.id
      point_count = $streams.point_count
      original = $streams.original_point_count
      schema_version = $streams.schema_version
      distance0 = $streams.streams.distance[0]
      distanceLast = $streams.streams.distance[-1]
      activity_distance_m = $activity.distance_m
    }
  }
}

$feedCount = @($feed).Count
$withCount = $withStreams.Count
$withoutCount = $withoutStreams.Count

Add-Result "T3" "Feed-Touren mit Stream-RPC" "$withCount / $feedCount Feed-Einträge liefern Streams" "Mindestens 1 erwartet für B.2-Verifikation" ($withCount -ge 1)

Add-Result "T4" "Feed-Touren ohne Stream-RPC" "$withoutCount / $feedCount => null (Backfill-Lücke ok)" "Nicht jede Tour muss Streams haben" $true

Add-Result "T5" "Array-Längen = point_count (alle mit Streams)" $(if($integrityFails.Count -eq 0){"0 Integritätsfehler bei $withCount Touren"}else{$integrityFails -join " | "}) "5 Keys synchron" ($integrityFails.Count -eq 0)

# T6: schema_version column only
$schemaIssues = @($withStreams | Where-Object { $_.schema_version -ne 1 })
Add-Result "T6" "schema_version = 1" "$(@($withStreams | Select-Object -First 3 | ForEach-Object { "$($_.id.Substring(0,8))… v=$($_.schema_version)" }) -join '; ')" "Spaltenwert 1" ($schemaIssues.Count -eq 0)

# T7: point_count bounds
$boundIssues = @()
foreach ($s in $withStreams) {
  if ($s.point_count -le 0) { $boundIssues += "$($s.id) point_count<=0" }
  if ($s.point_count -gt 800) { $boundIssues += "$($s.id) point_count=$($s.point_count)>800" }
  if ($s.original -lt $s.point_count) { $boundIssues += "$($s.id) original<point" }
}
Add-Result "T7" "point_count Integrität" $(if($boundIssues.Count -eq 0){"alle <=800, original>=point_count"}else{$boundIssues -join '; '}) "Sync-Grenze" ($boundIssues.Count -eq 0)

# T8: Data quality sample - distance monotonic-ish, time monotonic
$sample = $withStreams | Select-Object -First 1
$qualityDetail = "kein Sample"
$qualityPass = $false
if ($sample) {
  $full = Invoke-Rpc "get_public_activity_streams" @{ p_activity_id = $sample.id }
  $dist = @($full.streams.distance)
  $time = @($full.streams.time)
  $distMonotonic = $true
  for ($i = 1; $i -lt $dist.Count; $i++) {
    if ([double]$dist[$i] -lt [double]$dist[$i-1] - 0.01) { $distMonotonic = $false; break }
  }
  $timeMonotonic = $true
  for ($i = 1; $i -lt $time.Count; $i++) {
    if ([int]$time[$i] -lt [int]$time[$i-1]) { $timeMonotonic = $false; break }
  }
  $lastDist = [double]$dist[-1]
  $actDist = [double]$sample.activity_distance_m
  $distMatch = if ($actDist -gt 0) { [math]::Abs($lastDist - $actDist) / $actDist -le 0.05 } else { $true }
  $qualityDetail = "sample=$($sample.id.Substring(0,8))… distMono=$distMonotonic timeMono=$timeMonotonic lastDist=$lastDist activityDist=$actDist within5%=$distMatch"
  $qualityPass = $distMonotonic -and $timeMonotonic -and $distMatch
}
Add-Result "T8" "Datenqualität (Sample)" $qualityDetail "Monotonie + Enddistanz" $qualityPass

# T9: Detail vs Streams visibility alignment
$alignFails = @()
foreach ($activity in ($feed | Select-Object -First 10)) {
  $detail = Invoke-Rpc "get_public_activity_detail" @{ p_activity_id = $activity.id; p_days = 90 }
  $streams = Invoke-Rpc "get_public_activity_streams" @{ p_activity_id = $activity.id }
  $detailVisible = ($null -ne $detail)
  $streamsVisible = ($null -ne $streams)
  if ($detailVisible -and -not $streamsVisible) {
    # ok - streams may be missing
  } elseif (-not $detailVisible -and $streamsVisible) {
    $alignFails += $activity.id
  }
}
Add-Result "T9" "Sichtbarkeit Detail/Streams konsistent" $(if($alignFails.Count -eq 0){"kein Stream ohne sichtbares Detail (Stichprobe 10)"}else{"Leak: $($alignFails -join ',')"}) "Streams nie ohne Detail" ($alignFails.Count -eq 0)

# T10: publish_feed=false - cannot verify without service role; probe via detail null + known id from feed toggle impossible
Add-Result "T10" "publish_feed=false Trennung Speicherung/Sichtbarkeit" "Nicht direkt prüfbar ohne service_role (kein SELECT auf activity_streams/members)" "Manuell: publish_feed=false setzen, RPC null, Row bleibt" "manuell offen"

# T11: non-rad - hard without service role
Add-Result "T11" "Nicht-Rad ohne Stream-RPC" "Nicht direkt prüfbar ohne service_role" "Design: Sync skip für other" "manuell offen"

$results | Format-Table -AutoSize
Write-Output "---JSON---"
$results | ConvertTo-Json -Depth 4
Write-Output "---SAMPLE_STREAMS---"
if ($withStreams.Count -gt 0) {
  $withStreams | Select-Object -First 5 | ConvertTo-Json -Depth 3
}
