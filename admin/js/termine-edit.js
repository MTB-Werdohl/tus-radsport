const params =
  new URLSearchParams(window.location.search);

const editId =
  params.get('id');

function toggleRecurring() {

  const recurring =
    document.getElementById('recurring')
      .checked;

  const recurringFields =
    document.getElementById('recurringFields');

  const singleFields =
    document.getElementById('singleFields');

  if (recurring) {

    recurringFields
      .classList.remove('hidden');

    singleFields
      .classList.add('hidden');

  } else {

    recurringFields
      .classList.add('hidden');

    singleFields
      .classList.remove('hidden');

  }

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
    return;
  }

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('date').value =
    data.date
      ? data.date.substring(0, 16)
      : '';

  document.getElementById('endDate').value =
    data.endDate || '';

  document.getElementById('location').value =
    data.location || '';

  document.getElementById('category').value =
    data.category || '';

  document.getElementById('komoot').value =
    data.komoot || '';

  document.getElementById('content').value =
    data.content || '';

  if (data.image) {

    document.getElementById('currentImage')
      .innerHTML = `

      <p>Aktuelles Bild:</p>

      <img src="${data.image}"
           class="preview-image">

    `;

  }

  if (data.gpx) {

    document.getElementById('currentGpx')
      .innerHTML = `

      <p>Aktuelle GPX:</p>

<div class="gpx-name">

  ${
    data.gpx
      .split('/')
      .pop()
      .replace(/^[0-9]+-/, '')
  }

</div>

    `;

  }

  document.getElementById('recurring').checked =
    data.recurring || false;

  document.getElementById('sichtbarkeit').value =
    data.sichtbarkeit
    || window.siteConfig.visibility.public;

  document.getElementById('startTime').value =
    data.startTime || '';

  document.getElementById('startRecur').value =
    data.startRecur || '';

  document.getElementById('endRecur').value =
    data.endRecur || '';

  document.getElementById('durationDays').value =
    data.durationDays
      && data.durationDays > 1
      ? data.durationDays
      : '';

  document.getElementById('daysOfWeek').value =
    data.daysOfWeek
      ? data.daysOfWeek[0]
      : '';

  document.getElementById('exclude').value =
    data.exclude
      ? JSON.stringify(data.exclude)
      : '';

  toggleRecurring();

}

function validateTerminDates(
  recurring,
  date,
  endDate,
  durationDays
) {

  if (recurring) {

    const parsedDuration =
      parseInt(durationDays, 10);

    if (
      durationDays
      && (
        !Number.isFinite(parsedDuration)
        || parsedDuration < 1
        || parsedDuration > 31
      )
    ) {

      alert(
        'Mehrtages-Dauer muss zwischen 1 und 31 liegen.'
      );

      return false;

    }

    return true;

  }

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

  const recurring =
    document.getElementById('recurring').checked;

  const startTime =
    document.getElementById('startTime').value;

  const startRecur =
    document.getElementById('startRecur').value;

  const endRecur =
    document.getElementById('endRecur').value;

  const durationDays =
    document.getElementById('durationDays').value;

  const daysOfWeek =
    document.getElementById('daysOfWeek').value;

  const exclude =
    document.getElementById('exclude').value;

  const imageFile =
    document.getElementById('imageFile')
      .files[0];

  const gpxFile =
    document.getElementById('gpxFile')
      .files[0];

  const slug =
    title
      .toLowerCase()
      .replaceAll(' ', '-');

  let parsedExclude = [];

  try {

    parsedExclude =
      exclude && exclude.trim() !== ''
        ? JSON.parse(exclude)
        : [];

  } catch {

    alert('Exclude JSON ungültig');

    return;

  }

  if (
    !validateTerminDates(
      recurring,
      date,
      endDate,
      durationDays
    )
  ) {
    return;
  }

  let image = null;
  let gpx = null;

  if (editId) {

    const { data } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select('image,gpx')
        .eq('id', editId)
        .single();

    image = data?.image || null;
    gpx = data?.gpx || null;

  }

  if (imageFile) {

    const imageName =
      Date.now() + '-' + imageFile.name;

    const { error } =
      await window.supabaseClient.storage
        .from(window.siteConfig.storage.media)
        .upload(imageName, imageFile);

    if (!error) {

      const {
        data:imageData
      } =
        window.supabaseClient.storage
          .from(window.siteConfig.storage.media)
          .getPublicUrl(imageName);

      image =
        imageData.publicUrl;

    }

  }

  if (gpxFile) {

    const gpxName =
      Date.now() + '-' + gpxFile.name;

    const { error } =
      await window.supabaseClient.storage
        .from(window.siteConfig.storage.media)
        .upload(gpxName, gpxFile);

    if (!error) {

      const {
        data:gpxData
      } =
        window.supabaseClient.storage
          .from(window.siteConfig.storage.media)
          .getPublicUrl(gpxName);

      gpx =
        gpxData.publicUrl;

    }

  }

  const parsedDuration =
    parseInt(durationDays, 10);

  const payload = {

    title,

    date:
      recurring
        ? null
        : date || null,

    endDate:
      recurring
        ? null
        : endDate || null,

    location,

    category,

    komoot,

    content,

    recurring,

    startTime:
      recurring
        ? startTime
        : null,

    startRecur:
      recurring
        ? startRecur || null
        : null,

    endRecur:
      recurring
        ? endRecur || null
        : null,

    durationDays:
      recurring
        && Number.isFinite(parsedDuration)
        && parsedDuration > 1
        ? parsedDuration
        : null,

    daysOfWeek:
      recurring && daysOfWeek
        ? [parseInt(daysOfWeek)]
        : null,

    exclude: parsedExclude,

    slug,

    sichtbarkeit:
      document
        .getElementById('sichtbarkeit')
        .value
      || window.siteConfig.visibility.public

  };

  if (image) {
    payload.image = image;
  }

  if (gpx) {
    payload.gpx = gpx;
  }

  let error;

  if (editId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .update(payload)
        .eq('id', editId));

  } else {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .insert([payload]));

  }

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  window.location.href =
    '/admin/termine.html';

}

document
  .getElementById('recurring')
  ?.addEventListener('change', toggleRecurring);

document
  .getElementById('save-event')
  ?.addEventListener('click', saveEvent);

function initTerminEdit() {

  toggleRecurring();

  loadEvent();

}
