// @ts-nocheck
// Slug exakt: strava-oauth-start — Verify JWT = AUS
// Dashboard: gesamten Inhalt einfügen (docs/supabase-edge-strava-oauth-start.ts)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const STRAVA_SCOPES =
  'activity:read_all,profile:read_all';

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

function getCallbackUrl() {

  const supabaseUrl =
    (Deno.env.get('SUPABASE_URL') || '')
      .replace(/\/$/, '');

  return `${supabaseUrl}/functions/v1/strava-oauth-callback`;

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

async function createOAuthState(memberId) {

  const payload = {
    mid: memberId,
    exp: Date.now() + (15 * 60 * 1000)
  };

  const payloadPart =
    btoa(JSON.stringify(payload));

  const signature =
    await signBytes(payloadPart);

  return `${payloadPart}.${signature}`;

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
      .select('id, rolle')
      .eq('email', normalized)
      .is('anonymized_at', null)
      .maybeSingle());

  if (!data && !error) {

    ({ data, error } =
      await supabaseAdmin
        .from('members')
        .select('id, rolle')
        .eq('email', trimmed)
        .is('anonymized_at', null)
        .maybeSingle());

  }

  if (!data && !error) {

    ({ data, error } =
      await supabaseAdmin
        .from('members')
        .select('id, rolle')
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

  return data.id;

}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {

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
        error:
          'Strava ist noch nicht konfiguriert (STRAVA_CLIENT_ID/SECRET).'
      }, 503);
    }

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') ?? '';

    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

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

    const memberId =
      await assertClubMemberId(
        supabaseAdmin,
        authData.user.email
      );

    if (!memberId) {
      return jsonResponse({
        error: 'Nur Vereinsmitglieder können Strava verbinden.'
      }, 403);
    }

    const state =
      await createOAuthState(memberId);

    const redirectUri =
      getCallbackUrl();

    const authorizeUrl =
      new URL('https://www.strava.com/oauth/authorize');

    authorizeUrl.searchParams.set(
      'client_id',
      clientId
    );

    authorizeUrl.searchParams.set(
      'response_type',
      'code'
    );

    authorizeUrl.searchParams.set(
      'redirect_uri',
      redirectUri
    );

    authorizeUrl.searchParams.set(
      'approval_prompt',
      'auto'
    );

    authorizeUrl.searchParams.set(
      'scope',
      STRAVA_SCOPES
    );

    authorizeUrl.searchParams.set(
      'state',
      state
    );

    return jsonResponse({
      ok: true,
      url: authorizeUrl.toString()
    });

  } catch (error) {

    console.error(error);

    return jsonResponse({
      error:
        error?.message
        || 'Strava-Verbindung konnte nicht gestartet werden.'
    }, 500);

  }

});
