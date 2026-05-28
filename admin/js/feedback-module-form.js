let feedbackAdminState = {
  module: null,
  entityType: null,
  entityId: null
};

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

function createFeedbackAdminOptionRow(option = {}) {

  const row =
    document.createElement('div');

  row.className =
    'admin-feedback-option-row';

  row.innerHTML = `

<label>
  Anzeige
  <input
    type="text"
    class="feedback-option-label"
    value="${escapeAdminHtml(option.label || '')}"
    placeholder="18 Uhr">
</label>

<label>
  ID
  <input
    type="text"
    class="feedback-option-id"
    value="${escapeAdminHtml(option.id || '')}"
    placeholder="18uhr"
    pattern="[a-z0-9_-]+">
</label>

<button
  type="button"
  class="feedback-option-remove">

  Entfernen

</button>

`;

  const labelInput =
    row.querySelector('.feedback-option-label');

  const idInput =
    row.querySelector('.feedback-option-id');

  labelInput.addEventListener('blur', () => {

    if (idInput.value.trim()) {
      return;
    }

    idInput.value =
      slugifyFeedbackOptionId(
        labelInput.value
      );

  });

  row
    .querySelector('.feedback-option-remove')
    .addEventListener('click', () => {

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

  return row;

}

function toggleFeedbackAdminPollFields() {

  const enabled =
    document.getElementById(
      'feedback-admin-enabled'
    )?.checked;

  const type =
    document.getElementById(
      'feedback-admin-type'
    )?.value;

  const pollWrap =
    document.getElementById(
      'feedback-admin-poll-wrap'
    );

  pollWrap?.classList.toggle(
    'hidden',
    !enabled
    || type
      !== window.siteConfig.feedback.types.poll
  );

}

function readFeedbackAdminPollConfig() {

  const rows =
    document.querySelectorAll(
      '.admin-feedback-option-row'
    );

  const options = [];

  rows.forEach((row) => {

    const id =
      row
        .querySelector('.feedback-option-id')
        ?.value
        .trim();

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

  return { options };

}

function fillFeedbackAdminForm(module) {

  const enabled =
    document.getElementById(
      'feedback-admin-enabled'
    );

  const typeSelect =
    document.getElementById(
      'feedback-admin-type'
    );

  const questionInput =
    document.getElementById(
      'feedback-admin-question'
    );

  if (!enabled || !typeSelect || !questionInput) {
    return;
  }

  if (!module) {

    enabled.checked = false;
    typeSelect.value =
      window.siteConfig.feedback.types.yesMaybe;
    questionInput.value = '';
    renderFeedbackAdminPollOptions();
    toggleFeedbackAdminPollFields();
    return;

  }

  enabled.checked = true;
  typeSelect.value = module.type;
  questionInput.value = module.question || '';

  const config =
    normalizeFeedbackPollConfig(
      module.config
    );

  renderFeedbackAdminPollOptions(
    config.options
  );

  toggleFeedbackAdminPollFields();

}

function updateFeedbackAdminResultsLink() {

  const wrap =
    document.getElementById(
      'feedback-admin-results-link'
    );

  const anchor =
    document.getElementById(
      'feedback-admin-results-anchor'
    );

  if (
    !wrap
    || !anchor
  ) {
    return;
  }

  if (!feedbackAdminState.module?.id) {

    wrap.classList.add('hidden');

    return;

  }

  anchor.href =
    `/admin/feedback_results.html?module_id=${
      feedbackAdminState.module.id
    }`;

  wrap.classList.remove('hidden');

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

  updateFeedbackAdminResultsLink();

}

async function saveFeedbackAdminModule() {

  const enabled =
    document.getElementById(
      'feedback-admin-enabled'
    )?.checked;

  if (!enabled) {

    if (feedbackAdminState.module?.id) {

      const result =
        await deleteFeedbackModule(
          feedbackAdminState.module.id
        );

      if (result?.error) {
        alert(result.error.message);
        return;
      }

    }

    feedbackAdminState.module = null;

    updateFeedbackAdminResultsLink();

    alert('Feedback entfernt.');

    return;

  }

  const type =
    document.getElementById(
      'feedback-admin-type'
    )?.value;

  const question =
    document.getElementById(
      'feedback-admin-question'
    )?.value
      .trim();

  if (!question) {
    alert('Bitte eine Frage eingeben.');
    return;
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
      alert(configError);
      return;
    }

  }

  const payload = {
    type,
    entity_type:
      feedbackAdminState.entityType,
    entity_id:
      feedbackAdminState.entityId,
    question,
    config
  };

  const result =
    await saveFeedbackModule(payload);

  if (result?.error) {
    alert(result.error.message);
    return;
  }

  feedbackAdminState.module =
    result.data;

  updateFeedbackAdminResultsLink();

  alert('Feedback gespeichert.');

}

function bindFeedbackAdminEvents() {

  document
    .getElementById('feedback-admin-enabled')
    ?.addEventListener('change', toggleFeedbackAdminPollFields);

  document
    .getElementById('feedback-admin-type')
    ?.addEventListener('change', toggleFeedbackAdminPollFields);

  document
    .getElementById('feedback-admin-add-option')
    ?.addEventListener('click', () => {

      document
        .getElementById('feedback-admin-options')
        ?.appendChild(
          createFeedbackAdminOptionRow()
        );

    });

  document
    .getElementById('feedback-admin-save')
    ?.addEventListener('click', saveFeedbackAdminModule);

}

function mountFeedbackAdminForm(mountId) {

  const mount =
    document.getElementById(mountId);

  if (!mount) {
    return;
  }

  mount.innerHTML = `

<label class="admin-field admin-field--inline">

  <input
    id="feedback-admin-enabled"
    type="checkbox"
    class="checkbox">

  Feedback aktivieren

</label>

<label class="admin-field">
  Typ
  <select id="feedback-admin-type">

    <option value="yes_maybe">
      Ja / Vielleicht
    </option>

    <option value="yes_no_comment">
      Ja / Nein + Kommentar
    </option>

    <option value="poll">
      Umfrage
    </option>

  </select>
</label>

<label class="admin-field">
  Frage
  <input
    id="feedback-admin-question"
    type="text"
    placeholder="z. B. Wer fährt mit?">
</label>

<div
  id="feedback-admin-poll-wrap"
  class="hidden">

  <p class="admin-hint">
    Poll-Optionen: stabile ID (z. B. 18uhr) und Anzeige-Text getrennt.
  </p>

  <div
    id="feedback-admin-options"
    class="admin-feedback-options">

  </div>

  <button
    id="feedback-admin-add-option"
    type="button">

    Option hinzufügen

  </button>

</div>

<button
  id="feedback-admin-save"
  type="button">

  Feedback speichern

</button>

<p
  id="feedback-admin-results-link"
  class="admin-hint hidden">

  <a
    id="feedback-admin-results-anchor"
    href="#">

    Antworten anzeigen

  </a>

</p>

`;

  bindFeedbackAdminEvents();

  fillFeedbackAdminForm(null);

}

async function initFeedbackModuleForm(options) {

  const entityType =
    options?.entityType;

  const entityId =
    options?.entityId;

  const mountId =
    options?.mountId
    || 'feedback-admin-form-wrap';

  const hintId =
    options?.hintId
    || 'feedback-admin-hint';

  feedbackAdminState = {
    module: null,
    entityType,
    entityId
  };

  if (!entityId) {

    document
      .getElementById(hintId)
      ?.classList.remove('hidden');

    return;

  }

  document
    .getElementById(hintId)
    ?.classList.add('hidden');

  mountFeedbackAdminForm(mountId);

  await loadFeedbackAdminModule();

}
