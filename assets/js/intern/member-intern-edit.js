const memberInternEditParams =
  new URLSearchParams(
    window.location.search
  );

let memberInternEditIdOverride = null;
let memberInternSaveInProgress = false;

function getMemberInternEditId() {

  if (memberInternEditIdOverride) {
    return memberInternEditIdOverride;
  }

  return memberInternEditParams.get('id');

}

function setMemberInternEditId(
  id
) {

  memberInternEditIdOverride =
    id
      ? String(id)
      : null;

}

function renderMemberInternEditPanelShell() {

  return `
<section class="member-profile-section-block member-content-panel">

  <div class="member-content-edit-form member-content-edit-form--tab">

    <label class="member-edit-field member-edit-field--required">
      Titel
      <input id="intern-title"
             type="text"
             required
             placeholder="Titel">
    </label>

    <label class="member-edit-field">
      Sichtbarkeit
      <select id="intern-sichtbarkeit">

        <option value="draft">
          Entwurf (nur Vorstand)
        </option>

        <option value="members">
          Veröffentlicht (Mitglieder)
        </option>

      </select>
    </label>

    <label class="member-edit-field member-edit-field--required">
      Inhalt
      <textarea id="intern-content"
                rows="14"
                required
                placeholder="Markdown …"></textarea>
    </label>

    <label class="member-edit-field">
      Bild (optional)
      <input
        type="hidden"
        id="intern-image-path-pick">
      <div class="member-edit-media-actions">
        <button
          type="button"
          id="intern-pick-image"
          class="member-edit-btn member-edit-btn--secondary">

          Aus Mediathek

        </button>
      </div>
      <div id="intern-current-image"></div>
    </label>

    <div class="member-edit-poll-config member-intern-poll-config">

      <label
        class="member-verwaltung-checkbox-row"
        id="news-vorstand-poll-enabled-wrap">

        <input
          type="checkbox"
          id="news-vorstand-poll-enabled">

        <span>Poll aktiv</span>

      </label>

      <div id="feedback-admin-form-wrap"></div>

    </div>

    <button
      type="button"
      id="intern-save"
      class="member-edit-save">

      Speichern

    </button>

  </div>

</section>
  `.trim();

}

function isMemberInternEditorPage() {

  return document.body
    ?.classList
    .contains('member-intern-editor-page');

}

function isMemberInternPopupWindow() {

  return !!window.opener;

}

function memberInternResetForm() {

  const title =
    document.getElementById('intern-title');

  const content =
    document.getElementById('intern-content');

  const sichtbarkeit =
    document.getElementById('intern-sichtbarkeit');

  const imagePath =
    document.getElementById('intern-image-path-pick');

  if (title) {
    title.value = '';
  }

  if (content) {
    content.value = '';
  }

  if (sichtbarkeit) {
    sichtbarkeit.value =
      window.siteConfig.visibility.draft;
  }

  if (imagePath) {
    imagePath.value = '';
  }

  if (
    typeof renderMemberEditMediaPreview
      === 'function'
  ) {

    renderMemberEditMediaPreview(
      'intern-current-image',
      'image',
      null
    );

  }

}

function syncMemberInternEditUrlId(
  id
) {

  if (!id) {
    return;
  }

  setMemberInternEditId(id);

  if (
    !isMemberInternEditorPage()
    || isMemberInternPopupWindow()
  ) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  params.set(
    'id',
    String(id)
  );

  window.history.replaceState(
    null,
    '',
    `/intern-bearbeiten/?${params.toString()}`
  );

}

function clearMemberInternEditUrlId() {

  setMemberInternEditId(null);

  if (
    !isMemberInternEditorPage()
    || isMemberInternPopupWindow()
  ) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  params.delete('id');

  const query =
    params.toString();

  window.history.replaceState(
    null,
    '',
    query
      ? `/intern-bearbeiten/?${query}`
      : '/intern-bearbeiten/'
  );

}

