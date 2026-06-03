let emailMembers = [];
let emailEvents = [];
let emailModulesByEventId = new Map();

function isEmailEligibleMember(member) {

  if (!member || member.anonymized_at) {
    return false;
  }

  if (member.einwilligung_kontakt !== true) {
    return false;
  }

  const email =
    String(member.email || '')
      .trim();

  return !!email && email.includes('@');

}

function formatEmailMemberLabel(member) {

  const name =
    [
      member.vorname,
      member.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  const base =
    name || member.email || `Mitglied #${member.id}`;

  return `${base} (${member.email})`;

}

function formatEmailEventLabel(event) {

  const title =
    event.title || `Termin #${event.id}`;

  if (!event.date) {
    return title;
  }

  const date =
    new Date(event.date);

  if (Number.isNaN(date.getTime())) {
    return title;
  }

  const dateLabel =
    date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

  return `${dateLabel} — ${title}`;

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
    return value === 'yes';
  }

  if (moduleType === 'yes_no_comment') {
    return value === 'yes';
  }

  if (moduleType === 'poll') {
    return !!value;
  }

  return false;

}

function getSelectedAudienceMode() {

  return document
    .querySelector('input[name="email-audience"]:checked')
    ?.value
    || 'single';

}

function setAudiencePanels(mode) {

  document
    .getElementById('email-audience-single')
    .hidden = mode !== 'single';

  document
    .getElementById('email-audience-event')
    .hidden = mode !== 'event';

  document
    .getElementById('email-audience-all')
    .hidden = mode !== 'all';

}

async function loadEmailMembers() {

  const select =
    document.getElementById('email-member-id');

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .select(
        'id, vorname, nachname, email, einwilligung_kontakt, anonymized_at, rolle'
      )
      .order('nachname')
      .order('vorname');

  if (error) {

    console.error(error);

    select.innerHTML =
      '<option value="">Mitglieder konnten nicht geladen werden</option>';

    return;

  }

  emailMembers = data || [];

  const eligible =
    emailMembers.filter(isEmailEligibleMember);

  if (eligible.length === 0) {

    select.innerHTML =
      '<option value="">Keine Empfänger mit Kontakt-Einwilligung</option>';

    select.disabled = true;

    return;

  }

  select.innerHTML =
    eligible
      .map((member) => `
        <option value="${member.id}">
          ${escapeAdminHtml(formatEmailMemberLabel(member))}
        </option>
      `)
      .join('');

  select.disabled = false;

}

async function loadEmailEvents() {

  const select =
    document.getElementById('email-event-id');

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('id, title, date, slug')
      .order('date', { ascending: false });

  if (error) {

    console.error(error);

    select.innerHTML =
      '<option value="">Termine konnten nicht geladen werden</option>';

    return;

  }

  emailEvents = data || [];

  if (emailEvents.length === 0) {

    select.innerHTML =
      '<option value="">Keine Termine vorhanden</option>';

    select.disabled = true;

    return;

  }

  select.innerHTML =
    emailEvents
      .map((event) => `
        <option value="${event.id}">
          ${escapeAdminHtml(formatEmailEventLabel(event))}
        </option>
      `)
      .join('');

  select.disabled = false;

}

async function resolveEmailPreviewRecipients() {

  const mode =
    getSelectedAudienceMode();

  if (mode === 'single') {

    const memberId =
      Number(
        document
          .getElementById('email-member-id')
          .value
      );

    const member =
      emailMembers.find(
        (item) =>
          item.id === memberId
      );

    if (!isEmailEligibleMember(member)) {
      return [];
    }

    return [member];

  }

  if (mode === 'all') {

    return emailMembers.filter(
      isEmailEligibleMember
    );

  }

  if (mode === 'event') {

    const eventId =
      Number(
        document
          .getElementById('email-event-id')
          .value
      );

    if (!Number.isFinite(eventId)) {
      return [];
    }

    let module =
      emailModulesByEventId.get(eventId);

    if (module === undefined) {

      module =
        await fetchFeedbackModule(
          window.siteConfig.feedback.entityTypes.event,
          eventId
        );

      emailModulesByEventId.set(
        eventId,
        module || null
      );

    }

    const hint =
      document.getElementById('email-event-hint');

    if (!module) {

      hint.textContent =
        'Für diesen Termin gibt es keine Anmeldung/Abstimmung.';

      hint.hidden = false;

      return [];

    }

    hint.hidden = true;

    const answers =
      await fetchFeedbackAnswersForModule(
        module.id
      );

    const recipients =
      answers
        .filter((row) =>
          isRegisteredEventAnswer(
            module.type,
            row.answer
          )
        )
        .map((row) => row.members)
        .filter(isEmailEligibleMember);

    const seen =
      new Set();

    return recipients.filter((member) => {

      const key =
        String(member.id);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;

    });

  }

  return [];

}

