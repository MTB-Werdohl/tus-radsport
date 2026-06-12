let feedbackAdminState = {
  module: null,
  entityType: null,
  entityId: null
};

function isFeedbackAdminNewsEntity() {

  return (
    feedbackAdminState.entityType
    === window.siteConfig.feedback.entityTypes.news
  );

}

function isFeedbackAdminEventEntity() {

  return (
    feedbackAdminState.entityType
    === window.siteConfig.feedback.entityTypes.event
  );

}

function getFeedbackAdminEntitySichtbarkeit() {

  return (
    document.getElementById('sichtbarkeit')?.value
    || window.siteConfig.visibility?.public
    || 'public'
  );

}

function isFeedbackAdminPublicVotingFromSichtbarkeit() {

  return (
    getFeedbackAdminEntitySichtbarkeit()
    === window.siteConfig.visibility.public
  );

}

function isFeedbackAdminEnabled() {

  if (isFeedbackAdminEventEntity()) {
    return true;
  }

  return (
    document.getElementById(
      'feedback-admin-enabled'
    )?.checked === true
  );

}

function getFeedbackAdminPublicVoting() {

  if (isFeedbackAdminEventEntity()) {
    return isFeedbackAdminPublicVotingFromSichtbarkeit();
  }

  return (
    document.getElementById(
      'feedback-admin-public-voting'
    )?.checked === true
  );

}

function getFeedbackAdminForcedType() {

  return getFeedbackEntityFeedbackType(
    feedbackAdminState.entityType
  );

}

function renderFeedbackAdminPollOptions(options) {

  const list =
    document.getElementById(
      'feedback-admin-options'
    );

  if (!list) {
    return;
  }

  list.innerHTML = '';

  const rows =
    options?.length
      ? options
      : [{ id: '', label: '' }, { id: '', label: '' }];

  rows.forEach((option) => {

    list.appendChild(
      createFeedbackAdminOptionRow(option)
    );

  });

}

function isFeedbackOptionIdCustom(
  label,
  id
) {

  const normalizedId =
    String(id || '').trim();

  if (!normalizedId) {
    return false;
  }

  return normalizedId
    !== slugifyFeedbackOptionId(label);

}

function syncFeedbackOptionIdFromLabel(
  row,
  force
) {

  if (
    row.dataset.idLocked === 'true'
    && !force
  ) {
    return;
  }

  const labelInput =
    row.querySelector('.feedback-option-label');

  const idInput =
    row.querySelector('.feedback-option-id');

  if (!labelInput || !idInput) {
    return;
  }

  const slug =
    slugifyFeedbackOptionId(
      labelInput.value
    );

  if (slug) {
    idInput.value = slug;
  }

  updateFeedbackOptionIdToggleLabel(row);

}

function updateFeedbackOptionIdToggleLabel(row) {

  const toggle =
    row.querySelector(
      '.feedback-option-id-toggle'
    );

  const idInput =
    row.querySelector('.feedback-option-id');

  if (!toggle || !idInput) {
    return;
  }

  const id =
    idInput.value.trim();

  toggle.textContent =
    id
      ? `Interne ID: ${id}`
      : 'Interne ID …';

}

function setFeedbackOptionIdExpanded(
  row,
  expanded
) {

  const wrap =
    row.querySelector(
      '.admin-feedback-option-id-wrap'
    );

  const toggle =
    row.querySelector(
      '.feedback-option-id-toggle'
    );

  if (!wrap || !toggle) {
    return;
  }

  wrap.classList.toggle(
    'hidden',
    !expanded
  );

  toggle.setAttribute(
    'aria-expanded',
    String(expanded)
  );

}

