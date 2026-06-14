function escapeNewsVorstandHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function canShowNewsVorstandTools(member) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

function ensureNewsVorstandModal(
  id,
  title,
  dialogClass
) {

  let modal =
    document.getElementById(id);

  if (modal) {
    return modal;
  }

  modal =
    document.createElement('div');

  modal.id = id;
  modal.className = 'member-feedback-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
<div
  class="member-feedback-modal__backdrop"
  data-close-news-vorstand-modal="true">

</div>

<div
  class="member-feedback-modal__dialog ${dialogClass || ''}"
  role="dialog"
  aria-modal="true"
  aria-labelledby="${id}-title">

  <button
    type="button"
    class="member-feedback-modal__close"
    data-close-news-vorstand-modal="true"
    aria-label="Schließen">

    ×

  </button>

  <h2
    id="${id}-title"
    class="member-feedback-modal__title">

    ${escapeNewsVorstandHtml(title)}

  </h2>

  <div
    class="news-vorstand-modal__body"
    data-news-vorstand-modal-body>

  </div>

</div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelectorAll(
      '[data-close-news-vorstand-modal="true"]'
    )
    .forEach((el) => {

      el.addEventListener('click', () => {
        closeNewsVorstandModal(id);
      });

    });

  return modal;

}

function openNewsVorstandModal(
  id,
  title
) {

  const modal =
    ensureNewsVorstandModal(id, title);

  const titleEl =
    modal.querySelector(
      `#${id}-title`
    );

  if (titleEl) {
    titleEl.textContent = title;
  }

  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');

  document.body.classList.add(
    'member-feedback-modal-open'
  );

  const focusTarget =
    modal.querySelector(
      '[data-news-vorstand-modal-body] button, '
      + '[data-news-vorstand-modal-body] input, '
      + '[data-news-vorstand-modal-body] textarea, '
      + '[data-news-vorstand-modal-body] select'
    );

  if (focusTarget) {
    focusTarget.focus();
  }

}

function closeNewsVorstandModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  if (
    !document.querySelector(
      '.member-feedback-modal:not([hidden])'
    )
  ) {
    document.body.classList.remove(
      'member-feedback-modal-open'
    );
  }

}

function renderNewsVorstandToolbar(
  newsData,
  feedbackModule
) {

  const actions =
    document.getElementById(
      'news-vorstand-actions'
    );

  if (!actions) {
    return;
  }

  const resultsButton =
    feedbackModule?.id
      ? `
<button
  type="button"
  class="news-vorstand-btn"
  data-news-vorstand-results
  data-module-id="${feedbackModule.id}">

  Auswertung

</button>
`
      : '';

  actions.innerHTML = `
<div class="news-vorstand-actions__inner">

<button
  type="button"
  class="news-vorstand-btn"
  data-news-vorstand-edit
  data-news-id="${newsData.id}">

  Bearbeiten

</button>

${resultsButton}

</div>
  `;

  actions
    .querySelector('[data-news-vorstand-edit]')
    ?.addEventListener('click', () => {

      void openNewsEditModal(newsData.id);

    });

  actions
    .querySelector('[data-news-vorstand-results]')
    ?.addEventListener('click', (event) => {

      const moduleId =
        parseInt(
          event.currentTarget
            ?.dataset
            ?.moduleId,
          10
        );

      if (!moduleId) {
        return;
      }

      void openNewsFeedbackResultsModal(
        moduleId,
        newsData.title
      );

    });

}

