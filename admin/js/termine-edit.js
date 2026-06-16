const params =
  new URLSearchParams(window.location.search);

const editId =
  params.get('id');

async function saveTerminFeedbackModule(
  entityId
) {

  if (!entityId) {
    return { ok: true };
  }

  const sichtbarkeit =
    document.getElementById('sichtbarkeit')?.value
    || window.siteConfig.visibility.draft;

  const publicVoting =
    sichtbarkeit
    === window.siteConfig.visibility.public;

  const existing =
    await fetchFeedbackModule(
      window.siteConfig.feedback.entityTypes.event,
      entityId
    );

  const payload = {
    type:
      window.siteConfig.feedback.types.yesMaybe,
    entity_type:
      window.siteConfig.feedback.entityTypes.event,
    entity_id: entityId,
    question:
      getDefaultFeedbackQuestion(
        window.siteConfig.feedback.entityTypes.event
      ),
    config: existing?.config || {},
    public_voting: publicVoting,
    enabled: true
  };

  return saveFeedbackModule(payload);

}

function extractTerminTimeFromDate(value) {

  if (!value) {
    return '';
  }

  const text =
    String(value);

  if (text.length < 16) {
    return '';
  }

  const timePart =
    text.slice(11, 16);

  if (
    timePart === '00:00'
  ) {
    return '';
  }

  return timePart;

}

function combineTerminDateTime(
  dateOnly,
  time
) {

  if (!dateOnly) {
    return null;
  }

  const datePart =
    dateOnly.slice(0, 10);

  if (time) {
    return `${datePart}T${time}`;
  }

  return `${datePart}T00:00:00`;

}

async function loadEvent() {

  if (!editId) {
    return;
  }

  document.getElementById('form-title')
    .innerText =
      'Termin bearbeiten';

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('id', editId)
      .single();

  if (error) {
    console.error(error);
    alert(
      'Termin konnte nicht geladen werden.'
    );
    return;
  }

  if (data.created_by) {

    const creatorMap =
      await fetchAdminMembersByIds([
        data.created_by
      ]);

    showAdminContentCreatorHint(
      data.created_by,
      creatorMap
    );

  }

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('date').value =
    data.date
      ? data.date.substring(0, 10)
      : '';

  document.getElementById('endDate').value =
    data.endDate || '';

  document.getElementById('location').value =
    data.location || '';

  document.getElementById('startTime').value =
    data.startTime
    || extractTerminTimeFromDate(data.date)
    || '';

  populateTerminCategorySelect(
    document.getElementById('category'),
    data.category || ''
  );

  document.getElementById('komoot').value =
    data.komoot || '';

  document.getElementById('content').value =
    data.content || '';

  if (data.image) {

    const imageUrl =
      typeof resolveTerminImage === 'function'
        ? resolveTerminImage(data)
        : data.image;

    const pathHint =
      data.image_storage_path
        ? `
<p class="admin-media-path">
  Pfad: ${escapeAdminHtml(data.image_storage_path)}
</p>
        `
        : '';

    document.getElementById('currentImage')
      .innerHTML = `

      <p>Aktuelles Bild:</p>

      <img src="${safeMediaUrl(imageUrl)}"
           class="preview-image">

      ${pathHint}

    `;

  }

  if (data.gpx) {

    const gpxLabel =
      data.gpx_storage_path
        ? formatMediaFileLabel(
          data.gpx_storage_path
        )
        : data.gpx
          .split('/')
          .pop()
          .replace(/^[0-9]+-/, '');

    const pathHint =
      data.gpx_storage_path
        ? `
<p class="admin-media-path">
  Pfad: ${escapeAdminHtml(data.gpx_storage_path)}
</p>
        `
        : '';

    document.getElementById('currentGpx')
      .innerHTML = `

      <p>Aktuelle GPX:</p>

<div class="gpx-name">

  ${escapeAdminHtml(gpxLabel)}

</div>

      ${pathHint}

    `;

  }

  document.getElementById('sichtbarkeit').value =
    data.sichtbarkeit
    || window.siteConfig.visibility.draft;

}

function validateTerminDates(
  date,
  endDate
) {

  if (!date) {
    return true;
  }

  if (!endDate) {
    return true;
  }

  const startDay =
    parseTerminDateOnly(date);

  const endDay =
    parseTerminDateOnly(endDate);

  if (
    !startDay
    || !endDay
    || endDay < startDay
  ) {

    alert(
      'Das Enddatum muss am oder nach dem Start liegen.'
    );

    return false;

  }

  return true;

}

