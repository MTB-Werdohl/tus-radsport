param(
  [Parameter(Mandatory = $true)]
  [string]$InternalSecret,

  [int]$BatchSize = 25,

  [int]$MaxRounds = 50,

  [int]$PauseSeconds = 45,

  [int]$MemberId = 0
)

$ErrorActionPreference = "Stop"

$URL = "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync"

function Invoke-StreamsBackfill {
  param(
    [bool]$DryRun,
    [int]$Limit,
    [int]$Member
  )

  $body = @{
    mode    = "streams_backfill"
    limit   = $Limit
    dry_run = $DryRun
  }

  if ($Member -gt 0) {
    $body.member_id = $Member
  }

  $json = $body | ConvertTo-Json -Compress

  return Invoke-RestMethod `
    -Uri $URL `
    -Method Post `
    -Headers @{
      "X-Strava-Internal-Secret" = $InternalSecret
      "Content-Type"             = "application/json"
    } `
    -Body $json
}

Write-Host "=== Stream-Backfill (Dry-Run) ==="
$dry = Invoke-StreamsBackfill -DryRun $true -Limit $BatchSize -Member $MemberId
$dry | ConvertTo-Json -Depth 4

if ($dry.pending -le 0) {
  Write-Host "Keine fehlenden Streams. Fertig."
  exit 0
}

Write-Host ""
Write-Host "=== Starte Backfill in Batches ($BatchSize) ==="

for ($round = 1; $round -le $MaxRounds; $round += 1) {

  Write-Host "Runde $round / $MaxRounds ..."

  $started = Invoke-StreamsBackfill `
    -DryRun $false `
    -Limit $BatchSize `
    -Member $MemberId

  $started | ConvertTo-Json -Depth 4

  Write-Host "Warte ${PauseSeconds}s (Strava Rate Limits + Edge Job) ..."
  Start-Sleep -Seconds $PauseSeconds

  $check = Invoke-StreamsBackfill `
    -DryRun $true `
    -Limit $BatchSize `
    -Member $MemberId

  Write-Host "Verbleibend (Stichprobe batch): $($check.pending)"

  if ($check.pending -le 0) {
    Write-Host "Backfill abgeschlossen."
    break
  }

}

Write-Host ""
Write-Host "=== Verifikation (verify-b2-streams.ps1) ==="
& "$PSScriptRoot/verify-b2-streams.ps1"