function createFeedbackAdminOptionRow(option = {}) {

  const row =
    document.createElement('div');

  row.className =
    'admin-feedback-option-row';

  const showIdAdvanced =
    isFeedbackOptionIdCustom(
      option.label,
      option.id
    );

  row.innerHTML = `

<div class="admin-feedback-option-main">

  <label>
    Antwort
    <input
      type="text"
      class="feedback-option-label"
      value="${escapeAdminHtml(option.label || '')}"
      placeholder="z. B. Waldtour, gemütlich">
  </label>

  <div class="admin-feedback-option-actions">

    <button
      type="button"
      class="feedback-option-id-toggle"
      aria-expanded="${showIdAdvanced ? 'true' : 'false'}">

      Interne ID …

    </button>

    <button
      type="button"
      class="feedback-option-remove secondary-button">

      Entfernen

    </button>

  </div>

</div>

<div class="admin-feedback-option-id-wrap${showIdAdvanced ? '' : ' hidden'}">

  <label>
    Interne ID
    <input
      type="text"
      class="feedback-option-id"
      value="${escapeAdminHtml(option.id || '')}"
      placeholder="wird automatisch erzeugt"
      pattern="[a-z0-9_-]+"
      autocomplete="off">
  </label>

  <p class="admin-hint admin-feedback-option-id-hint">
    Normalerweise leer lassen. Nur anpassen, wenn sich die Anzeige später ändert und alte Stimmen zusammenbleiben sollen.
  </p>

</div>

`;

  if (showIdAdvanced) {
    row.dataset.idLocked = 'true';
  }

  const labelInput =
    row.querySelector('.feedback-option-label');

  const idInput =
    row.querySelector('.feedback-option-id');

  labelInput.addEventListener('blur', () => {

    syncFeedbackOptionIdFromLabel(row);

  });

  idInput.addEventListener('input', () => {

    row.dataset.idLocked = 'true';
    updateFeedbackOptionIdToggleLabel(row);

  });

  row
    .querySelector('.feedback-option-id-toggle')
    ?.addEventListener('click', () => {

      const wrap =
        row.querySelector(
          '.admin-feedback-option-id-wrap'
        );

      const expanded =
        wrap?.classList.contains('hidden');

      setFeedbackOptionIdExpanded(
        row,
        expanded
      );

      if (expanded) {
        idInput.focus();
      }

    });

  row
    .querySelector('.feedback-option-remove')
    ?.addEventListener('click', () => {

      row.remove();

      const list =
        document.getElementById(
          'feedback-admin-options'
        );

      if (
        list
        && !list.children.length
      ) {
        list.appendChild(
          createFeedbackAdminOptionRow()
        );
      }

    });

  if (option.id) {
    updateFeedbackOptionIdToggleLabel(row);
  }

  return row;

}

function toggleFeedbackAdminPollFields() {

  const enabled =
    isFeedbackAdminEnabled();

  const configWrap =
    document.getElementById(
      'feedback-admin-config'
    );

  configWrap?.classList.toggle(
    'hidden',
    !enabled
  );

  const pollWrap =
    document.getElementById(
      'feedback-admin-poll-wrap'
    );

  pollWrap?.classList.toggle(
    'hidden',
    !enabled
    || !isFeedbackAdminNewsEntity()
  );

  const publicVotingWrap =
    document.getElementById(
      'feedback-admin-public-voting-wrap'
    );

  if (publicVotingWrap) {
    publicVotingWrap.classList.toggle(
      'hidden',
      !enabled
    );
  }

  updateFeedbackAdminPublicVotingHint();

}

function updateFeedbackAdminPublicVotingHint() {

  const hint =
    document.getElementById(
      'feedback-admin-public-voting-hint'
    );

  if (
    !hint
    || !isFeedbackAdminEventEntity()
  ) {
    return;
  }

  const sichtbarkeit =
    getFeedbackAdminEntitySichtbarkeit();

  let message = '';

  if (
    sichtbarkeit
    === window.siteConfig.visibility.public
  ) {

    message =
      'Öffentlicher Termin: externe Teilnehmer können sich registrieren '
      + 'und abstimmen (folgt der Termin-Sichtbarkeit).';

  } else if (
    sichtbarkeit
    === window.siteConfig.visibility.members
  ) {

    message =
      'Nur Vereinsmitglieder (eingeloggt) können abstimmen.';

  } else if (
    sichtbarkeit
    === window.siteConfig.visibility.draft
  ) {

    message =
      'Entwurf: Abstimmung ist erst nach Veröffentlichung sichtbar.';

  }

  hint.textContent = message;
  hint.hidden = !message;

}

