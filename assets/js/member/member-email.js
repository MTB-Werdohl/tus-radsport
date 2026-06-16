let memberEmailMembers = [];
let memberEmailEvents = [];
let memberEmailModulesByEventId = new Map();

const MEMBER_EMAIL_AUDIENCE_NAME =
  'member-email-audience';

function getMemberEmailPanel() {

  return document.getElementById(
    'member-profile-tab-email'
  );

}

function memberEmailEl(baseId) {

  const panel =
    getMemberEmailPanel();

  if (!panel) {
    return null;
  }

  return panel.querySelector(
    `#member-email-${baseId}`
  );

}

function memberEmailQuery(selector) {

  const panel =
    getMemberEmailPanel();

  if (!panel) {
    return null;
  }

  return panel.querySelector(selector);

}

function memberEmailQueryAll(selector) {

  const panel =
    getMemberEmailPanel();

  if (!panel) {
    return [];
  }

  return panel.querySelectorAll(selector);

}

function escapeMemberEmailHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function isMemberEmailEligible(member) {

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

function formatMemberEmailMemberLabel(member) {

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

function formatMemberEmailEventLabel(event) {

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

function isMemberEmailRegisteredAnswer(
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

  if (moduleType === 'poll') {
    return !!value;
  }

  return false;

}

function getMemberEmailAudienceMode() {

  return memberEmailQuery(
    `input[name="${MEMBER_EMAIL_AUDIENCE_NAME}"]:checked`
  )?.value
    || 'single';

}

function setMemberEmailAudiencePanels(mode) {

  const single =
    memberEmailEl('audience-single');

  const eventPanel =
    memberEmailEl('audience-event');

  const allPanel =
    memberEmailEl('audience-all');

  if (single) {
    single.hidden = mode !== 'single';
  }

  if (eventPanel) {
    eventPanel.hidden = mode !== 'event';
  }

  if (allPanel) {
    allPanel.hidden = mode !== 'all';
  }

}

async function loadMemberEmailMembers() {

  const select =
    memberEmailEl('member-id');

  if (!select) {
    return;
  }

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

  memberEmailMembers = data || [];

  const eligible =
    memberEmailMembers.filter(isMemberEmailEligible);

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
          ${escapeMemberEmailHtml(formatMemberEmailMemberLabel(member))}
        </option>
      `)
      .join('');

  select.disabled = false;

}

async function loadMemberEmailEvents() {

  const select =
    memberEmailEl('event-id');

  if (!select) {
    return;
  }

  memberEmailModulesByEventId =
    new Map();

  const { data: modules, error: modulesError } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.feedbackModules
      )
      .select('id, entity_id, type, enabled')
      .eq(
        'entity_type',
        window.siteConfig.feedback.entityTypes.event
      );

  if (modulesError) {

    console.error(modulesError);

    select.innerHTML =
      '<option value="">Termine konnten nicht geladen werden</option>';

    select.disabled = true;

    memberEmailEvents = [];

    return;

  }

  const eventModules =
    modules || [];

  eventModules.forEach((module) => {

    const eventId =
      Number(module.entity_id);

    if (!Number.isFinite(eventId)) {
      return;
    }

    memberEmailModulesByEventId.set(
      eventId,
      module
    );

  });

  const eventIds =
    [...memberEmailModulesByEventId.keys()];

  if (eventIds.length === 0) {

    select.innerHTML =
      '<option value="">Keine Termine mit Anmeldung/Abstimmung</option>';

    select.disabled = true;

    memberEmailEvents = [];

    return;

  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('id, title, date, slug')
      .in('id', eventIds)
      .order('date', { ascending: false });

  if (error) {

    console.error(error);

    select.innerHTML =
      '<option value="">Termine konnten nicht geladen werden</option>';

    select.disabled = true;

    memberEmailEvents = [];

    return;

  }

  memberEmailEvents = data || [];

  if (memberEmailEvents.length === 0) {

    select.innerHTML =
      '<option value="">Keine Termine mit Anmeldung/Abstimmung</option>';

    select.disabled = true;

    return;

  }

  select.innerHTML =
    memberEmailEvents
      .map((event) => `
        <option value="${event.id}">
          ${escapeMemberEmailHtml(formatMemberEmailEventLabel(event))}
        </option>
      `)
      .join('');

  select.disabled = false;

}

async function resolveMemberEmailPreviewRecipients() {

  const mode =
    getMemberEmailAudienceMode();

  if (mode === 'single') {

    const memberSelect =
      memberEmailEl('member-id');

    if (!memberSelect) {
      return [];
    }

    const memberId =
      Number(memberSelect.value);

    const member =
      memberEmailMembers.find(
        (item) =>
          item.id === memberId
      );

    if (!isMemberEmailEligible(member)) {
      return [];
    }

    return [member];

  }

  if (mode === 'all') {

    return memberEmailMembers.filter(
      isMemberEmailEligible
    );

  }

  if (mode === 'event') {

    const eventSelect =
      memberEmailEl('event-id');

    if (!eventSelect) {
      return [];
    }

    const eventId =
      Number(eventSelect.value);

    if (!Number.isFinite(eventId)) {
      return [];
    }

    let module =
      memberEmailModulesByEventId.get(eventId);

    if (module === undefined) {

      module =
        await fetchFeedbackModule(
          window.siteConfig.feedback.entityTypes.event,
          eventId
        );

      memberEmailModulesByEventId.set(
        eventId,
        module || null
      );

    }

    const hint =
      memberEmailEl('event-hint');

    if (!module) {

      if (hint) {

        hint.textContent =
          'Für diesen Termin gibt es keine Anmeldung/Abstimmung.';

        hint.hidden = false;

      }

      return [];

    }

    if (hint) {
      hint.hidden = true;
    }

    const answers =
      await fetchFeedbackAnswersForModule(
        module.id
      );

    const recipients =
      answers
        .filter((row) =>
          isMemberEmailRegisteredAnswer(
            module.type,
            row.answer
          )
        )
        .map((row) => row.members)
        .filter(isMemberEmailEligible);

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

async function updateMemberEmailRecipientPreview() {

  const preview =
    memberEmailEl('recipient-preview');

  if (!preview) {
    return;
  }

  preview.textContent =
    'Empfänger werden berechnet …';

  const recipients =
    await resolveMemberEmailPreviewRecipients();

  if (recipients.length === 0) {

    preview.textContent =
      'Empfänger: 0 (keine zustellbaren Adressen)';

    return;

  }

  if (recipients.length === 1) {

    preview.textContent =
      `Empfänger: 1 — ${formatMemberEmailMemberLabel(recipients[0])}`;

    return;

  }

  preview.textContent =
    `Empfänger: ${recipients.length}`;

}

function bindMemberEmailAudienceControls() {

  memberEmailQueryAll(
    `input[name="${MEMBER_EMAIL_AUDIENCE_NAME}"]`
  ).forEach((input) => {

    if (input.dataset.bound === 'true') {
      return;
    }

    input.dataset.bound = 'true';

    input.addEventListener(
      'change',
      async () => {

        setMemberEmailAudiencePanels(
          getMemberEmailAudienceMode()
        );

        await updateMemberEmailRecipientPreview();

      }
    );

  });

  const memberSelect =
    memberEmailEl('member-id');

  if (
    memberSelect
    && memberSelect.dataset.bound !== 'true'
  ) {

    memberSelect.dataset.bound = 'true';

    memberSelect.addEventListener(
      'change',
      updateMemberEmailRecipientPreview
    );

  }

  const eventSelect =
    memberEmailEl('event-id');

  if (
    eventSelect
    && eventSelect.dataset.bound !== 'true'
  ) {

    eventSelect.dataset.bound = 'true';

    eventSelect.addEventListener(
      'change',
      async () => {

        const eventId =
          Number(eventSelect.value);

        memberEmailModulesByEventId.delete(eventId);

        await updateMemberEmailRecipientPreview();

      }
    );

  }

}

function buildMemberEmailSendPayload() {

  const mode =
    getMemberEmailAudienceMode();

  const payload = {
    mode,
    subject:
      memberEmailEl('subject')
      ?.value
      ?.trim()
      || '',
    body:
      memberEmailEl('body')
      ?.value
      ?.trim()
      || ''
  };

  if (mode === 'single') {

    payload.member_id =
      Number(
        memberEmailEl('member-id')
          ?.value
      );

  }

  if (mode === 'event') {

    payload.event_id =
      Number(
        memberEmailEl('event-id')
          ?.value
      );

  }

  return payload;

}

function bindMemberEmailForm() {

  const form =
    memberEmailEl('form');

  if (
    !form
    || form.dataset.bound === 'true'
  ) {
    return;
  }

  form.dataset.bound = 'true';

  form.addEventListener(
    'submit',
    async (event) => {

      event.preventDefault();

      const status =
        memberEmailEl('status');

      const submitBtn =
        memberEmailEl('submit');

      const payload =
        buildMemberEmailSendPayload();

      const previewRecipients =
        await resolveMemberEmailPreviewRecipients();

      if (previewRecipients.length === 0) {

        if (status) {
          status.textContent =
            '❌ Keine Empfänger mit Kontakt-Einwilligung.';
        }

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

      if (status) {
        status.textContent =
          'E-Mails werden gesendet …';
      }

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      const {

        data: { session }

      } =
        await window.supabaseClient.auth.getSession();

      if (!session?.access_token) {

        if (status) {
          status.textContent =
            '❌ Nicht angemeldet';
        }

        if (submitBtn) {
          submitBtn.disabled = false;
        }

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

          if (status) {
            status.textContent =
              '❌ '
              + (result.error || 'Fehler beim Senden');
          }

          if (submitBtn) {
            submitBtn.disabled = false;
          }

          return;

        }

        let message =
          `✅ ${result.sent} von ${result.total} E-Mail(s) gesendet.`;

        if (result.failures?.length) {

          message +=
            ` ${result.failures.length} fehlgeschlagen.`;

        }

        if (status) {
          status.textContent = message;
        }

        form.reset();

        const singleRadio =
          memberEmailQuery(
            `input[name="${MEMBER_EMAIL_AUDIENCE_NAME}"][value="single"]`
          );

        if (singleRadio) {
          singleRadio.checked = true;
        }

        setMemberEmailAudiencePanels('single');

        await updateMemberEmailRecipientPreview();

        if (
          typeof loadMemberEmailLog
            === 'function'
        ) {
          await loadMemberEmailLog();
        }

      } catch (error) {

        console.error(error);

        if (status) {
          status.textContent =
            '❌ Fehler beim Senden';
        }

      }

      if (submitBtn) {
        submitBtn.disabled = false;
      }

    }
  );

}

function renderMemberEmailPanelShell() {

  return `
<section class="member-profile-section-block member-email-panel">

  <h2>E-Mail senden</h2>

  <div class="member-email-compose">

    <form id="member-email-form">

      <fieldset class="member-email-audience">

        <legend>
          Empfänger
        </legend>

        <label class="member-email-radio">
          <input
            type="radio"
            name="member-email-audience"
            value="single"
            checked>
          Einzelmitglied
        </label>

        <label class="member-email-radio">
          <input
            type="radio"
            name="member-email-audience"
            value="event">
          Abgestimmte Tour
        </label>

        <label class="member-email-radio">
          <input
            type="radio"
            name="member-email-audience"
            value="all">
          Alle Mitglieder
        </label>

      </fieldset>

      <div
        id="member-email-audience-single"
        class="member-email-panel">

        <label for="member-email-member-id">
          Mitglied
        </label>

        <select
          id="member-email-member-id"
          disabled>

          <option value="">
            Mitglieder werden geladen …
          </option>

        </select>

      </div>

      <div
        id="member-email-audience-event"
        class="member-email-panel"
        hidden>

        <select
          id="member-email-event-id"
          aria-label="Termin"
          disabled>

          <option value="">
            Termine werden geladen …
          </option>

        </select>

        <p
          id="member-email-event-hint"
          class="member-email-hint"
          hidden></p>

      </div>

      <div
        id="member-email-audience-all"
        class="member-email-panel"
        hidden></div>

      <p
        id="member-email-recipient-preview"
        class="member-email-preview"
        aria-live="polite">

        Empfänger: …

      </p>

      <label for="member-email-subject">
        Betreff
      </label>

      <input
        type="text"
        id="member-email-subject"
        maxlength="200"
        required>

      <label for="member-email-body">
        Nachricht
      </label>

      <textarea
        id="member-email-body"
        rows="10"
        required></textarea>

      <button
        type="submit"
        id="member-email-submit">

        E-Mail senden

      </button>

    </form>

    <div id="member-email-status"></div>

  </div>

</section>

<section class="member-profile-section-block member-email-log-panel">

  <h2>Versandprotokoll</h2>

  <div
    id="member-email-log-list"
    class="member-email-log-list">

    <p class="member-email-hint">
      Protokoll wird geladen …
    </p>

  </div>

</section>
  `.trim();

}

async function initMemberEmailTab() {

  const panel =
    getMemberEmailPanel();

  if (!panel) {
    return;
  }

  if (panel.dataset.emailBound !== 'true') {

    setMemberEmailAudiencePanels('single');

    bindMemberEmailAudienceControls();
    bindMemberEmailForm();

    panel.dataset.emailBound = 'true';

  } else {

    setMemberEmailAudiencePanels('single');

  }

  await Promise.all([
    loadMemberEmailMembers(),
    loadMemberEmailEvents()
  ]);

  await updateMemberEmailRecipientPreview();

  await loadMemberEmailLog();

}
