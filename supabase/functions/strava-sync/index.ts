// @ts-nocheck
// Slug exakt: strava-sync — Verify JWT = AUS
// Dashboard: gesamten Inhalt einfügen (docs/supabase-edge-strava-sync.ts)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const DEFAULT_SYNC_DAYS = 400;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MAX_ACTIVITY_PAGES = 10;
const ACTIVITIES_PER_PAGE = 200;

function jsonResponse(
  body,
  status = 200
) {

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );

}

function getSyncDays() {

  const raw =
    Number(Deno.env.get('STRAVA_SYNC_DAYS'));

  if (
    Number.isFinite(raw)
    && raw > 0
    && raw <= 3650
  ) {
    return Math.floor(raw);
  }

  return DEFAULT_SYNC_DAYS;

}

function getWebhookVerifyToken() {

  return (
    Deno.env.get('STRAVA_WEBHOOK_VERIFY_TOKEN')
    || ''
  ).trim();

}

function getServiceClient() {

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? '';

  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  return createClient(
    supabaseUrl,
    serviceRoleKey
  );

}

function isTokenExpired(expiresAt) {

  if (!expiresAt) {
    return true;
  }

  const expiresMs =
    new Date(expiresAt).getTime();

  if (!Number.isFinite(expiresMs)) {
    return true;
  }

  return (
    Date.now()
    >= (expiresMs - TOKEN_REFRESH_BUFFER_MS)
  );

}

async function refreshStravaToken(
  supabaseAdmin,
  connection
) {

  const clientId =
    Deno.env.get('STRAVA_CLIENT_ID') || '';

  const clientSecret =
    Deno.env.get('STRAVA_CLIENT_SECRET') || '';

  const response =
    await fetch(
      'https://www.strava.com/api/v3/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token
        })
      }
    );

  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.message
      || 'Strava-Token konnte nicht erneuert werden.'
    );
  }

  const accessToken =
    String(payload?.access_token || '');

  const refreshToken =
    String(
      payload?.refresh_token
      || connection.refresh_token
    );

  const expiresAt =
    Number(payload?.expires_at || 0);

  const tokenExpiresAt =
    expiresAt > 0
      ? new Date(expiresAt * 1000).toISOString()
      : null;

  const nowIso =
    new Date().toISOString();

  const { error } =
    await supabaseAdmin
      .from('strava_connections')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        updated_at: nowIso
      })
      .eq('member_id', connection.member_id);

  if (error) {
    throw error;
  }

  return {
    ...connection,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt
  };

}

async function ensureValidAccessToken(
  supabaseAdmin,
  connection
) {

  if (
    !isTokenExpired(connection.token_expires_at)
  ) {
    return connection.access_token;
  }

  const refreshed =
    await refreshStravaToken(
      supabaseAdmin,
      connection
    );

  return refreshed.access_token;

}

function mapStravaActivityRow(
  activity,
  memberId
) {

  const photoUrl =
    activity?.photos?.primary?.urls?.['600']
    || activity?.photos?.primary?.url
    || null;

  return {
    strava_activity_id: Number(activity.id),
    member_id: memberId,
    activity_type:
      String(
        activity.type
        || activity.sport_type
        || 'Workout'
      ),
    activity_name:
      String(activity.name || ''),
    distance_m:
      Number(activity.distance || 0),
    moving_time_s:
      Number(activity.moving_time || 0),
    elevation_gain_m:
      Number(activity.total_elevation_gain || 0),
    start_date: activity.start_date,
    map_summary_polyline:
      activity?.map?.summary_polyline || null,
    activity_photo_url: photoUrl,
    deleted_at: null,
    updated_at: new Date().toISOString()
  };

}

async function upsertActivityRow(
  supabaseAdmin,
  row
) {

  const { error } =
    await supabaseAdmin
      .from('activities')
      .upsert(
        row,
        { onConflict: 'strava_activity_id' }
      );

  if (error) {
    throw error;
  }

}

async function softDeleteActivity(
  supabaseAdmin,
  stravaActivityId
) {

  const { error } =
    await supabaseAdmin
      .from('activities')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq(
        'strava_activity_id',
        stravaActivityId
      )
      .is('deleted_at', null);

  if (error) {
    throw error;
  }

}

async function rebuildStats(
  supabaseAdmin,
  memberId
) {

  const { error: memberError } =
    await supabaseAdmin.rpc(
      'rebuild_member_stats',
      { p_member_id: memberId }
    );

  if (memberError) {
    throw memberError;
  }

  const { error: clubError } =
    await supabaseAdmin.rpc(
      'refresh_club_stats'
    );

  if (clubError) {
    throw clubError;
  }

}

