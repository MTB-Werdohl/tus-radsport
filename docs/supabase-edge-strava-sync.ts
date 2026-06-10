// @ts-nocheck
// ============================================================================
// NICHT im SQL Editor ausführen — TypeScript für Edge Function!
//
// Deploy:
//   Supabase Dashboard → Edge Functions → strava-sync
//   Slug exakt: strava-sync
//   Verify JWT = AUS
//
// Setup: docs/supabase-strava-sync-setup.md
// ============================================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const DEFAULT_SYNC_DAYS = 400;
const DEFAULT_RECONCILE_DAYS = 30;
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

function getReconcileDays() {

  const raw =
    Number(Deno.env.get('STRAVA_RECONCILE_DAYS'));

  if (
    Number.isFinite(raw)
    && raw > 0
    && raw <= 365
  ) {
    return Math.floor(raw);
  }

  return DEFAULT_RECONCILE_DAYS;

}

function getInternalSecret() {

  return (
    Deno.env.get('STRAVA_INTERNAL_SECRET')
    || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || ''
  ).trim();

}

function getCronSecret() {

  return (
    Deno.env.get('STRAVA_CRON_SECRET')
    || ''
  ).trim();

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

const RAD_SPORT_CATEGORIES = new Set([
  'ride',
  'mountainbikeride',
  'gravelride',
  'ebikeride',
  'emountainbikeride',
  'virtualride',
  'handcycle',
  'velomobile'
]);

function normalizeStravaType(type) {

  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

}

function mapStravaTypeToCategory(type) {

  const normalized =
    normalizeStravaType(type);

  return RAD_SPORT_CATEGORIES.has(normalized)
    ? 'rad'
    : 'other';

}

function mapStravaActivityRow(
  activity,
  memberId
) {

  const photoUrl =
    activity?.photos?.primary?.urls?.['600']
    || activity?.photos?.primary?.url
    || null;

  const activityType =
    String(
      activity.sport_type
      || activity.type
      || 'Workout'
    );

  return {
    strava_activity_id: Number(activity.id),
    member_id: memberId,
    activity_type: activityType,
    sport_category:
      mapStravaTypeToCategory(activityType),
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

async function upsertActivityRows(
  supabaseAdmin,
  rows
) {

  const batchSize = 50;

  for (
    let index = 0;
    index < rows.length;
    index += batchSize
  ) {

    const batch =
      rows.slice(index, index + batchSize);

    const { error } =
      await supabaseAdmin
        .from('activities')
        .upsert(
          batch,
          { onConflict: 'strava_activity_id' }
        );

    if (error) {
      throw error;
    }

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
  syncDays,
  mode
) {

  const windowStart =
    Math.floor(
      (Date.now()
        - (syncDays * 24 * 60 * 60 * 1000))
      / 1000
    );

  if (
    mode === 'reconcile'
    || mode === 'initial'
    || !connection?.last_sync_at
  ) {
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

async function countImportedActivities(
  supabaseAdmin,
  memberId
) {

  const { count, error } =
    await supabaseAdmin
      .from('activities')
      .select('*', {
        count: 'exact',
        head: true
      })
      .eq('member_id', memberId)
      .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return count || 0;

}

async function setSyncStatus(
  supabaseAdmin,
  memberId,
  status,
  errorMessage
) {

  const { error } =
    await supabaseAdmin
      .from('strava_connections')
      .update({
        sync_status: status,
        sync_error_message: errorMessage || null,
        updated_at: new Date().toISOString()
      })
      .eq('member_id', memberId);

  if (error) {
    throw error;
  }

}

async function completeSyncSuccess(
  supabaseAdmin,
  memberId,
  mode
) {

  const activityCount =
    await countImportedActivities(
      supabaseAdmin,
      memberId
    );

  const nowIso =
    new Date().toISOString();

  const update = {
    sync_status: 'active',
    sync_error_message: null,
    imported_activity_count: activityCount,
    last_sync_at: nowIso,
    updated_at: nowIso
  };

  if (mode === 'initial' || mode === 'retry') {
    update.initial_sync_completed_at = nowIso;
  }

  const { error } =
    await supabaseAdmin
      .from('strava_connections')
      .update(update)
      .eq('member_id', memberId);

  if (error) {
    throw error;
  }

  return {
    imported: activityCount,
    last_sync_at: nowIso
  };

}

async function runMemberSyncJob(
  memberId,
  mode
) {

  const supabaseAdmin =
    getServiceClient();

  try {

    await setSyncStatus(
      supabaseAdmin,
      memberId,
      'syncing',
      null
    );

    const connection =
      await getConnectionByMemberId(
        supabaseAdmin,
        memberId
      );

    if (!connection) {
      throw new Error(
        'Strava-Verbindung nicht gefunden.'
      );
    }

    await syncMemberActivities(
      supabaseAdmin,
      memberId,
      connection,
      mode
    );

    return await completeSyncSuccess(
      supabaseAdmin,
      memberId,
      mode
    );

  } catch (error) {

    console.error(
      `Sync failed (${mode}) for member ${memberId}:`,
      error
    );

    await setSyncStatus(
      supabaseAdmin,
      memberId,
      'error',
      error?.message
      || 'Synchronisation fehlgeschlagen.'
    );

    throw error;

  }

}

async function syncMemberActivities(
  supabaseAdmin,
  memberId,
  connection,
  mode = 'initial'
) {

  const syncDays =
    mode === 'reconcile'
      ? getReconcileDays()
      : getSyncDays();

  const accessToken =
    await ensureValidAccessToken(
      supabaseAdmin,
      connection
    );

  const afterUnix =
    computeSyncAfterUnix(
      connection,
      syncDays,
      mode
    );

  const activities =
    await fetchStravaActivitiesSince(
      accessToken,
      afterUnix
    );

  let rows = [];

  for (const activity of activities) {

    rows.push(
      mapStravaActivityRow(
        activity,
        memberId
      )
    );

  }

  if (rows.length > 0) {

    await upsertActivityRows(
      supabaseAdmin,
      rows
    );

  }

  await rebuildStats(
    supabaseAdmin,
    memberId
  );

  return {
    imported: rows.length
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

    await completeSyncSuccess(
      supabaseAdmin,
      memberId,
      'reconcile'
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

  await upsertActivityRows(
    supabaseAdmin,
    [row]
  );

  await rebuildStats(
    supabaseAdmin,
    memberId
  );

  await completeSyncSuccess(
    supabaseAdmin,
    memberId,
    'reconcile'
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

    if (event?.owner_id) {

      try {

        const supabaseAdmin =
          getServiceClient();

        const connection =
          await getConnectionByAthleteId(
            supabaseAdmin,
            Number(event.owner_id)
          );

        if (connection?.member_id) {

          await setSyncStatus(
            supabaseAdmin,
            connection.member_id,
            'error',
            error?.message
            || 'Webhook-Synchronisation fehlgeschlagen.'
          );

        }

      } catch (statusError) {
        console.error(statusError);
      }

    }

  }

}

async function handleInternalSync(req) {

  const secret =
    req.headers.get('X-Strava-Internal-Secret')
    || '';

  const expected =
    getInternalSecret();

  if (
    !expected
    || secret !== expected
  ) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  let body = {};

  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const memberId =
    Number(body?.member_id);

  const mode =
    String(body?.mode || 'initial');

  if (
    !Number.isFinite(memberId)
    || memberId <= 0
  ) {
    return jsonResponse({ error: 'Invalid member_id' }, 400);
  }

  const waitUntil =
    globalThis.EdgeRuntime?.waitUntil
    || ((_promise) => {});

  waitUntil(
    runMemberSyncJob(memberId, mode)
  );

  return jsonResponse({
    ok: true,
    started: true
  });

}

async function handleNightlyReconcile(req) {

  const secret =
    req.headers.get('X-Strava-Cron-Secret')
    || '';

  const expected =
    getCronSecret();

  if (
    !expected
    || secret !== expected
  ) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const supabaseAdmin =
    getServiceClient();

  const { data: connections, error } =
    await supabaseAdmin
      .from('strava_connections')
      .select('member_id')
      .in('sync_status', ['active', 'error']);

  if (error) {
    return jsonResponse(
      { error: error.message },
      500
    );
  }

  const members =
    connections || [];

  const waitUntil =
    globalThis.EdgeRuntime?.waitUntil
    || ((_promise) => {});

  waitUntil(
    (async () => {

      for (const row of members) {

        try {
          await runMemberSyncJob(
            row.member_id,
            'reconcile'
          );
        } catch (_error) {
          // Fehler bereits in runMemberSyncJob protokolliert
        }

      }

    })()
  );

  return jsonResponse({
    ok: true,
    started: true,
    members: members.length
  });

}

async function handleUserRetrySync(req) {

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

  if (connection.sync_status === 'syncing') {
    return jsonResponse({
      ok: true,
      started: true,
      message: 'Synchronisation läuft bereits.'
    });
  }

  const waitUntil =
    globalThis.EdgeRuntime?.waitUntil
    || ((_promise) => {});

  waitUntil(
    runMemberSyncJob(
      member.id,
      'retry'
    )
  );

  return jsonResponse({
    ok: true,
    started: true,
    message:
      'Synchronisierung erneut gestartet.'
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

  const cronSecret =
    req.headers.get('X-Strava-Cron-Secret');

  if (cronSecret) {
    return handleNightlyReconcile(req);
  }

  const internalSecret =
    req.headers.get('X-Strava-Internal-Secret');

  if (internalSecret) {
    return handleInternalSync(req);
  }

  const authHeader =
    req.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return handleUserRetrySync(req);
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