function readFeedbackAdminPollConfig() {

  const rows =
    document.querySelectorAll(
      '.admin-feedback-option-row'
    );

  const options = [];

  rows.forEach((row) => {

    syncFeedbackOptionIdFromLabel(row);

    const id =
      row
        .querySelector('.feedback-option-id')
        ?.value
        .trim()
      || slugifyFeedbackOptionId(
        row
          .querySelector('.feedback-option-label')
          ?.value
          .trim()
      );

    const label =
      row
        .querySelector('.feedback-option-label')
        ?.value
        .trim();

    if (!id || !label) {
      return;
    }

    options.push({ id, label });

  });

  const config = {
    options
  };

  if (isFeedbackAdminNewsEntity()) {

    config.multiple =
      document.getElementById(
        'feedback-admin-poll-multiple'
      )?.checked === true;

    config.allowFreeText =
      document.getElementById(
        'feedback-admin-poll-freetext'
      )?.checked === true;

    const freeTextLabel =
      document.getElementById(
        'feedback-admin-poll-freetext-label'
      )?.value
        .trim();

    if (freeTextLabel) {
      config.freeTextLabel = freeTextLabel;
    }

  }

  return config;

}

function fillFeedbackAdminPollSettings(config) {

  const normalized =
    normalizeFeedbackPollConfig(config);

  const multipleEl =
    document.getElementById(
      'feedback-admin-poll-multiple'
    );

  const freeTextEl =
    document.getElementById(
      'feedback-admin-poll-freetext'
    );

  const freeTextLabelEl =
    document.getElementById(
      'feedback-admin-poll-freetext-label'
    );

  if (multipleEl) {
    multipleEl.checked =
      normalized.multiple === true;
  }

  if (freeTextEl) {
    freeTextEl.checked =
      normalized.allowFreeText === true;
  }

  if (freeTextLabelEl) {
    freeTextLabelEl.value =
      normalized.freeTextLabel || 'Freitext';
  }

  const freeTextLabelWrap =
    document.getElementById(
      'feedback-admin-poll-freetext-label-wrap'
    );

  freeTextLabelWrap?.classList.toggle(
    'hidden',
    !normalized.allowFreeText
  );

}

function fillFeedbackAdminForm(module) {

  const enabled =
    document.getElementById(
      'feedback-admin-enabled'
    );

  const typeInput =
    document.getElementById(
      'feedback-admin-type'
    );

  const questionInput =
    document.getElementById(
      'feedback-admin-question'
    );

  if (!typeInput || !questionInput) {
    return;
  }

  const forcedType =
    getFeedbackAdminForcedType();

  if (!module) {

    if (enabled) {
      enabled.checked = false;
    }

    typeInput.value = forcedType;
    questionInput.value =
      getDefaultFeedbackQuestion(
        feedbackAdminState.entityType
      );

    const publicVotingInput =
      document.getElementById(
        'feedback-admin-public-voting'
      );

    if (publicVotingInput) {
      publicVotingInput.checked = false;
    }

    renderFeedbackAdminPollOptions();
    fillFeedbackAdminPollSettings({});
    toggleFeedbackAdminPollFields();
    return;

  }

  if (enabled) {
    enabled.checked =
      module.enabled !== false;
  }

  typeInput.value = forcedType;
  questionInput.value =
    module.question
    || getDefaultFeedbackQuestion(
      feedbackAdminState.entityType
    );

  const publicVotingInput =
    document.getElementById(
      'feedback-admin-public-voting'
    );

  if (publicVotingInput) {
    publicVotingInput.checked =
      module.public_voting === true;
  }

  const config =
    normalizeFeedbackPollConfig(
      module.config
    );

  renderFeedbackAdminPollOptions(
    config.options
  );

  fillFeedbackAdminPollSettings(config);

  toggleFeedbackAdminPollFields();

  updateFeedbackAdminPublicVotingHint();

}

async function loadFeedbackAdminModule() {

  if (
    !feedbackAdminState.entityType
    || !feedbackAdminState.entityId
  ) {
    return;
  }

  const module =
    await fetchFeedbackModule(
      feedbackAdminState.entityType,
      feedbackAdminState.entityId
    );

  feedbackAdminState.module = module;

  fillFeedbackAdminForm(module);

}