async function updateLastSyncAt(
  supabaseAdmin,
  memberId
) {

  const nowIso =
    new Date().toISOString();

  const { error } =
    await supabaseAdmin
      .from('strava_connections')
      .update({
        last_sync_at: nowIso,
        updated_at: nowIso
      })
      .eq('member_id', memberId);

  if (error) {
    throw error;
  }

  return nowIso;

}

async function fetchStravaActivitiesSince(
  accessToken,
  afterUnix
) {

  const activities = [];
  let page = 1;

  while (page <= MAX_ACTIVITY_PAGES) {

    const url =
      new URL(
        'https://www.strava.com/api/v3/athlete/activities'
      );

    url.searchParams.set(
      'after',
      String(afterUnix)
    );

    url.searchParams.set(
      'per_page',
      String(ACTIVITIES_PER_PAGE)
    );

    url.searchParams.set(
      'page',
      String(page)
    );

    const response =
      await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

    const payload =
      await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.message
        || `Strava-Aktivitäten (${response.status})`
      );
    }

    if (
      !Array.isArray(payload)
      || payload.length === 0
    ) {
      break;
    }

    activities.push(...payload);

    if (payload.length < ACTIVITIES_PER_PAGE) {
      break;
    }

    page += 1;

  }

  return activities;

}

async function fetchStravaActivity(
  accessToken,
  activityId
) {

  const response =
    await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.message
      || `Strava-Aktivität (${response.status})`
    );
  }

  return payload;

}

async function getConnectionByMemberId(
  supabaseAdmin,
  memberId
) {

  const { data, error } =
    await supabaseAdmin
      .from('strava_connections')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;

}

