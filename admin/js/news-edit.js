const params =
  new URLSearchParams(
    window.location.search
  );

const editId =
  params.get('id');

async function loadNews() {

  if (!editId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'News bearbeiten';

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('id', editId)
      .single();

  if (error) {

    console.error(error);

    return;

  }

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('slug').value =
    data.slug || '';

  document.getElementById('excerpt').value =
    data.excerpt || '';

  document.getElementById('content').value =
    data.content || '';

  document.getElementById('sichtbarkeit').value =
    data.sichtbarkeit
    || (
      data.published
        ? window.siteConfig.visibility.public
        : window.siteConfig.visibility.draft
    );

  if (data.image) {

    document
      .getElementById('currentImage')
      .innerHTML = `

        <p>Aktuelles Bild:</p>

        <img src="${safeMediaUrl(data.image)}"
             class="preview-image">

      `;

  }

}

async function saveNews() {

  const title =
    document
      .getElementById('title')
      .value;

  const slugInput =
    document
      .getElementById('slug')
      .value;

  const excerpt =
    document
      .getElementById('excerpt')
      .value;

  const content =
    document
      .getElementById('content')
      .value;

  const sichtbarkeit =
    document
      .getElementById('sichtbarkeit')
      .value;

  const published =
    publishedFromVisibility(sichtbarkeit);

  const imageFile =
    document
      .getElementById('imageFile')
      .files[0];

  const slug =
    slugInput && slugInput !== ''
      ? slugInput
      : title
          .toLowerCase()
          .replaceAll(' ', '-')
          .replace(/[^\w-]+/g, '');

  let image = null;

  if (editId) {

    const { data } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select('image')
        .eq('id', editId)
        .single();

    image =
      data?.image || null;

  }

  if (imageFile) {

    const imageName =
      Date.now() +
      '-' +
      imageFile.name;

    const { error } =
      await window.supabaseClient
        .storage
        .from(window.siteConfig.storage.media)
        .upload(
          imageName,
          imageFile
        );

    if (!error) {

      const {
        data: imageData
      } =
        window.supabaseClient
          .storage
          .from(window.siteConfig.storage.media)
          .getPublicUrl(imageName);

      image =
        imageData.publicUrl;

    }

  }

  const payload = {

    title,
    slug,
    excerpt,
    content,
    published,
    sichtbarkeit,
    updated_at:
      new Date().toISOString()

  };

  if (image) {
    payload.image = image;
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

  const feedbackResult =
    await saveFeedbackAdminForEntity(
      window.siteConfig.feedback.entityTypes.news,
      savedId,
      { silent: true }
    );

  if (feedbackResult?.error) {

    alert(
      'News gespeichert, Feedback fehlgeschlagen: '
      + feedbackResult.error.message
    );

    return;

  }

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markClean();
  }

  window.location.href =
    '/admin/';

}

document
  .getElementById('save-news')
  ?.addEventListener('click', saveNews);

async function initNewsEdit() {

  window.adminUnsavedGuard =
    initAdminUnsavedGuard({
      message:
        'Sicher, dass du ohne Speichern zurück willst?'
    });

  if (editId) {
    await loadNews();
  }

  initFeedbackModuleForm({
    entityType:
      window.siteConfig.feedback.entityTypes.news,
    entityId:
      editId
        ? parseInt(editId, 10)
        : null
  });

}