async function saveFeedbackAdminForEntity(
  entityType,
  entityId,
  options = {}
) {

  const silent =
    options.silent === true;

  const enabledEl =
    document.getElementById(
      'feedback-admin-enabled'
    );

  if (
    !isFeedbackAdminEventEntity()
    && !enabledEl
  ) {
    return { ok: true };
  }

  if (!entityType || !entityId) {
    return { ok: true };
  }

  feedbackAdminState.entityType =
    entityType;

  feedbackAdminState.entityId =
    entityId;

  const enabled =
    isFeedbackAdminEnabled();

  if (
    !enabled
    && !isFeedbackAdminEventEntity()
  ) {

    if (!feedbackAdminState.module?.id) {
      return { ok: true };
    }

    const existing =
      feedbackAdminState.module;

    const type =
      getFeedbackAdminForcedType();

    const question =
      document.getElementById(
        'feedback-admin-question'
      )?.value
        .trim()
      || existing.question
      || getDefaultFeedbackQuestion(
        entityType
      );

    let config =
      existing.config || {};

    if (
      type
      === window.siteConfig.feedback.types.poll
    ) {

      const readConfig =
        readFeedbackAdminPollConfig();

      if (readConfig.options?.length) {
        config = readConfig;
      }

    }

    const publicVoting =
      getFeedbackAdminPublicVoting();

    const payload = {
      type,
      entity_type: entityType,
      entity_id: entityId,
      question,
      config,
      public_voting: publicVoting,
      enabled: false
    };

    const result =
      await saveFeedbackModule(payload);

    if (result?.error) {

      if (!silent) {
        alert(result.error.message);
      }

      return result;

    }

    feedbackAdminState.module =
      result.data;

    return { ok: true, data: result.data };

  }

  const type =
    getFeedbackAdminForcedType();

  const questionRaw =
    document.getElementById(
      'feedback-admin-question'
    )?.value
      .trim();

  let question =
    questionRaw
    || getDefaultFeedbackQuestion(
      entityType
    );

  if (!question) {

    const message =
      'Bitte eine Feedback-Frage angeben.';

    if (!silent) {
      alert(message);
    }

    return {
      error: { message }
    };

  }

  let config = {};

  if (
    type
    === window.siteConfig.feedback.types.poll
  ) {

    config =
      readFeedbackAdminPollConfig();

    const configError =
      validateFeedbackPollConfig(config);

    if (configError) {

      if (!silent) {
        alert(configError);
      }

      return {
        error: { message: configError }
      };

    }

  }

  const publicVoting =
    getFeedbackAdminPublicVoting();

  const payload = {
    type,
    entity_type: entityType,
    entity_id: entityId,
    question,
    config,
    public_voting: publicVoting,
    enabled: true
  };

  const result =
    await saveFeedbackModule(payload);

  if (result?.error) {

    if (!silent) {
      alert(result.error.message);
    }

    return result;

  }

  feedbackAdminState.module =
    result.data;

  return { ok: true, data: result.data };

}

function bindFeedbackAdminEvents() {

  document
    .getElementById('feedback-admin-enabled')
    ?.addEventListener('change', toggleFeedbackAdminPollFields);

  document
    .getElementById('feedback-admin-public-voting')
    ?.addEventListener('change', updateFeedbackAdminPublicVotingHint);

  document
    .getElementById('sichtbarkeit')
    ?.addEventListener('change', updateFeedbackAdminPublicVotingHint);

  document
    .getElementById('feedback-admin-poll-freetext')
    ?.addEventListener('change', (event) => {

      document
        .getElementById(
          'feedback-admin-poll-freetext-label-wrap'
        )
        ?.classList.toggle(
          'hidden',
          !event.target.checked
        );

    });

  document
    .getElementById('feedback-admin-add-option')
    ?.addEventListener('click', () => {

      document
        .getElementById('feedback-admin-options')
        ?.appendChild(
          createFeedbackAdminOptionRow()
        );

    });

}

