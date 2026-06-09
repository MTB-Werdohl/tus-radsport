// @ts-nocheck
// ============================================================================
// NICHT im SQL Editor ausführen — TypeScript für Edge Function!
//
// Deploy:
//   Supabase Dashboard → Edge Functions → Create function
//   Slug exakt: strava-oauth-callback  (URL-Pfad, siehe site-config.js)
//   Code: gesamten Inhalt dieser Datei einfügen → Deploy
//
// WICHTIG (Browser/CORS): Verify JWT = AUS
//   Strava leitet den Browser per GET hierher (kein JWT im Redirect).
//
// Setup: docs/supabase-strava-setup.md
// ============================================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function getSiteUrl() {

  return (
    Deno.env.get('SITE_URL')
    || 'https://www.mtb-werdohl.de'
  ).replace(/\/$/, '');

}

function redirectToProfile(params) {

  const search =
    new URLSearchParams(params);

  const siteUrl = getSiteUrl();

  return Response.redirect(
    `${siteUrl}/profil/?${search.toString()}`,
    302
  );

}

function base64UrlEncode(bytes) {

  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

}

function getStateSecret() {

  return (
    Deno.env.get('STRAVA_OAUTH_STATE_SECRET')
    || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || ''
  );

}

async function signBytes(message) {

  const secret = getStateSecret();

  if (!secret) {
    throw new Error('Missing OAuth state secret.');
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  return base64UrlEncode(
    new Uint8Array(signature)
  );

}

async function verifyOAuthState(state) {

  const parts = state.split('.');

  if (parts.length !== 2) {
    return null;
  }

  const payloadPart = parts[0];
  const signaturePart = parts[1];

  const expected =
    await signBytes(payloadPart);

  if (expected !== signaturePart) {
    return null;
  }

  let payload;

  try {
    payload = JSON.parse(atob(payloadPart));
  } catch (_error) {
    return null;
  }

  if (
    !payload?.mid
    || !payload?.exp
    || payload.exp < Date.now()
  ) {
    return null;
  }

  return payload.mid;

}

async function exchangeStravaCode(code) {

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
          code,
          grant_type: 'authorization_code'
        })
      }
    );

  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.message
      || 'Strava-Token-Austausch fehlgeschlagen.'
    );
  }

  return payload;

}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return redirectToProfile({
      strava: 'error',
      reason: 'method'
    });
  }

  try {

    const url = new URL(req.url);

    const oauthError =
      url.searchParams.get('error');

    if (oauthError) {
      return redirectToProfile({
        strava: 'error',
        reason: oauthError
      });
    }

    const code =
      url.searchParams.get('code');

    const state =
      url.searchParams.get('state');

    if (!code || !state) {
      return redirectToProfile({
        strava: 'error',
        reason: 'missing_code'
      });
    }

    const memberId =
      await verifyOAuthState(state);

    if (!memberId) {
      return redirectToProfile({
        strava: 'error',
        reason: 'invalid_state'
      });
    }

    const tokenPayload =
      await exchangeStravaCode(code);

    const athleteId =
      Number(tokenPayload?.athlete?.id);

    const accessToken =
      String(tokenPayload?.access_token || '');

    const refreshToken =
      String(tokenPayload?.refresh_token || '');

    const expiresAt =
      Number(tokenPayload?.expires_at || 0);

    if (
      !athleteId
      || !accessToken
      || !refreshToken
    ) {
      return redirectToProfile({
        strava: 'error',
        reason: 'token_payload'
      });
    }

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') ?? '';

    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    const { data: existingAthlete } =
      await supabaseAdmin
        .from('strava_connections')
        .select('member_id')
        .eq('strava_athlete_id', athleteId)
        .maybeSingle();

    if (
      existingAthlete?.member_id
      && existingAthlete.member_id !== memberId
    ) {
      return redirectToProfile({
        strava: 'error',
        reason: 'athlete_linked'
      });
    }

    const tokenExpiresAt =
      expiresAt > 0
        ? new Date(expiresAt * 1000).toISOString()
        : null;

    const nowIso =
      new Date().toISOString();

    const { error: connectionError } =
      await supabaseAdmin
        .from('strava_connections')
        .upsert({
          member_id: memberId,
          strava_athlete_id: athleteId,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          updated_at: nowIso
        });

    if (connectionError) {
      throw connectionError;
    }

    const { error: memberError } =
      await supabaseAdmin
        .from('members')
        .update({
          strava_connected_at: nowIso,
          strava_sync_enabled: true
        })
        .eq('id', memberId);

    if (memberError) {
      throw memberError;
    }

    return redirectToProfile({
      strava: 'connected'
    });

  } catch (error) {

    console.error(error);

    return redirectToProfile({
      strava: 'error',
      reason: 'server'
    });

  }

});