function finishMemberInternEditorSave(
  savedMeta = {}
) {

  if (isMemberInternPopupWindow()) {

    try {

      if (
        !window.opener.closed
        && typeof window.opener
          .reloadAfterInternNewsSave
          === 'function'
      ) {

        void window.opener
          .reloadAfterInternNewsSave(
            savedMeta
          );

      }

    } catch (error) {

      console.error(error);

    }

    window.close();

    return true;

  }

  if (isMemberInternEditorPage()) {

    window.setTimeout(() => {

      const target =
        savedMeta?.slug
        && typeof getInternNewsUrl === 'function'
          ? getInternNewsUrl(savedMeta.slug)
          : (
            typeof getInternUrl === 'function'
              ? getInternUrl()
              : '/intern/'
          );

      window.location.href = target;

    }, 700);

    return true;

  }

  return false;

}

async function initMemberInternFeedbackForm(
  newsId
) {

  if (
    typeof initFeedbackModuleForm
      !== 'function'
  ) {
    return;
  }

  const entityId =
    newsId
      ? parseInt(newsId, 10)
      : null;

  await initFeedbackModuleForm({
    entityType:
      window.siteConfig.feedback.entityTypes.news,
    entityId,
    mountId:
      'feedback-admin-form-wrap',
    memberMode: true
  });

  const pollWrap =
    document.getElementById(
      'news-vorstand-poll-enabled-wrap'
    );

  const pollEnabled =
    document.getElementById(
      'news-vorstand-poll-enabled'
    );

  if (
    pollEnabled
    && pollWrap
    && pollWrap.dataset.bound
      !== 'true'
  ) {

    pollWrap.dataset.bound =
      'true';

    pollEnabled.addEventListener(
      'change',
      () => {

        syncPollEnabledControlsFromParent();

        toggleFeedbackAdminPollFields();

        updateMemberNewsPollEnabledVisibility(
          feedbackAdminState.module
        );

      }
    );

  }

  if (
    typeof syncPollEnabledControlsFromParent
      === 'function'
  ) {
    syncPollEnabledControlsFromParent();
  }

  if (
    typeof toggleFeedbackAdminPollFields
      === 'function'
  ) {
    toggleFeedbackAdminPollFields();
  }

  if (
    typeof syncMemberNewsPollEnabledControls
      === 'function'
  ) {

    syncMemberNewsPollEnabledControls(
      feedbackAdminState.module,
      { applyFromModule: true }
    );

  }

}