function ensureNewsEditModal() {

  const id = 'news-vorstand-edit-modal';

  const modal =
    ensureNewsVorstandModal(
      id,
      'Internes bearbeiten',
      'member-feedback-modal__dialog--wide'
    );

  const body =
    modal.querySelector(
      '[data-news-vorstand-modal-body]'
    );

  if (body.dataset.initialized === 'true') {
    return modal;
  }

  body.dataset.initialized = 'true';

  body.innerHTML = `
<div class="news-vorstand-edit-form">

<label class="admin-field">
  Titel
  <input
    id="news-vorstand-title"
    type="text"
    placeholder="Titel">
</label>

<section class="admin-feedback-section">

  <h3>Feedback (optional)</h3>

  <div id="news-vorstand-feedback-wrap"></div>

</section>

<label class="admin-field">
  Kurztext
  <textarea
    id="news-vorstand-excerpt"
    rows="3"
    placeholder="Kurztext"></textarea>
</label>

<label class="admin-field">
  Inhalt
  <textarea
    id="news-vorstand-content"
    rows="8"
    placeholder="Inhalt"></textarea>
</label>

<label class="admin-field">
  Bild
  <input
    id="news-vorstand-image-file"
    type="file"
    accept="image/*">
  <input
    id="news-vorstand-image-path"
    type="hidden">
  <div class="admin-media-field-actions">
    <button
      id="news-vorstand-pick-image"
      type="button"
      class="secondary-button">

      Aus Mediathek

    </button>
  </div>
  <div id="news-vorstand-current-image"></div>
</label>

<label class="admin-field">
  Sichtbarkeit
  <select id="sichtbarkeit">

    <option value="draft">
      Entwurf (nur Vorstand)
    </option>

    <option value="members">
      Nur Mitglieder (Internes)
    </option>

  </select>
</label>

<div class="member-feedback-modal__actions">

  <button
    type="button"
    class="member-edit-btn member-edit-btn--secondary"
    data-close-news-vorstand-modal="true">

    Abbrechen

  </button>

  <button
    type="button"
    class="member-edit-btn"
    id="news-vorstand-save">

    Speichern

  </button>

</div>

</div>
  `;

  body
    .querySelectorAll(
      '[data-close-news-vorstand-modal="true"]'
    )
    .forEach((el) => {

      el.addEventListener('click', () => {
        closeNewsVorstandModal(id);
      });

    });

  if (
    typeof bindMediaPickerButton
      === 'function'
  ) {

    bindMediaPickerButton(
      'news-vorstand-pick-image',
      {
        kind: 'image',
        hiddenInputId:
          'news-vorstand-image-path',
        previewContainerId:
          'news-vorstand-current-image',
        fileInputId:
          'news-vorstand-image-file',
        title: 'Bild aus Mediathek'
      }
    );

  }

  document
    .getElementById('news-vorstand-save')
    ?.addEventListener('click', () => {
      void saveNewsFromVorstandModal();
    });

  return modal;

}

async function loadNewsIntoVorstandModal(
  newsId
) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('id', newsId)
      .single();

  if (error || !data) {

    alert(
      'Internes konnte nicht geladen werden.'
    );

    return null;

  }

  document
    .getElementById('news-vorstand-title')
    .value =
      data.title || '';

  document
    .getElementById('news-vorstand-excerpt')
    .value =
      data.excerpt || '';

  document
    .getElementById('news-vorstand-content')
    .value =
      data.content || '';

  document
    .getElementById('sichtbarkeit')
    .value =
      (
        data.sichtbarkeit
        === window.siteConfig.visibility.public
      )
        ? window.siteConfig.visibility.members
        : (
          data.sichtbarkeit
          || (
            data.published
              ? window.siteConfig.visibility.members
              : window.siteConfig.visibility.draft
          )
        );

  const preview =
    document.getElementById(
      'news-vorstand-current-image'
    );

  if (preview) {

    if (data.image) {

      const imageUrl =
        typeof resolveNewsImage === 'function'
          ? resolveNewsImage(data)
          : data.image;

      const pathHint =
        data.image_storage_path
          ? `
<p class="admin-media-path">
  Pfad: ${escapeNewsVorstandHtml(
    data.image_storage_path
  )}
</p>
          `
          : '';

      preview.innerHTML = `
<p>Aktuelles Bild:</p>
<img
  src="${typeof safeMediaUrl === 'function'
    ? safeMediaUrl(imageUrl)
    : escapeNewsVorstandHtml(imageUrl)}"
  class="preview-image">
${pathHint}
      `;

    } else {
      preview.innerHTML = '';
    }

  }

  const fileInput =
    document.getElementById(
      'news-vorstand-image-file'
    );

  if (fileInput) {
    fileInput.value = '';
  }

  const pathInput =
    document.getElementById(
      'news-vorstand-image-path'
    );

  if (pathInput) {
    pathInput.value = '';
  }

  ensureNewsEditModal().dataset.newsId =
    String(newsId);

  if (
    typeof initFeedbackModuleForm
      === 'function'
  ) {

    initFeedbackModuleForm({
      entityType:
        window.siteConfig.feedback.entityTypes.news,
      entityId: newsId,
      mountId:
        'news-vorstand-feedback-wrap'
    });

  }

  return data;

}

