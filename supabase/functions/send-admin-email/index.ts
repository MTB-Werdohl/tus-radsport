// @ts-nocheck
// Slug exakt: send-admin-email — Verify JWT = AUS
// Dashboard: gesamten Inhalt einfügen (docs/supabase-edge-send-admin-email.ts)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const EMAIL_FROM =
  Deno.env.get('EMAIL_FROM')
  || 'info@mtb-werdohl.de';

const EMAIL_FROM_NAME =
  Deno.env.get('EMAIL_FROM_NAME')
  || 'MTB Werdohl';

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

function escapeHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatMemberName(member) {

  const name =
    [
      member?.vorname,
      member?.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  return name || member?.email || 'Mitglied';

}

function isEligibleMember(member) {

  if (!member) {
    return false;
  }

  if (member.anonymized_at) {
    return false;
  }

  if (member.einwilligung_kontakt !== true) {
    return false;
  }

  const email =
    String(member.email || '')
      .trim()
      .toLowerCase();

  if (!email || !email.includes('@')) {
    return false;
  }

  return true;

}

function isRegisteredEventAnswer(
  moduleType,
  answer
) {

  const value =
    String(answer || '')
      .trim()
      .toLowerCase();

  if (moduleType === 'yes_maybe') {
    return (
      value === 'yes'
      || value === 'maybe'
    );
  }

  if (moduleType === 'yes_no_comment') {
    return value === 'yes';
  }

  if (moduleType === 'poll') {
    return !!value;
  }

  return false;

}

function dedupeRecipients(recipients) {

  const seen =
    new Set();

  return recipients.filter((recipient) => {

    const key =
      recipient.email.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;

  });

}

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

  const { data: member, error: memberError } =
    await supabaseAuth
      .from('members')
      .select('id, rolle, email')
      .eq(
        'email',
        user.email.trim().toLowerCase()
      )
      .maybeSingle();

  if (
    memberError
    || !member
    || String(member.rolle || '')
      .trim() !== 'Vorstand'
  ) {
    return {
      error: jsonResponse({ error: 'Forbidden' }, 403)
    };
  }

  return {
    supabaseAdmin,
    senderMemberId: member.id
  };

}

async function resolveRecipients(
  supabaseAdmin,
  mode,
  memberId,
  eventId
) {

  if (mode === 'single') {

    const id =
      Number(memberId);

    if (!Number.isFinite(id) || id <= 0) {
      return {
        error: 'Ungültiges Mitglied.'
      };
    }

    const { data, error } =
      await supabaseAdmin
        .from('members')
        .select(
          'id, vorname, nachname, email, einwilligung_kontakt, anonymized_at'
        )
        .eq('id', id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        error: 'Mitglied nicht gefunden.'
      };
    }

    if (!isEligibleMember(data)) {
      return {
        error:
          'Mitglied hat keine Kontakt-Einwilligung oder keine E-Mail.'
      };
    }

    return {
      recipients: [{
        member_id: data.id,
        email: data.email.trim(),
        name: formatMemberName(data)
      }]
    };

  }

  if (mode === 'all') {

    const { data, error } =
      await supabaseAdmin
        .from('members')
        .select(
          'id, vorname, nachname, email, einwilligung_kontakt, anonymized_at'
        )
        .eq('einwilligung_kontakt', true)
        .not('email', 'is', null);

    if (error) {
      throw error;
    }

    const recipients =
      dedupeRecipients(
        (data || [])
          .filter(isEligibleMember)
          .map((member) => ({
            member_id: member.id,
            email: member.email.trim(),
            name: formatMemberName(member)
          }))
      );

    if (recipients.length === 0) {
      return {
        error:
          'Keine Empfänger mit Kontakt-Einwilligung gefunden.'
      };
    }

    return { recipients };

  }

  if (mode === 'event') {

    const id =
      Number(eventId);

    if (!Number.isFinite(id) || id <= 0) {
      return {
        error: 'Ungültiger Termin.'
      };
    }

    const { data: module, error: moduleError } =
      await supabaseAdmin
        .from('feedback_modules')
        .select('id, type, entity_id')
        .eq('entity_type', 'event')
        .eq('entity_id', id)
        .maybeSingle();

    if (moduleError) {
      throw moduleError;
    }

    if (!module) {
      return {
        error:
          'Für diesen Termin gibt es keine Anmeldung/Abstimmung.'
      };
    }

    const { data: answers, error: answersError } =
      await supabaseAdmin
        .from('feedback_answers')
        .select(`
          answer,
          member_id,
          members (
            id,
            vorname,
            nachname,
            email,
            einwilligung_kontakt,
            anonymized_at
          )
        `)
        .eq('module_id', module.id);

    if (answersError) {
      throw answersError;
    }

    const recipients =
      dedupeRecipients(
        (answers || [])
          .filter((row) =>
            isRegisteredEventAnswer(
              module.type,
              row.answer
            )
          )
          .map((row) => row.members)
          .filter(isEligibleMember)
          .map((member) => ({
            member_id: member.id,
            email: member.email.trim(),
            name: formatMemberName(member)
          }))
      );

    if (recipients.length === 0) {
      return {
        error:
          'Keine angemeldeten Teilnehmer mit Kontakt-Einwilligung.'
      };
    }

    return { recipients };

  }

  return {
    error: 'Ungültiger Empfängermodus.'
  };

}