async function loadMemberInternEdit() {

  const editId =
    getMemberInternEditId();

  if (!editId) {
    memberInternResetForm();
    await initMemberInternFeedbackForm(null);
    return;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('id', editId)
      .maybeSingle();

  if (error) {

    console.error(error);

    alert(
      'Beitrag konnte nicht geladen werden.'
    );

    return;

  }

  if (!data) {

    alert('Beitrag nicht gefunden.');

    return;

  }

  document
    .getElementById('intern-title')
    .value =
      data.title || '';

  document
    .getElementById('intern-content')
    .value =
      data.content || '';

  document
    .getElementById('intern-sichtbarkeit')
    .value =
      data.sichtbarkeit
      === window.siteConfig.visibility.members
        ? window.siteConfig.visibility.members
        : window.siteConfig.visibility.draft;

  const imagePath =
    data.image_storage_path || '';

  document
    .getElementById('intern-image-path-pick')
    .value =
      imagePath;

  if (
    imagePath
    && typeof renderMemberEditMediaPreview
      === 'function'
  ) {

    renderMemberEditMediaPreview(
      'intern-current-image',
      'image',
      {
        storagePath: imagePath,
        publicUrl:
          typeof resolveMediaPublicUrl === 'function'
            ? resolveMediaPublicUrl(imagePath)
            : null
      }
    );

  }

  await initMemberInternFeedbackForm(
    editId
  );

}

function validateMemberInternRequiredFields() {

  const title =
    document
      .getElementById('intern-title')
      ?.value
      ?.trim();

  const content =
    document
      .getElementById('intern-content')
      ?.value
      ?.trim();

  if (!title) {

    alert('Bitte einen Titel eingeben.');

    return false;

  }

  if (!content) {

    alert('Bitte Inhalt eingeben.');

    return false;

  }

  return true;

}

async function saveMemberInternEdit(
  member
) {

  if (memberInternSaveInProgress) {
    return;
  }

  if (!validateMemberInternRequiredFields()) {
    return;
  }

  const saveButton =
    document.getElementById('intern-save');

  memberInternSaveInProgress = true;

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {

  const editId =
    getMemberInternEditId();

  const title =
    document
      .getElementById('intern-title')
      .value
      .trim();

  const content =
    document
      .getElementById('intern-content')
      .value
      .trim();

  const sichtbarkeit =
    document
      .getElementById('intern-sichtbarkeit')
      .value
    === window.siteConfig.visibility.members
      ? window.siteConfig.visibility.members
      : window.siteConfig.visibility.draft;

  const slug =
    await resolveUniqueNewsSlug(
      buildMemberContentSlug(title),
      editId
        ? parseInt(editId, 10)
        : null
    );

  const excerpt =
    buildMemberNewsExcerpt(
      content,
      title
    );

  const imageStoragePath =
    readMediaPickerHiddenPath(
      'intern-image-path-pick'
    );

  const payload = {
    title,
    content,
    excerpt,
    slug,
    sichtbarkeit,
    published:
      sichtbarkeit
      === window.siteConfig.visibility.members,
    created_by: member.id,
    updated_at: new Date().toISOString()
  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  let error;
  let savedId =
    editId
      ? parseInt(editId, 10)
      : null;

  if (editId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .update(payload)
        .eq('id', editId));

  } else {

    const { data: inserted, error: insertError } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .insert([payload])
        .select('id')
        .single();

    error = insertError;
    savedId = inserted?.id;

  }

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  syncMemberInternEditUrlId(savedId);

  if (
    typeof saveFeedbackAdminForEntity
      === 'function'
  ) {

    const feedbackResult =
      await saveFeedbackAdminForEntity(
        window.siteConfig.feedback.entityTypes.news,
        savedId,
        { silent: false }
      );

    if (feedbackResult?.error) {

      if (
        typeof invalidateInternNewsCache
          === 'function'
      ) {
        invalidateInternNewsCache();
      }

      alert(
        'Beitrag wurde gespeichert, aber die Umfrage '
        + 'konnte nicht gespeichert werden:\n\n'
        + (
          feedbackResult.error.message
          || 'Unbekannter Fehler'
        )
        + '\n\nBitte Poll-Einstellungen prüfen und erneut speichern.'
      );

      return;

    }

  }

  if (
    typeof invalidateInternNewsCache
      === 'function'
  ) {
    invalidateInternNewsCache();
  }

  if (window.memberEditUnsavedGuard) {
    window.memberEditUnsavedGuard.markClean();
  }

  clearMemberInternEditUrlId();
  memberInternResetForm();

  if (
    typeof showMemberToast === 'function'
  ) {

    showMemberToast(
      'Beitrag gespeichert.',
      'success',
      5000
    );

  }

  finishMemberInternEditorSave({
    id: savedId,
    slug
  });

  } finally {

    memberInternSaveInProgress = false;

    if (saveButton) {
      saveButton.disabled = false;
    }

  }

}

function bindMemberInternEditControls(
  member
) {

  if (
    typeof renderMemberEditMediaPreview
      === 'function'
  ) {
    renderAdminSelectedMediaPreview =
      renderMemberEditMediaPreview;
  }

  bindMediaPickerButton('intern-pick-image', {
    kind: 'image',
    hiddenInputId: 'intern-image-path-pick',
    previewContainerId: 'intern-current-image',
    title: 'Bild aus Mediathek',
    pickerMode: 'member'
  });

  window.memberEditUnsavedGuard =
    initMemberEditUnsavedGuard();

  const saveButton =
    document.getElementById('intern-save');

  if (
    saveButton
    && saveButton.dataset.bound
      !== 'true'
  ) {

    saveButton.dataset.bound = 'true';

    saveButton.addEventListener(
      'click',
      () => {
        void saveMemberInternEdit(member);
      }
    );

  }

}

async function initMemberInternEditPage() {

  const container =
    document.getElementById(
      'member-intern-editor'
    );

  if (!container) {
    return;
  }

  if (
    container.dataset.shellRendered
      !== 'true'
  ) {

    container.innerHTML =
      renderMemberInternEditPanelShell();

    container.dataset.shellRendered =
      'true';

  }

  const member =
    await ensureVorstandSession();

  if (!member) {
    return;
  }

  bindMemberInternEditControls(member);

  await loadMemberInternEdit();

}