async function saveEvent() {

  const title =
    document.getElementById('title').value;

  const date =
    document.getElementById('date').value;

  const endDate =
    document.getElementById('endDate').value;

  const location =
    document.getElementById('location').value;

  const category =
    document.getElementById('category').value;

  const komoot =
    document.getElementById('komoot').value;

  const content =
    document.getElementById('content').value;

  const startTime =
    document.getElementById('startTime').value;

  const imageFile =
    document.getElementById('imageFile')
      .files[0];

  const gpxFile =
    document.getElementById('gpxFile')
      .files[0];

  const slug =
    buildAdminSlug(title);

  if (
    !validateTerminDates(
      date,
      endDate
    )
  ) {
    return;
  }

  let imageStoragePath = null;
  let gpxStoragePath = null;

  const sharedImagesFolder =
    window.MEDIA_STORAGE_FOLDERS?.sharedImages
    || 'shared/images';

  const sharedRoutesFolder =
    window.MEDIA_STORAGE_FOLDERS?.sharedRoutes
    || 'shared/routes';

  if (editId) {

    const { data } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select(
          'image,gpx,image_storage_path,gpx_storage_path'
        )
        .eq('id', editId)
        .single();

    imageStoragePath =
      data?.image_storage_path || null;
    gpxStoragePath =
      data?.gpx_storage_path || null;

  }

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
        + (upload.error.message || 'Unbekannter Fehler')
      );

    }

  } else {

    const pickedImage =
      resolveMediaPickerSelectionForSave(
        'imageStoragePathPick',
        imageStoragePath,
        null
      );

    imageStoragePath =
      pickedImage.storagePath;

  }

  if (gpxFile) {

    const upload =
      await uploadMediaStorageFile(
        sharedRoutesFolder,
        gpxFile
      );

    if (!upload.error) {

      gpxStoragePath =
        upload.storagePath;

    } else {

      alert(
        'GPX-Upload fehlgeschlagen: '
        + (upload.error.message || 'Unbekannter Fehler')
      );

    }

  } else {

    const pickedGpx =
      resolveMediaPickerSelectionForSave(
        'gpxStoragePathPick',
        gpxStoragePath,
        null
      );

    gpxStoragePath =
      pickedGpx.storagePath;

  }

  const payload = {

    title,

    date:
      combineTerminDateTime(
        date,
        startTime
      ),

    endDate:
      endDate || null,

    location,

    category,

    komoot,

    content,

    startTime:
      startTime || null,

    slug,

    sichtbarkeit:
      document
        .getElementById('sichtbarkeit')
        .value
      || window.siteConfig.visibility.draft

  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  if (gpxStoragePath) {
    payload.gpx_storage_path =
      gpxStoragePath;
  }

  const creator =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  if (creator?.id && !editId) {
    payload.created_by = creator.id;
  }

  let error;
  let savedId =
    editId
      ? parseInt(editId, 10)
      : null;

  if (editId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .update(payload)
        .eq('id', editId));

  } else {

    const { data: inserted, error: insertError } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
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
    await saveTerminFeedbackModule(
      savedId
    );

  if (feedbackResult?.error) {

    alert(
      'Termin gespeichert, Feedback fehlgeschlagen: '
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
  .getElementById('save-event')
  ?.addEventListener('click', saveEvent);

function initTerminEdit() {

  populateTerminCategorySelect(
    document.getElementById('category')
  );

  bindMediaPickerButton('pick-image-btn', {
    kind: 'image',
    hiddenInputId: 'imageStoragePathPick',
    previewContainerId: 'currentImage',
    fileInputId: 'imageFile',
    title: 'Bild aus Mediathek'
  });

  bindMediaPickerButton('pick-gpx-btn', {
    kind: 'gpx',
    hiddenInputId: 'gpxStoragePathPick',
    previewContainerId: 'currentGpx',
    fileInputId: 'gpxFile',
    title: 'GPX aus Mediathek'
  });

  window.adminUnsavedGuard =
    initAdminUnsavedGuard({
      message:
        'Sicher, dass du ohne Speichern zurück willst?'
    });

  loadEvent();

}