async function getConnectionByAthleteId(
  supabaseAdmin,
  athleteId
) {

  const { data, error } =
    await supabaseAdmin
      .from('strava_connections')
      .select('*')
      .eq('strava_athlete_id', athleteId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;

}

function computeSyncAfterUnix(
  connection,
  syncDays
) {

  const windowStart =
    Math.floor(
      (Date.now()
        - (syncDays * 24 * 60 * 60 * 1000))
      / 1000
    );

  if (!connection?.last_sync_at) {
    return windowStart;
  }

  const lastSyncUnix =
    Math.floor(
      new Date(connection.last_sync_at).getTime()
      / 1000
    ) - (2 * 24 * 60 * 60);

  return Math.max(
    windowStart,
    lastSyncUnix
  );

}

async function syncMemberActivities(
  supabaseAdmin,
  memberId,
  connection
) {

  const syncDays = getSyncDays();

  const accessToken =
    await ensureValidAccessToken(
      supabaseAdmin,
      connection
    );

  const afterUnix =
    computeSyncAfterUnix(
      connection,
      syncDays
    );

  const activities =
    await fetchStravaActivitiesSince(
      accessToken,
      afterUnix
    );

  let imported = 0;

  for (const activity of activities) {

    const row =
      mapStravaActivityRow(
        activity,
        memberId
      );

    await upsertActivityRow(
      supabaseAdmin,
      row
    );

    imported += 1;

  }

  await rebuildStats(
    supabaseAdmin,
    memberId
  );

  const lastSyncAt =
    await updateLastSyncAt(
      supabaseAdmin,
      memberId
    );

  return {
    imported,
    last_sync_at: lastSyncAt
  };

}

async function syncSingleActivity(
  supabaseAdmin,
  connection,
  activityId,
  aspectType
) {

  const memberId =
    connection.member_id;

  if (aspectType === 'delete') {

    await softDeleteActivity(
      supabaseAdmin,
      activityId
    );

    await rebuildStats(
      supabaseAdmin,
      memberId
    );

    await updateLastSyncAt(
      supabaseAdmin,
      memberId
    );

    return;

  }

  const accessToken =
    await ensureValidAccessToken(
      supabaseAdmin,
      connection
    );

  const activity =
    await fetchStravaActivity(
      accessToken,
      activityId
    );

  const row =
    mapStravaActivityRow(
      activity,
      memberId
    );

  await upsertActivityRow(
    supabaseAdmin,
    row
  );

  await rebuildStats(
    supabaseAdmin,
    memberId
  );

  await updateLastSyncAt(
    supabaseAdmin,
    memberId
  );

}

async function assertClubMemberId(
  supabaseAdmin,
  email
) {

  const normalized =
    email.trim().toLowerCase();

  const trimmed =
    email.trim();

  let data = null;
  let error = null;

  ({ data, error } =
    await supabaseAdmin
      .from('members')
      .select('id, rolle, strava_sync_enabled')
      .eq('email', normalized)
      .is('anonymized_at', null)
      .maybeSingle());

  if (!data && !error) {

    ({ data, error } =
      await supabaseAdmin
        .from('members')
        .select('id, rolle, strava_sync_enabled')
        .eq('email', trimmed)
        .is('anonymized_at', null)
        .maybeSingle());

  }

  if (!data && !error) {

    ({ data, error } =
      await supabaseAdmin
        .from('members')
        .select('id, rolle, strava_sync_enabled')
        .filter('email', 'ilike', trimmed)
        .is('anonymized_at', null)
        .maybeSingle());

  }

  if (error) {
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  const role =
    String(data.rolle || '')
      .trim()
      .toLowerCase();

  if (
    role !== 'mitglied'
    && role !== 'vorstand'
  ) {
    return null;
  }

  return data;

}

function handleWebhookValidation(req) {

  const url = new URL(req.url);

  const mode =
    url.searchParams.get('hub.mode');

  const token =
    url.searchParams.get('hub.verify_token');

  const challenge =
    url.searchParams.get('hub.challenge');

  const expected =
    getWebhookVerifyToken();

  if (
    mode !== 'subscribe'
    || !challenge
    || !expected
    || token !== expected
  ) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  return jsonResponse({
    'hub.challenge': challenge
  });

}

async function handleWebhookEvent(event) {

  try {

    if (
      event?.object_type !== 'activity'
    ) {
      return;
    }

    const athleteId =
      Number(event?.owner_id);

    const activityId =
      Number(event?.object_id);

    const aspectType =
      String(event?.aspect_type || '')
        .toLowerCase();

    if (
      !athleteId
      || !activityId
      || !aspectType
    ) {
      return;
    }

    const supabaseAdmin =
      getServiceClient();

    const connection =
      await getConnectionByAthleteId(
        supabaseAdmin,
        athleteId
      );

    if (!connection?.member_id) {
      return;
    }

    await syncSingleActivity(
      supabaseAdmin,
      connection,
      activityId,
      aspectType
    );

  } catch (error) {
    console.error('Webhook sync failed:', error);
  }

}

async function handleManualSync(req) {

  const authHeader =
    req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const clientId =
    Deno.env.get('STRAVA_CLIENT_ID') || '';

  const clientSecret =
    Deno.env.get('STRAVA_CLIENT_SECRET') || '';

  if (!clientId || !clientSecret) {
    return jsonResponse({
      ok: false,
      message:
        'Strava ist noch nicht konfiguriert (STRAVA_CLIENT_ID/SECRET).'
    }, 503);
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ?? '';

  const supabaseAnonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const supabaseAuth =
    createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

  const supabaseAdmin =
    getServiceClient();

  const token =
    authHeader.replace('Bearer ', '');

  const { data: authData, error: authError } =
    await supabaseAuth.auth.getUser(token);

  if (
    authError
    || !authData?.user?.email
  ) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const member =
    await assertClubMemberId(
      supabaseAdmin,
      authData.user.email
    );

  if (!member?.id) {
    return jsonResponse({
      ok: false,
      message:
        'Nur Vereinsmitglieder können Strava synchronisieren.'
    }, 403);
  }

  if (member.strava_sync_enabled !== true) {
    return jsonResponse({
      ok: false,
      message:
        'Strava-Synchronisation ist deaktiviert. Bitte erneut verbinden.'
    }, 400);
  }

  const connection =
    await getConnectionByMemberId(
      supabaseAdmin,
      member.id
    );

  if (!connection) {
    return jsonResponse({
      ok: false,
      message: 'Bitte zuerst Strava verbinden.'
    }, 400);
  }

  const result =
    await syncMemberActivities(
      supabaseAdmin,
      member.id,
      connection
    );

  const count =
    result.imported;

  const message =
    count === 0
      ? 'Keine neuen Aktivitäten im Sync-Zeitraum.'
      : (
        count === 1
          ? '1 Aktivität synchronisiert.'
          : `${count} Aktivitäten synchronisiert.`
      );

  return jsonResponse({
    ok: true,
    message,
    imported: count,
    last_sync_at: result.last_sync_at
  });

}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return handleWebhookValidation(req);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader =
    req.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return handleManualSync(req);
  }

  let event = {};

  try {
    event = await req.json();
  } catch (_error) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const waitUntil =
    globalThis.EdgeRuntime?.waitUntil
    || ((_promise) => {});

  waitUntil(
    handleWebhookEvent(event)
  );

  return jsonResponse({ ok: true });

});