async function saveNewsFromVorstandModal() {

  const modal =
    ensureNewsEditModal();

  const editId =
    parseInt(
      modal.dataset.newsId,
      10
    );

  if (!editId) {
    return;
  }

  const title =
    document
      .getElementById('news-vorstand-title')
      ?.value
      ?.trim();

  if (!title) {
    alert('Bitte einen Titel eingeben.');
    return;
  }

  const excerpt =
    document
      .getElementById('news-vorstand-excerpt')
      ?.value
      || '';

  const content =
    document
      .getElementById('news-vorstand-content')
      ?.value
      || '';

  const sichtbarkeitRaw =
    document
      .getElementById('sichtbarkeit')
      ?.value;

  const sichtbarkeit =
    sichtbarkeitRaw
    === window.siteConfig.visibility.public
      ? window.siteConfig.visibility.members
      : sichtbarkeitRaw;

  const published =
    typeof publishedFromVisibility === 'function'
      ? publishedFromVisibility(sichtbarkeit)
      : sichtbarkeit
        !== window.siteConfig.visibility.draft;

  const imageFile =
    document
      .getElementById('news-vorstand-image-file')
      ?.files?.[0];

  const slug =
    typeof buildAdminSlug === 'function'
      ? buildAdminSlug(title)
      : title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

  let imageStoragePath = null;

  const sharedImagesFolder =
    window.MEDIA_STORAGE_FOLDERS?.sharedImages
    || 'shared/images';

  const { data: existing } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select(
        'image,image_storage_path'
      )
      .eq('id', editId)
      .single();

  imageStoragePath =
    existing?.image_storage_path || null;

  if (imageFile) {

    const upload =
      await uploadMediaStorageFile(
        sharedImagesFolder,
        imageFile
      );

    if (!upload.error) {
      imageStoragePath =
        upload.storagePath;
    } else {
      alert(
        'Bild-Upload fehlgeschlagen: '
        + (upload.error.message
          || 'Unbekannter Fehler')
      );
      return;
    }

  } else if (
    typeof resolveMediaPickerSelectionForSave
      === 'function'
  ) {

    const pickedImage =
      resolveMediaPickerSelectionForSave(
        'news-vorstand-image-path',
        imageStoragePath,
        null
      );

    imageStoragePath =
      pickedImage.storagePath;

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

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .update(payload)
      .eq('id', editId);

  if (error) {

    console.error(error);
    alert(error.message);
    return;

  }

  if (
    typeof saveFeedbackAdminForEntity
      === 'function'
  ) {

    const feedbackResult =
      await saveFeedbackAdminForEntity(
        window.siteConfig.feedback.entityTypes.news,
        editId,
        { silent: true }
      );

    if (feedbackResult?.error) {

      alert(
        'Internes gespeichert, Feedback fehlgeschlagen: '
        + feedbackResult.error.message
      );

      return;

    }

  }

  closeNewsVorstandModal(
    'news-vorstand-edit-modal'
  );

  window.location.reload();

}

async function openNewsEditModal(newsId) {

  ensureNewsEditModal();

  openNewsVorstandModal(
    'news-vorstand-edit-modal',
    'Internes bearbeiten'
  );

  const body =
    document.querySelector(
      '#news-vorstand-edit-modal [data-news-vorstand-modal-body]'
    );

  if (body) {
    body.classList.add('is-loading');
  }

  await loadNewsIntoVorstandModal(newsId);

  if (body) {
    body.classList.remove('is-loading');
  }

}

async function openNewsFeedbackResultsModal(
  moduleId,
  title
) {

  const modalId =
    'news-vorstand-results-modal';

  const modal =
    ensureNewsVorstandModal(
      modalId,
      title || 'Feedback Auswertung',
      'member-feedback-modal__dialog--results'
    );

  const body =
    modal.querySelector(
      '[data-news-vorstand-modal-body]'
    );

  if (!body) {
    return;
  }

  body.innerHTML = `
<p class="admin-hint">
  Auswertung wird geladen …
</p>
  `;

  openNewsVorstandModal(
    modalId,
    title || 'Feedback Auswertung'
  );

  if (
    typeof loadFeedbackResultsForModule
      !== 'function'
  ) {

    body.innerHTML = `
<p class="admin-hint admin-hint--error">
  Auswertung konnte nicht geladen werden.
</p>
    `;

    return;

  }

  await loadFeedbackResultsForModule(
    moduleId,
    body,
    {
      showSummary: false,
      showFreeTextList: false,
      showExport: false,
      compactTable: true
    }
  );

}

async function initNewsDetailVorstand(
  newsData,
  member
) {

  if (
    !newsData
    || !canShowNewsVorstandTools(member)
  ) {
    return;
  }

  const feedbackModule =
    await fetchFeedbackModule(
      window.siteConfig.feedback.entityTypes.news,
      newsData.id
    );

  renderNewsVorstandToolbar(
    newsData,
    feedbackModule
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    const newsRoot =
      document.getElementById('news');

    if (
      !newsRoot
      || !newsRoot.dataset.newsId
    ) {
      return;
    }

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    if (!canShowNewsVorstandTools(member)) {
      return;
    }

    void initNewsDetailVorstand(
      {
        id:
          parseInt(
            newsRoot.dataset.newsId,
            10
          ),
        title:
          newsRoot.dataset.newsTitle
          || ''
      },
      member
    );

  }
);
