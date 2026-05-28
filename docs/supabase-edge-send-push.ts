// @ts-nocheck
// Edge Function: send-push
// Deploy: Supabase Dashboard → Edge Functions → send-push
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//      VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
//
// Nur eingeloggte Vorstände dürfen Push an alle Abonnenten senden.
// Deno Edge Function — LSP: docs/deno.json + Deno für docs/ in .vscode/settings.json

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type'
};

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

webpush.setVapidDetails(
  'mailto:info@mtb-werdohl.de',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
);

async function requireVorstand(req) {

  const authHeader =
    req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: jsonResponse({ error: 'Unauthorized' }, 401)
    };
  }

  const token =
    authHeader.replace('Bearer ', '');

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

  const {

    data: { user },
    error: userError

  } =
    await supabaseAuth.auth.getUser(token);

  if (userError || !user?.email) {
    return {
      error: jsonResponse({ error: 'Unauthorized' }, 401)
    };
  }

  const email =
    user.email.trim();

  const { data: memberRows, error: memberError } =
    await supabaseAdmin
      .from('members')
      .select('id, email, rolle')
      .filter('email', 'ilike', email)
      .limit(1);

  if (memberError) {
    throw memberError;
  }

  const member =
    memberRows?.[0] ?? null;

  if (
    !member
    || member.rolle?.trim().toLowerCase() !== 'vorstand'
  ) {
    return {
      error: jsonResponse({ error: 'Forbidden' }, 403)
    };
  }

  return { supabaseAdmin };

}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {

    const authResult =
      await requireVorstand(req);

    if (authResult.error) {
      return authResult.error;
    }

    const supabaseAdmin =
      authResult.supabaseAdmin;

    const body =
      await req.json();

    const title =
      String(body?.title ?? '').trim();

    const pushBody =
      String(body?.body ?? '').trim();

    const url =
      String(body?.url ?? '/').trim() || '/';

    if (!title || !pushBody) {
      return jsonResponse(
        { error: 'title and body required' },
        400
      );
    }

    const { data: subscriptions, error } =
      await supabaseAdmin
        .from('PushSubscriptions')
        .select('endpoint, p256dh, auth, active');

    if (error) {
      throw error;
    }

    const payload =
      JSON.stringify({
        title,
        body: pushBody,
        url
      });

    let sent = 0;

    for (const subscription of subscriptions ?? []) {

      if (
        subscription.active
        && subscription.active !== 'true'
      ) {
        continue;
      }

      if (
        !subscription.endpoint
        || !subscription.p256dh
        || !subscription.auth
      ) {
        continue;
      }

      try {

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload,
          {
            TTL: 60,
            urgency: 'high'
          }
        );

        sent += 1;

      } catch (pushError) {

        console.error(pushError);

        const statusCode =
          pushError?.statusCode;

        if (
          statusCode === 404
          || statusCode === 410
        ) {

          await supabaseAdmin
            .from('PushSubscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);

        }

      }

    }

    const sentAt =
      new Date().toISOString();

    const pushRecord = {
      title,
      body: pushBody,
      url,
      sent_at: sentAt
    };

    const { error: historyError } =
      await supabaseAdmin
        .from('PushMessages')
        .insert([pushRecord]);

    if (historyError) {
      console.error(historyError);
    }

    const { error: stateError } =
      await supabaseAdmin
        .from('site_state')
        .upsert(
          {
            key: 'last_push',
            value: pushRecord
          },
          { onConflict: 'key' }
        );

    if (stateError) {
      console.error(stateError);
    }

    return jsonResponse({
      success: true,
      sent,
      historySaved: !historyError,
      historyError:
        historyError?.message ?? null
    });

  } catch (error) {

    console.error(error);

    return jsonResponse(
      {
        error:
          error?.message
          || 'Internal server error'
      },
      500
    );

  }

});
