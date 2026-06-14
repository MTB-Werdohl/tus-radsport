let feedbackAdminState = {
  module: null,
  entityType: null,
  entityId: null,
  memberMode: false,
  modalSummaryId: null,
  modalTriggerId: null
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

function isFeedbackAdminMemberNewsMode() {

  return (
    feedbackAdminState.memberMode
    && isFeedbackAdminNewsEntity()
  );

}

function isFeedbackAdminEnabled() {

  if (isFeedbackAdminEventEntity()) {
    return true;
  }

  if (isFeedbackAdminMemberNewsMode()) {
    return isMemberFeedbackPollConfigured();
  }

  return (
    document.getElementById(
      'feedback-admin-enabled'
    )?.checked === true
  );

}

function isMemberFeedbackPollConfigured() {

  const question =
    document
      .getElementById('feedback-admin-question')
      ?.value
      .trim();

  if (!question) {
    return false;
  }

  const config =
    readFeedbackAdminPollConfig();

  return !validateMemberFeedbackPollConfig(
    config
  );

}

function getFeedbackAdminPublicVoting() {

  if (
    feedbackAdminState.memberMode
    && isFeedbackAdminNewsEntity()
  ) {
    return false;
  }

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

  syncMemberPollOptionRows();

}

function syncMemberPollOptionRows() {

  if (!isFeedbackAdminMemberNewsMode()) {
    return;
  }

  const rows =
    document.querySelectorAll(
      '#feedback-admin-options .admin-feedback-option-row'
    );

  rows.forEach((row, index) => {

    const isLast =
      index === rows.length - 1;

    const freetextWrap =
      row.querySelector(
        '.feedback-option-freetext-wrap'
      );

    freetextWrap?.classList.toggle(
      'hidden',
      !isLast
    );

    if (!isLast) {

      const freetextCheckbox =
        row.querySelector(
          '.feedback-option-freetext'
        );

      if (freetextCheckbox) {
        freetextCheckbox.checked = false;
      }

      applyMemberPollOptionFreetextState(
        row,
        false
      );

    }

  });

  const lastRow =
    rows[rows.length - 1];

  if (lastRow) {

    const freetextCheckbox =
      lastRow.querySelector(
        '.feedback-option-freetext'
      );

    applyMemberPollOptionFreetextState(
      lastRow,
      freetextCheckbox?.checked === true
    );

  }

}

function applyMemberPollOptionFreetextState(
  row,
  isFreeText
) {

  const labelInput =
    row.querySelector('.feedback-option-label');

  if (!labelInput) {
    return;
  }

  if (isFreeText) {

    labelInput.value = '';
    labelInput.placeholder = '';
    labelInput.disabled = true;

  } else {

    labelInput.disabled = false;

    if (!labelInput.placeholder) {
      labelInput.placeholder =
        'z. B. Waldtour, gemütlich';
    }

  }

}

function bindMemberPollOptionFreetextToggle(
  row
) {

  const freetextCheckbox =
    row.querySelector(
      '.feedback-option-freetext'
    );

  if (!freetextCheckbox) {
    return;
  }

  freetextCheckbox.addEventListener(
    'change',
    () => {

      applyMemberPollOptionFreetextState(
        row,
        freetextCheckbox.checked === true
      );

    }
  );

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

  const isMemberNews =
    isFeedbackAdminMemberNewsMode();

  if (isMemberNews) {

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

    <label
      class="admin-field admin-field--inline feedback-option-freetext-wrap hidden">

      <input
        type="checkbox"
        class="feedback-option-freetext">

      Als Freitext-Option

    </label>

    <button
      type="button"
      class="feedback-option-remove secondary-button">

      Entfernen

    </button>

  </div>

</div>

<input
  type="hidden"
  class="feedback-option-id"
  value="${escapeAdminHtml(option.id || '')}">

`;

    const labelInput =
      row.querySelector('.feedback-option-label');

    labelInput?.addEventListener('blur', () => {

      syncFeedbackOptionIdFromLabel(row);

    });

    bindMemberPollOptionFreetextToggle(row);

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

        syncMemberPollOptionRows();

      });

    return row;

  }

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

  if (isFeedbackAdminMemberNewsMode()) {

    configWrap?.classList.remove('hidden');

  } else {

    configWrap?.classList.toggle(
      'hidden',
      !enabled
    );

  }

  const pollWrap =
    document.getElementById(
      'feedback-admin-poll-wrap'
    );

  pollWrap?.classList.toggle(
    'hidden',
    !isFeedbackAdminMemberNewsMode()
    && (
      !enabled
      || !isFeedbackAdminNewsEntity()
    )
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
  let allowFreeText = false;

  rows.forEach((row, index) => {

    const isLast =
      index === rows.length - 1;

    const freetextCheckbox =
      row.querySelector(
        '.feedback-option-freetext'
      );

    if (
      isFeedbackAdminMemberNewsMode()
      && isLast
      && freetextCheckbox?.checked === true
    ) {
      allowFreeText = true;
      return;
    }

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

    if (isFeedbackAdminMemberNewsMode()) {

      config.allowFreeText = allowFreeText;

      if (allowFreeText) {
        config.freeTextLabel = 'Freitext';
      }

    } else {

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

  }

  return config;

}

function validateMemberFeedbackPollConfig(
  config
) {

  const normalized =
    normalizeFeedbackPollConfig(config);

  if (
    normalized.allowFreeText
    && normalized.options.length < 1
  ) {
    return 'Mindestens eine Antwortoption angeben.';
  }

  if (
    !normalized.allowFreeText
    && normalized.options.length < 2
  ) {
    return 'Mindestens zwei Antwortoptionen angeben.';
  }

  const ids =
    new Set();

  for (const option of normalized.options) {

    if (
      !/^[a-z0-9_-]+$/.test(option.id)
    ) {
      return `Option-ID „${option.id}“ ungültig (nur a-z, 0-9, _, -).`;
    }

    if (ids.has(option.id)) {
      return `Option-ID „${option.id}“ doppelt.`;
    }

    ids.add(option.id);

  }

  return null;

}

function fillFeedbackAdminPollSettings(config) {

  const normalized =
    normalizeFeedbackPollConfig(config);

  const multipleEl =
    document.getElementById(
      'feedback-admin-poll-multiple'
    );

  if (multipleEl) {
    multipleEl.checked =
      normalized.multiple === true;
  }

  if (isFeedbackAdminMemberNewsMode()) {

    syncMemberPollOptionRows();

    if (!normalized.allowFreeText) {
      return;
    }

    const rows =
      document.querySelectorAll(
        '#feedback-admin-options .admin-feedback-option-row'
      );

    const lastRow =
      rows[rows.length - 1];

    const freetextCheckbox =
      lastRow?.querySelector(
        '.feedback-option-freetext'
      );

    if (freetextCheckbox) {
      freetextCheckbox.checked = true;
      applyMemberPollOptionFreetextState(
        lastRow,
        true
      );
    }

    return;

  }

  const freeTextEl =
    document.getElementById(
      'feedback-admin-poll-freetext'
    );

  const freeTextLabelEl =
    document.getElementById(
      'feedback-admin-poll-freetext-label'
    );

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

    if (
      enabled
      && !isFeedbackAdminMemberNewsMode()
    ) {
      enabled.checked = false;
    }

    typeInput.value = forcedType;
    questionInput.value =
      isFeedbackAdminMemberNewsMode()
        ? ''
        : getDefaultFeedbackQuestion(
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

  if (
    enabled
    && !isFeedbackAdminMemberNewsMode()
  ) {
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

  updateFeedbackAdminModalSummary();

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
    && !feedbackAdminState.memberMode
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
      isFeedbackAdminMemberNewsMode()
        ? validateMemberFeedbackPollConfig(
          config
        )
        : validateFeedbackPollConfig(
          config
        );

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

      syncMemberPollOptionRows();

    });

  if (isFeedbackAdminMemberNewsMode()) {

    document
      .getElementById('feedback-admin-question')
      ?.addEventListener(
        'input',
        updateFeedbackAdminModalSummary
      );

  }

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
      : (
        feedbackAdminState.memberMode
          ? 'Internes: Umfrage mit wählbaren Antworten'
          : 'News: Umfrage mit wählbaren Antworten'
      );

  const newsIntroHtml =
    feedbackAdminState.memberMode
      ? `
  <input
    id="feedback-admin-enabled"
    type="checkbox"
    class="checkbox hidden"
    hidden>

  <p class="admin-hint">
    ${typeHint}. Wird beim Speichern des Beitrags übernommen.
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
      : newsIntroHtml;

  const configHiddenClass =
    isEvent
      ? ''
      : (
        feedbackAdminState.memberMode
          ? ''
          : 'hidden'
      );

  const questionPlaceholder =
    isEvent
      ? 'Bist du dabei?'
      : (
        feedbackAdminState.memberMode
          ? 'z. B. Was gefällt dir?'
          : 'z. B. Welches Trikot-Design gefällt dir?'
      );

  const pollWrapHtml =
    isFeedbackAdminMemberNewsMode()
      ? `
  <div
    id="feedback-admin-poll-wrap"
    class="${isNews ? '' : 'hidden'}">

    <p class="admin-hint">
      Antwortoptionen für die Umfrage.
    </p>

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

    <label class="admin-field admin-field--inline admin-feedback-poll-multiple">

      <input
        id="feedback-admin-poll-multiple"
        type="checkbox"
        class="checkbox">

      Mehrfachauswahl erlauben

    </label>

  </div>
`
      : `
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
`;

  const footerHintHtml =
    isEvent
      ? `
<p class="admin-hint">
  Öffentliche Termine: externe Abstimmung folgt automatisch der Sichtbarkeit
  „Öffentlich“. Antworten bleiben gespeichert und werden erst beim Löschen
  des Termins entfernt.
</p>
`
      : (
        feedbackAdminState.memberMode
          ? ''
          : `
<p class="admin-hint">
  Deaktivieren blendet das Feedback auf der Website aus. Antworten bleiben gespeichert und werden erst beim Löschen des Termins bzw. der News entfernt.
</p>
`
      );

  const saveHintHtml =
    feedbackAdminState.memberMode
      ? ''
      : `
<p class="admin-hint">
  Wird zusammen mit „Speichern“ am Ende des Formulars gesichert.
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
        feedbackAdminState.memberMode
          ? ''
          : getDefaultFeedbackQuestion(
            feedbackAdminState.entityType
          )
      )}"
      placeholder="${questionPlaceholder}">
  </label>

  ${pollWrapHtml}

</div>

${footerHintHtml}

${saveHintHtml}

`;

  bindFeedbackAdminEvents();

  fillFeedbackAdminForm(null);

  if (isEvent) {
    updateFeedbackAdminPublicVotingHint();
  }

  updateFeedbackAdminModalSummary();

}

function ensureFeedbackAdminModal() {

  if (
    document.getElementById(
      'feedback-admin-modal'
    )
  ) {
    return;
  }

  const modal =
    document.createElement('div');

  modal.id = 'feedback-admin-modal';
  modal.className = 'member-feedback-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `

<div
  class="member-feedback-modal__backdrop"
  data-close-feedback-modal="true">

</div>

<div
  class="member-feedback-modal__dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="feedback-admin-modal-title">

  <button
    type="button"
    class="member-feedback-modal__close"
    data-close-feedback-modal="true"
    aria-label="Schließen">

    ×

  </button>

  <h2
    id="feedback-admin-modal-title"
    class="member-feedback-modal__title">

    Umfrage konfigurieren

  </h2>

  <div id="feedback-admin-form-wrap"></div>

  <div class="member-feedback-modal__actions">

    <button
      type="button"
      id="feedback-admin-modal-done"
      class="member-edit-btn">

      Fertig

    </button>

  </div>

</div>

`;

  document.body.appendChild(modal);

  bindFeedbackAdminModalEvents(modal);

}

function bindFeedbackAdminModalEvents(modal) {

  modal
    .querySelectorAll(
      '[data-close-feedback-modal="true"]'
    )
    .forEach((element) => {

      element.addEventListener(
        'click',
        closeFeedbackAdminModal
      );

    });

  document
    .getElementById('feedback-admin-modal-done')
    ?.addEventListener(
      'click',
      closeFeedbackAdminModal
    );

  document.addEventListener('keydown', (event) => {

    const dialog =
      document.getElementById(
        'feedback-admin-modal'
      );

    if (
      event.key === 'Escape'
      && dialog
      && !dialog.hidden
    ) {
      closeFeedbackAdminModal();
    }

  });

}

function openFeedbackAdminModal() {

  ensureFeedbackAdminModal();

  const modal =
    document.getElementById(
      'feedback-admin-modal'
    );

  if (!modal) {
    return;
  }

  document.body.appendChild(modal);

  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');

  document.body.classList.add(
    'member-feedback-modal-open'
  );

  if (isFeedbackAdminMemberNewsMode()) {

    modal
      .querySelector('#feedback-admin-question')
      ?.focus();

  } else {

    modal
      .querySelector('#feedback-admin-enabled')
      ?.focus();

  }

}

function closeFeedbackAdminModal() {

  const modal =
    document.getElementById(
      'feedback-admin-modal'
    );

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  document.body.classList.remove(
    'member-feedback-modal-open'
  );

  updateFeedbackAdminModalSummary();

  document
    .getElementById(
      feedbackAdminState.modalTriggerId
    )
    ?.focus();

}

function updateFeedbackAdminModalSummary() {

  const summary =
    document.getElementById(
      feedbackAdminState.modalSummaryId
    );

  if (!summary) {
    return;
  }

  const enabled =
    isFeedbackAdminEnabled();

  if (!enabled) {

    summary.hidden = true;
    summary.textContent = '';

    return;

  }

  const question =
    document
      .getElementById('feedback-admin-question')
      ?.value
      .trim()
    || getDefaultFeedbackQuestion(
      feedbackAdminState.entityType
    );

  summary.textContent =
    `Umfrage: ${question}`;

  summary.hidden = false;

}

function bindFeedbackAdminModalTrigger() {

  const trigger =
    document.getElementById(
      feedbackAdminState.modalTriggerId
    );

  if (!trigger) {
    return;
  }

  trigger.addEventListener(
    'click',
    openFeedbackAdminModal
  );

}

async function initFeedbackModuleForm(options) {

  const entityType =
    options?.entityType;

  const entityId =
    options?.entityId;

  const mountId =
    options?.mountId
    || 'feedback-admin-form-wrap';

  const presentation =
    options?.presentation
    || 'inline';

  feedbackAdminState = {
    module: null,
    entityType,
    entityId,
    memberMode:
      options?.memberMode === true,
    modalSummaryId:
      options?.summaryId || null,
    modalTriggerId:
      options?.triggerId || null
  };

  if (presentation === 'modal') {

    ensureFeedbackAdminModal();

    mountFeedbackAdminForm(
      'feedback-admin-form-wrap'
    );

    bindFeedbackAdminModalTrigger();

  } else {

    mountFeedbackAdminForm(mountId);

  }

  if (entityId) {
    await loadFeedbackAdminModule();
  }

  updateFeedbackAdminModalSummary();

}
