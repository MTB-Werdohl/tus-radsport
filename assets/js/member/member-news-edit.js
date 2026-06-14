const memberNewsEditParams =
  new URLSearchParams(
    window.location.search
  );

const memberNewsEditId =
  memberNewsEditParams.get('id');

async function memberNewsAssertEditable(
  member
) {

  if (!memberNewsEditId) {
    return true;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select(
        'id, created_by, sichtbarkeit'
      )
      .eq('id', memberNewsEditId)
      .single();

  if (error || !data) {

    alert(
      'Internes konnte nicht geladen werden.'
    );

    window.location.href =
      '/profil/?tab=content';

    return false;

  }

  const draft =
    window.siteConfig.visibility.draft;

  if (
    data.created_by !== member.id
    || data.sichtbarkeit !== draft
  ) {

    alert(
      'Dieser Beitrag kann nicht mehr bearbeitet werden.'
    );

    window.location.href =
      '/profil/?tab=content';

    return false;

  }

  return true;

}

async function loadMemberNewsEdit() {

  if (!memberNewsEditId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'Internes bearbeiten';

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('id', memberNewsEditId)
      .single();

  if (error) {

    console.error(error);

    alert(
      'Internes konnte nicht geladen werden.'
    );

    return;

  }

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('content').value =
    data.content || '';

  if (data.image_storage_path) {

    applyMemberEditMediaSelection(
      'currentImage',
      'image',
      data.image_storage_path,
      'imageStoragePathPick'
    );

  }

}

async function saveMemberNewsEdit(
  member
) {

  const title =
    document
      .getElementById('title')
      .value
      .trim();

  if (!title) {

    alert('Bitte einen Titel eingeben.');

    return;

  }

  const content =
    document
      .getElementById('content')
      .value
      .trim();

  const excerpt =
    buildMemberNewsExcerpt(
      content,
      title
    );

  const slug =
    buildMemberContentSlug(title);

  let imageStoragePath =
    readMediaPickerHiddenPath(
      'imageStoragePathPick'
    );

  const pickedImage =
    resolveMediaPickerSelectionForSave(
      'imageStoragePathPick',
      imageStoragePath,
      null
    );

  imageStoragePath =
    pickedImage.storagePath;

  const payload = {

    title,
    slug,
    excerpt,
    content,
    published: false,
    sichtbarkeit:
      window.siteConfig.visibility.draft,
    created_by: member.id,
    updated_at:
      new Date().toISOString()

  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  let error;
  let savedId =
    memberNewsEditId
      ? parseInt(memberNewsEditId, 10)
      : null;

  if (memberNewsEditId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .update(payload)
        .eq('id', memberNewsEditId));

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

  const feedbackResult =
    await saveFeedbackAdminForEntity(
      window.siteConfig.feedback.entityTypes.news,
      savedId,
      { silent: true }
    );

  if (feedbackResult?.error) {

    alert(
      'Beitrag gespeichert, Umfrage fehlgeschlagen: '
      + feedbackResult.error.message
    );

    return;

  }

  if (window.memberEditUnsavedGuard) {
    window.memberEditUnsavedGuard.markClean();
  }

  window.location.href =
    '/profil/?tab=content';

}

async function initMemberNewsEditPage() {

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (
    !member
    || typeof isClubMember !== 'function'
    || !isClubMember(member)
  ) {

    window.location.href =
      '/profil/';

    return;

  }

  const editable =
    await memberNewsAssertEditable(
      member
    );

  if (!editable) {
    return;
  }

  if (
    typeof renderMemberEditMediaPreview
      === 'function'
  ) {
    renderAdminSelectedMediaPreview =
      renderMemberEditMediaPreview;
  }

  bindMediaPickerButton('pick-image-btn', {
    kind: 'image',
    hiddenInputId: 'imageStoragePathPick',
    previewContainerId: 'currentImage',
    title: 'Bild aus Mediathek',
    pickerMode: 'member'
  });

  window.memberEditUnsavedGuard =
    initMemberEditUnsavedGuard();

  await loadMemberNewsEdit();

  initFeedbackModuleForm({
    entityType:
      window.siteConfig.feedback.entityTypes.news,
    entityId:
      memberNewsEditId
        ? parseInt(memberNewsEditId, 10)
        : null,
    presentation: 'modal',
    triggerId: 'open-news-poll-config',
    summaryId: 'news-poll-config-summary',
    memberMode: true
  });

  document
    .getElementById('save-news')
    ?.addEventListener(
      'click',
      () => {
        void saveMemberNewsEdit(member);
      }
    );

}
