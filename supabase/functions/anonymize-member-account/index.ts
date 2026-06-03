import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS'
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

async function findAuthUserIdByEmail(
  supabaseAdmin,
  email
) {

  const normalized =
    email.trim().toLowerCase();

  let page = 1;

  while (page <= 20) {

    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200
      });

    if (error) {
      throw error;
    }

    const match =
      data.users.find(
        (user) =>
          user.email?.trim().toLowerCase()
          === normalized
      );

    if (match) {
      return match.id;
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;

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

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const memberId =
      body?.member_id ?? null;

    const rpcArgs =
      memberId === null
        || memberId === undefined
        ? {}
        : {
            p_member_id:
              Number(memberId)
          };

    const { data: rpcData, error: rpcError } =
      await supabaseAuth.rpc(
        'anonymize_member',
        rpcArgs
      );

    if (rpcError) {
      return jsonResponse(
        { error: rpcError.message },
        400
      );
    }

    if (!rpcData?.ok) {
      return jsonResponse(
        { error: 'Anonymisierung fehlgeschlagen.' },
        500
      );
    }

    if (rpcData.already_anonymized === true) {
      return jsonResponse({
        success: true,
        member_id: rpcData.member_id,
        already_anonymized: true
      });
    }

    let authUserId =
      user.id;

    if (
      memberId !== null
      && memberId !== undefined
    ) {

      const authEmail =
        rpcData.auth_email;

      if (authEmail) {

        authUserId =
          await findAuthUserIdByEmail(
            supabaseAdmin,
            authEmail
          );

      } else {

        authUserId = null;

      }

    }

    if (authUserId) {

      const { error: signOutError } =
        await supabaseAdmin.auth.admin.signOut(
          authUserId,
          'global'
        );

      if (signOutError) {

        console.error(signOutError);

      }

      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(
          authUserId
        );

      if (deleteError) {

        console.error(deleteError);

        return jsonResponse(
          {
            error:
              'Daten anonymisiert, Auth-Konto konnte nicht entfernt werden.'
          },
          500
        );

      }

    }

    return jsonResponse({
      success: true,
      member_id: rpcData.member_id,
      already_anonymized:
        rpcData.already_anonymized === true
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