function buildEmailHtml(
  name,
  bodyText
) {

  const bodyHtml =
    escapeHtml(bodyText)
      .replace(/\r\n/g, '\n')
      .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
<p>Hallo ${escapeHtml(name)},</p>
<div>${bodyHtml}</div>
<p style="margin-top: 24px;">— ${escapeHtml(EMAIL_FROM_NAME)}</p>
</body>
</html>`;

}

async function createMailTransport() {

  const smtpHost =
    Deno.env.get('SMTP_HOST')?.trim();

  if (smtpHost) {

    const port =
      Number(
        Deno.env.get('SMTP_PORT') || '587'
      );

    return {
      type: 'smtp',
      transport: nodemailer.createTransport({
        host: smtpHost,
        port,
        secure:
          Deno.env.get('SMTP_SECURE') === 'true'
          || port === 465,
        auth: {
          user: Deno.env.get('SMTP_USER') ?? '',
          pass: Deno.env.get('SMTP_PASS') ?? ''
        }
      })
    };

  }

  const resendKey =
    Deno.env.get('RESEND_API_KEY')?.trim();

  if (resendKey) {
    return { type: 'resend', apiKey: resendKey };
  }

  return null;

}

async function sendOneEmail(
  mailer,
  recipient,
  subject,
  bodyText
) {

  const html =
    buildEmailHtml(
      recipient.name,
      bodyText
    );

  if (mailer.type === 'smtp') {

    await mailer.transport.sendMail({
      from:
        `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: recipient.email,
      subject,
      text: bodyText,
      html
    });

    return;

  }

  const response =
    await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mailer.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from:
            `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
          to: [recipient.email],
          subject,
          text: bodyText,
          html
        })
      }
    );

  if (!response.ok) {

    const result =
      await response.json().catch(() => ({}));

    throw new Error(
      result?.message
      || `Resend-Fehler (${response.status})`
    );

  }

}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {

    const auth =
      await requireVorstand(req);

    if (auth.error) {
      return auth.error;
    }

    const mailer =
      await createMailTransport();

    if (!mailer) {
      return jsonResponse(
        {
          error:
            'E-Mail-Versand nicht konfiguriert (SMTP oder RESEND_API_KEY).'
        },
        500
      );
    }

    let payload = {};

    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const subject =
      String(payload.subject || '')
        .trim()
        .slice(0, 200);

    const bodyText =
      String(payload.body || '')
        .trim()
        .slice(0, 50000);

    const mode =
      String(payload.mode || '')
        .trim()
        .toLowerCase();

    if (!subject || !bodyText) {
      return jsonResponse(
        { error: 'Betreff und Nachricht sind erforderlich.' },
        400
      );
    }

    if (
      mode !== 'single'
      && mode !== 'event'
      && mode !== 'all'
    ) {
      return jsonResponse(
        { error: 'Ungültiger Empfängermodus.' },
        400
      );
    }

    const resolved =
      await resolveRecipients(
        auth.supabaseAdmin,
        mode,
        payload.member_id,
        payload.event_id
      );

    if (resolved.error) {
      return jsonResponse(
        { error: resolved.error },
        400
      );
    }

    const recipients =
      resolved.recipients;

    let sent = 0;
    const failures = [];

    for (const recipient of recipients) {

      try {

        await sendOneEmail(
          mailer,
          recipient,
          subject,
          bodyText
        );

        sent += 1;

      } catch (error) {

        console.error(error);

        failures.push({
          email: recipient.email,
          error:
            error?.message
            || 'Senden fehlgeschlagen'
        });

      }

    }

    if (sent === 0) {
      return jsonResponse(
        {
          error: 'Keine E-Mail konnte gesendet werden.',
          failures
        },
        500
      );
    }

    return jsonResponse({
      ok: true,
      sent,
      total: recipients.length,
      failures
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