async function updateEmailRecipientPreview() {

  const preview =
    document.getElementById('email-recipient-preview');

  preview.textContent =
    'Empfänger werden berechnet …';

  const recipients =
    await resolveEmailPreviewRecipients();

  if (recipients.length === 0) {

    preview.textContent =
      'Empfänger: 0 (keine zustellbaren Adressen)';

    return;

  }

  if (recipients.length === 1) {

    preview.textContent =
      `Empfänger: 1 — ${formatEmailMemberLabel(recipients[0])}`;

    return;

  }

  preview.textContent =
    `Empfänger: ${recipients.length}`;

}

function bindEmailAudienceControls() {

  document
    .querySelectorAll('input[name="email-audience"]')
    .forEach((input) => {

      input.addEventListener(
        'change',
        async () => {

          setAudiencePanels(
            getSelectedAudienceMode()
          );

          await updateEmailRecipientPreview();

        }
      );

    });

  document
    .getElementById('email-member-id')
    ?.addEventListener(
      'change',
      updateEmailRecipientPreview
    );

  document
    .getElementById('email-event-id')
    ?.addEventListener(
      'change',
      async () => {

        const eventId =
          Number(
            document
              .getElementById('email-event-id')
              .value
          );

        emailModulesByEventId.delete(eventId);

        await updateEmailRecipientPreview();

      }
    );

}

function buildEmailSendPayload() {

  const mode =
    getSelectedAudienceMode();

  const payload = {
    mode,
    subject:
      document
        .getElementById('email-subject')
        .value
        .trim(),
    body:
      document
        .getElementById('email-body')
        .value
        .trim()
  };

  if (mode === 'single') {

    payload.member_id =
      Number(
        document
          .getElementById('email-member-id')
          .value
      );

  }

  if (mode === 'event') {

    payload.event_id =
      Number(
        document
          .getElementById('email-event-id')
          .value
      );

  }

  return payload;

}

function bindEmailForm() {

  document
    .getElementById('email-form')
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        const status =
          document.getElementById('email-status');

        const submitBtn =
          document.getElementById('email-submit');

        const payload =
          buildEmailSendPayload();

        const previewRecipients =
          await resolveEmailPreviewRecipients();

        if (previewRecipients.length === 0) {

          status.textContent =
            '❌ Keine Empfänger mit Kontakt-Einwilligung.';

          return;

        }

        const confirmed =
          confirm(
            `${previewRecipients.length} E-Mail(s) senden?\n\n`
            + `Betreff: ${payload.subject}`
          );

        if (!confirmed) {
          return;
        }

        status.textContent =
          'E-Mails werden gesendet …';

        submitBtn.disabled = true;

        const {

          data: { session }

        } =
          await window.supabaseClient.auth.getSession();

        if (!session?.access_token) {

          status.textContent =
            '❌ Nicht angemeldet';

          submitBtn.disabled = false;

          return;

        }

        try {

          const response =
            await fetch(
              getFunctionUrl('sendAdminEmail'),
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization:
                    `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
              }
            );

          const result =
            await response.json();

          if (!response.ok) {

            status.textContent =
              '❌ '
              + (result.error || 'Fehler beim Senden');

            submitBtn.disabled = false;

            return;

          }

          let message =
            `✅ ${result.sent} von ${result.total} E-Mail(s) gesendet.`;

          if (result.failures?.length) {

            message +=
              ` ${result.failures.length} fehlgeschlagen.`;

          }

          status.textContent = message;

          document
            .getElementById('email-form')
            .reset();

          document
            .querySelector('input[name="email-audience"][value="single"]')
            .checked = true;

          setAudiencePanels('single');

          await updateEmailRecipientPreview();

        } catch (error) {

          console.error(error);

          status.textContent =
            '❌ Fehler beim Senden';

        }

        submitBtn.disabled = false;

      }
    );

}

async function initAdminEmailPage() {

  setAudiencePanels('single');

  await Promise.all([
    loadEmailMembers(),
    loadEmailEvents()
  ]);

  bindEmailAudienceControls();
  bindEmailForm();

  await updateEmailRecipientPreview();

}
