const memberInternEditParams =
  new URLSearchParams(
    window.location.search
  );

let memberInternEditIdOverride = null;

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

function clearMemberInternEditUrlId() {

  setMemberInternEditId(null);

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

function finishMemberInternEditorSave() {

  window.setTimeout(() => {

    window.location.href =
      typeof getInternUrl === 'function'
        ? getInternUrl()
        : '/intern/';

  }, 700);

  return true;

}

async function loadMemberInternEdit() {

  const editId =
    getMemberInternEditId();

  if (!editId) {
    memberInternResetForm();
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

  if (!validateMemberInternRequiredFields()) {
    return;
  }

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

  finishMemberInternEditorSave();

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
