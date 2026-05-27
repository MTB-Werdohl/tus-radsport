// Edge Function: save-push-subscription
// Deploy in Supabase Dashboard → Edge Functions → save-push-subscription
//
// Env (automatisch gesetzt): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2';

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

function parseRequestBody(body) {

  if (body?.subscription?.endpoint) {

    return {
      subscription: body.subscription,
      member_id: body.member_id ?? null,
      device_name: body.device_name ?? null,
      user_agent: body.user_agent ?? null
    };

  }

  if (body?.endpoint && body?.keys) {

    return {
      subscription: body,
      member_id: body.member_id ?? null,
      device_name: body.device_name ?? null,
      user_agent: body.user_agent ?? null
    };

  }

  return null;

}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {

    const body = await req.json();
    const parsed = parseRequestBody(body);

    if (!parsed) {
      return jsonResponse({ error: 'Invalid subscription payload' }, 400);
    }

    const { subscription, member_id, device_name, user_agent } =
      parsed;

    const endpoint = subscription.endpoint;
    const keys = subscription.keys;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return jsonResponse({ error: 'Invalid subscription keys' }, 400);
    }

    const authHeader =
      req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
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
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const email =
      user.email.trim();

    const { data: memberRows, error: memberError } =
      await supabaseAdmin
        .from('members')
        .select('id, email')
        .filter('email', 'ilike', email)
        .limit(1);

    if (memberError) {
      throw memberError;
    }

    const member =
      memberRows?.[0] ?? null;

    if (!member) {
      return jsonResponse({ error: 'Member not found' }, 403);
    }

    if (
      member_id !== null
      && member_id !== undefined
      && member_id !== member.id
    ) {
      return jsonResponse({ error: 'Member mismatch' }, 403);
    }

    const resolvedMemberId =
      member_id ?? member.id;

    const { data, error } =
      await supabaseAdmin
        .from('PushSubscriptions')
        .upsert(
          {
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            active: 'true',
            member_id: resolvedMemberId,
            device_name: device_name ?? null,
            user_agent: user_agent ?? null
          },
          { onConflict: 'endpoint' }
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return jsonResponse({
      success: true,
      data
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