function mountFeedbackAdminForm(mountId) {

  const mount =
    document.getElementById(mountId);

  if (!mount) {
    return;
  }

  const isNews =
    isFeedbackAdminNewsEntity();

  const isEvent =
    isFeedbackAdminEventEntity();

  const forcedType =
    getFeedbackAdminForcedType();

  const typeHint =
    isEvent
      ? 'Termin: Ja / Vielleicht — Frage standardmäßig „Bist du dabei?“'
      : 'News: Umfrage mit wählbaren Antworten';

  const eventIntroHtml =
    isEvent
      ? `
  <p class="admin-hint">
    ${typeHint}. Die Abstimmung ist bei jedem Termin aktiv.
  </p>

  <p
    id="feedback-admin-public-voting-hint"
    class="admin-hint"
    hidden>

  </p>
`
      : `
  <label class="admin-field admin-field--inline">

    <input
      id="feedback-admin-enabled"
      type="checkbox"
      class="checkbox">

    Feedback aktivieren

  </label>

  <p class="admin-hint">
    ${typeHint}. Auf der Website nur sichtbar, wenn aktiviert.
  </p>

  <div id="feedback-admin-public-voting-wrap">

    <label class="admin-field admin-field--inline">

      <input
        id="feedback-admin-public-voting"
        type="checkbox"
        class="checkbox">

      Öffentliche Abstimmung (externe Teilnehmer mit Name/E-Mail, Rolle „public“)

    </label>

    <p class="admin-hint">
      Standard: nur Vereinsmitglieder. Öffentlich: Pop-up → Bestätigungs-Link
      per E-Mail → erst nach Klick Eintrag in der DB, dann abstimmen.
    </p>

  </div>
`;

  const configHiddenClass =
    isEvent ? '' : 'hidden';

  const footerHintHtml =
    isEvent
      ? `
<p class="admin-hint">
  Öffentliche Termine: externe Abstimmung folgt automatisch der Sichtbarkeit
  „Öffentlich“. Antworten bleiben gespeichert und werden erst beim Löschen
  des Termins entfernt.
</p>
`
      : `
<p class="admin-hint">
  Deaktivieren blendet das Feedback auf der Website aus. Antworten bleiben gespeichert und werden erst beim Löschen des Termins bzw. der News entfernt.
</p>
`;

  mount.innerHTML = `

<div class="admin-feedback-checkboxes">

${eventIntroHtml}

</div>

<div
  id="feedback-admin-config"
  class="${configHiddenClass} admin-feedback-config">

  <input
    id="feedback-admin-type"
    type="hidden"
    value="${forcedType}">

  <label class="admin-field">
    Frage
    <input
      id="feedback-admin-question"
      type="text"
      value="${escapeAdminHtml(
        getDefaultFeedbackQuestion(
          feedbackAdminState.entityType
        )
      )}"
      placeholder="${
        isEvent
          ? 'Bist du dabei?'
          : 'z. B. Welches Trikot-Design gefällt dir?'
      }">
  </label>

  <div
    id="feedback-admin-poll-wrap"
    class="${isNews ? '' : 'hidden'}">

    <p class="admin-hint">
      Antwortoptionen für die Umfrage. Die interne ID wird automatisch erzeugt.
    </p>

    <div class="admin-feedback-poll-settings">

      <label class="admin-field admin-field--inline">

        <input
          id="feedback-admin-poll-multiple"
          type="checkbox"
          class="checkbox">

        Mehrfachauswahl erlauben

      </label>

      <label class="admin-field admin-field--inline">

        <input
          id="feedback-admin-poll-freetext"
          type="checkbox"
          class="checkbox">

        Freitext als zusätzliche Auswahl (mit Eingabefeld nach Auswahl)

      </label>

      <div
        id="feedback-admin-poll-freetext-label-wrap"
        class="hidden admin-field">

        <label>
          Bezeichnung der Freitext-Option
          <input
            id="feedback-admin-poll-freetext-label"
            type="text"
            value="Freitext"
            placeholder="Freitext">
        </label>

        <p class="admin-hint">
          Erscheint als letzte Antwortoption in der Umfrage, z.&nbsp;B. „Freitext“ oder „Anderer Ort“.
        </p>

      </div>

    </div>

    <div
      id="feedback-admin-options"
      class="admin-feedback-options">

    </div>

    <button
      id="feedback-admin-add-option"
      type="button"
      class="secondary-button">

      Option hinzufügen

    </button>

  </div>

</div>

${footerHintHtml}

<p class="admin-hint">
  Wird zusammen mit „Speichern“ am Ende des Formulars gesichert.
</p>

`;

  bindFeedbackAdminEvents();

  fillFeedbackAdminForm(null);

  if (isEvent) {
    updateFeedbackAdminPublicVotingHint();
  }

}

async function initFeedbackModuleForm(options) {

  const entityType =
    options?.entityType;

  const entityId =
    options?.entityId;

  const mountId =
    options?.mountId
    || 'feedback-admin-form-wrap';

  feedbackAdminState = {
    module: null,
    entityType,
    entityId
  };

  mountFeedbackAdminForm(mountId);

  if (entityId) {
    await loadFeedbackAdminModule();
  }

}
