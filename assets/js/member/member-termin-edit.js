const memberTerminEditParams =
  new URLSearchParams(
    window.location.search
  );

const memberTerminDefaultImagePath =
  'shared/images/1781467844219-gruppentour_1.webp';

let memberTerminEditIdOverride = null;
let memberTerminTabInitialized = false;

function getMemberTerminEditId() {

  if (memberTerminEditIdOverride) {
    return memberTerminEditIdOverride;
  }

  return memberTerminEditParams.get('id');

}

function setMemberTerminEditId(
  id
) {

  memberTerminEditIdOverride =
    id
      ? String(id)
      : null;

}

function getMemberTerminProfileUrl(
  id
) {

  const params =
    new URLSearchParams({
      tab: 'termin'
    });

  if (id) {
    params.set(
      'id',
      String(id)
    );
  }

  return `/profil/?${params.toString()}`;

}

function getMemberTerminEditorUrl(
  options = {}
) {

  const params =
    new URLSearchParams();

  if (options.id) {
    params.set(
      'id',
      String(options.id)
    );
  }

  const query =
    params.toString();

  return query
    ? `/termin-bearbeiten/?${query}`
    : '/termin-bearbeiten/';

}

function isMemberTerminEditorPage() {

  return document.body
    ?.classList
    .contains('member-termin-editor-page');

}

function isMemberTerminPopupWindow() {

  return !!window.opener;

}

function finishMemberTerminEditorSave() {

  if (isMemberTerminPopupWindow()) {

    try {

      if (
        !window.opener.closed
        && typeof window.opener
          .reloadAfterVorstandContentSave
          === 'function'
      ) {

        void window.opener
          .reloadAfterVorstandContentSave();

      }

    } catch (error) {

      console.error(error);

    }

    window.close();

    return true;

  }

  if (isMemberTerminEditorPage()) {

    window.setTimeout(() => {

      window.location.href =
        '/kalender/';

    }, 700);

    return true;

  }

  return false;

}

function clearMemberTerminEditUrlId() {

  setMemberTerminEditId(null);

  const params =
    new URLSearchParams(
      window.location.search
    );

  params.delete('id');

  if (isMemberTerminEditorPage()) {

    const query =
      params.toString();

    window.history.replaceState(
      null,
      '',
      query
        ? `/termin-bearbeiten/?${query}`
        : '/termin-bearbeiten/'
    );

    return;

  }

  if (!params.has('tab')) {
    params.set('tab', 'termin');
  }

  const query =
    params.toString();

  window.history.replaceState(
    null,
    '',
    query
      ? `/profil/?${query}`
      : '/profil/?tab=termin'
  );

}

async function saveMemberTerminFeedbackModule(
  entityId,
  sichtbarkeit
) {

  if (!entityId) {
    return { ok: true };
  }

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

async function attachMemberTerminCreatorParticipation(
  savedId,
  member,
  sichtbarkeit
) {

  if (!savedId || !member?.id) {
    return { ok: false };
  }

  let module =
    await fetchFeedbackModule(
      window.siteConfig.feedback.entityTypes.event,
      savedId
    );

  if (!module?.id) {

    const feedbackResult =
      await saveMemberTerminFeedbackModule(
        savedId,
        sichtbarkeit
      );

    if (feedbackResult?.error) {
      return {
        ok: false,
        error: feedbackResult.error
      };
    }

    module =
      feedbackResult?.data
      || await fetchFeedbackModule(
        window.siteConfig.feedback.entityTypes.event,
        savedId
      );

  }

  if (!module?.id) {
    return {
      ok: false,
      error: new Error(
        'Feedback-Modul fehlt.'
      )
    };
  }

  const yesAnswer =
    window.siteConfig.feedback.answers.yes;

  const result =
    await saveFeedbackAnswer(
      module.id,
      { memberId: member.id },
      yesAnswer,
      null,
      { eventCommitment: true }
    );

  if (result?.error) {
    return {
      ok: false,
      error: result.error
    };
  }

  return { ok: true };

}

function memberTerminIsVorstandUser(
  member
) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

function memberTerminExtractTimeFromDate(
  value
) {

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

  if (timePart === '00:00') {
    return '';
  }

  return timePart;

}

function memberTerminCombineDateTime(
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

function memberTerminResetForm() {

  document.getElementById('title').value = '';
  document.getElementById('date').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('startTime').value = '';
  document.getElementById('location').value = '';
  document.getElementById('komoot').value = '';
  document.getElementById('content').value = '';

  const imagePick =
    document.getElementById(
      'imageStoragePathPick'
    );

  if (imagePick) {
    imagePick.value = '';
  }

  const gpxPick =
    document.getElementById(
      'gpxStoragePathPick'
    );

  if (gpxPick) {
    gpxPick.value = '';
  }

  const currentImage =
    document.getElementById('currentImage');

  if (currentImage) {
    currentImage.innerHTML = '';
  }

  const currentGpx =
    document.getElementById('currentGpx');

  if (currentGpx) {
    currentGpx.innerHTML = '';
  }

  const sichtbarkeitSelect =
    document.getElementById(
      'member-termin-sichtbarkeit'
    );

  if (sichtbarkeitSelect) {
    sichtbarkeitSelect.value =
      window.siteConfig.visibility.draft;
  }

  const formTitle =
    document.getElementById('form-title');

  if (formTitle) {
    formTitle.innerText = 'Termin';
  }

}

async function memberTerminAssertEditable(
  member
) {

  const editId =
    getMemberTerminEditId();

  if (!editId) {
    return true;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select(
        'id, created_by, sichtbarkeit'
      )
      .eq('id', editId)
      .single();

  if (error || !data) {

    alert(
      'Termin konnte nicht geladen werden.'
    );

    window.location.href =
      isMemberTerminEditorPage()
        ? '/termin-bearbeiten/'
        : getMemberTerminProfileUrl();

    return false;

  }

  if (data.created_by !== member.id) {

    alert(
      'Dieser Termin kann nicht bearbeitet werden.'
    );

    window.location.href =
      isMemberTerminEditorPage()
        ? '/termin-bearbeiten/'
        : getMemberTerminProfileUrl();

    return false;

  }

  const draft =
    window.siteConfig.visibility.draft;

  if (
    !memberTerminIsVorstandUser(member)
    && data.sichtbarkeit !== draft
  ) {

    alert(
      'Dieser Termin kann nicht mehr bearbeitet werden.'
    );

    window.location.href =
      isMemberTerminEditorPage()
        ? '/termin-bearbeiten/'
        : getMemberTerminProfileUrl();

    return false;

  }

  return true;

}

async function loadMemberTerminEdit(
  member
) {

  const editId =
    getMemberTerminEditId();

  if (!editId) {

    memberTerminResetForm();

    return;

  }

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

  document
    .getElementById('form-title')
    .innerText =
      'Termin bearbeiten';

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
    || memberTerminExtractTimeFromDate(
      data.date
    );

  document.getElementById('komoot').value =
    data.komoot || '';

  document.getElementById('content').value =
    data.content || '';

  if (
    memberTerminIsVorstandUser(member)
  ) {

    const sichtbarkeitSelect =
      document.getElementById(
        'member-termin-sichtbarkeit'
      );

    if (sichtbarkeitSelect) {

      sichtbarkeitSelect.value =
        data.sichtbarkeit
        || window.siteConfig.visibility.draft;

    }

  }

  if (data.image_storage_path) {

    applyMemberEditMediaSelection(
      'currentImage',
      'image',
      data.image_storage_path,
      'imageStoragePathPick'
    );

  } else {

    document
      .getElementById('currentImage')
      .innerHTML = '';

  }

  if (data.gpx_storage_path) {

    applyMemberEditMediaSelection(
      'currentGpx',
      'gpx',
      data.gpx_storage_path,
      'gpxStoragePathPick'
    );

  } else {

    document
      .getElementById('currentGpx')
      .innerHTML = '';

  }

}

function memberTerminClearFieldErrors() {

  document
    .querySelectorAll(
      '.member-edit-field--invalid'
    )
    .forEach((element) => {
      element.classList.remove(
        'member-edit-field--invalid'
      );
    });

}

function validateMemberTerminRequiredFields() {

  memberTerminClearFieldErrors();

  const missing = [];

  const titleInput =
    document.getElementById('title');

  const dateInput =
    document.getElementById('date');

  const startTimeInput =
    document.getElementById('startTime');

  const locationInput =
    document.getElementById('location');

  const title =
    titleInput?.value.trim() || '';

  const date =
    dateInput?.value || '';

  const startTime =
    startTimeInput?.value || '';

  const location =
    locationInput?.value.trim() || '';

  if (!title) {
    missing.push('Titel');
    titleInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (!date) {
    missing.push('Datum');
    dateInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (!startTime) {
    missing.push('Uhrzeit');
    startTimeInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (!location) {
    missing.push('Ort');
    locationInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (missing.length) {

    alert(
      `Bitte ausfüllen: ${missing.join(', ')}`
    );

    const firstFieldId = {
      Titel: 'title',
      Datum: 'date',
      Uhrzeit: 'startTime',
      Ort: 'location'
    }[missing[0]];

    document
      .getElementById(firstFieldId)
      ?.focus();

    return false;

  }

  return true;

}

function validateMemberTerminEndDate(
  date,
  endDate
) {

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

    document
      .getElementById('endDate')
      ?.classList.add(
        'member-edit-field--invalid'
      );

    document
      .getElementById('endDate')
      ?.focus();

    return false;

  }

  return true;

}

function resolveMemberTerminSichtbarkeit(
  member
) {

  const draft =
    window.siteConfig.visibility.draft;

  if (
    !memberTerminIsVorstandUser(member)
  ) {
    return draft;
  }

  const raw =
    document
      .getElementById(
        'member-termin-sichtbarkeit'
      )
      ?.value
    || draft;

  if (
    raw === window.siteConfig.visibility.public
    || raw === window.siteConfig.visibility.members
  ) {
    return raw;
  }

  return draft;

}

async function saveMemberTerminEdit(
  member
) {

  if (!validateMemberTerminRequiredFields()) {
    return;
  }

  const editId =
    getMemberTerminEditId();

  const wasNewSave = !editId;

  const title =
    document
      .getElementById('title')
      .value
      .trim();

  const date =
    document
      .getElementById('date')
      .value;

  const startTime =
    document
      .getElementById('startTime')
      .value;

  const location =
    document
      .getElementById('location')
      .value
      .trim();

  const komoot =
    document
      .getElementById('komoot')
      .value
      .trim();

  const content =
    document
      .getElementById('content')
      .value
      .trim();

  const endDate =
    document
      .getElementById('endDate')
      ?.value
    || '';

  if (
    date
    && endDate
    && !validateMemberTerminEndDate(date, endDate)
  ) {
    return;
  }

  const slug =
    await resolveUniqueTerminSlug(
      buildMemberContentSlug(title),
      editId
        ? parseInt(editId, 10)
        : null
    );

  let imageStoragePath =
    readMediaPickerHiddenPath(
      'imageStoragePathPick'
    );

  let gpxStoragePath =
    readMediaPickerHiddenPath(
      'gpxStoragePathPick'
    );

  const pickedImage =
    resolveMediaPickerSelectionForSave(
      'imageStoragePathPick',
      imageStoragePath,
      null
    );

  imageStoragePath =
    pickedImage.storagePath;

  const pickedGpx =
    resolveMediaPickerSelectionForSave(
      'gpxStoragePathPick',
      gpxStoragePath,
      null
    );

  gpxStoragePath =
    pickedGpx.storagePath;

  if (!imageStoragePath) {
    imageStoragePath =
      memberTerminDefaultImagePath;
  }

  const sichtbarkeit =
    resolveMemberTerminSichtbarkeit(
      member
    );

  const payload = {

    title,

    date:
      memberTerminCombineDateTime(
        date,
        startTime
      ),

    endDate:
      endDate || null,

    location,

    komoot,

    content,

    startTime:
      startTime || null,

    slug,

    category: 'vereinsleben',

    sichtbarkeit,

    created_by: member.id

  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  if (gpxStoragePath) {
    payload.gpx_storage_path =
      gpxStoragePath;
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

  const participationResult =
    await attachMemberTerminCreatorParticipation(
      savedId,
      member,
      sichtbarkeit
    );

  if (
    participationResult?.error
  ) {

    console.error(
      participationResult.error
    );

  }

  if (window.memberEditUnsavedGuard) {
    window.memberEditUnsavedGuard.markClean();
  }

  clearMemberTerminEditUrlId();
  memberTerminResetForm();

  const toastMessage =
    wasNewSave
    && !memberTerminIsVorstandUser(member)
      ? 'Danke, dein Termin ist eingegangen und wird unmittelbar bearbeitet.'
      : 'Termin gespeichert.';

  if (
    typeof showMemberToast === 'function'
  ) {

    showMemberToast(
      toastMessage,
      'success',
      5000
    );

  }

  if (
    typeof loadMemberVotesIfNeeded
      === 'function'
  ) {

    void loadMemberVotesIfNeeded(true);

  }

  if (finishMemberTerminEditorSave()) {
    return;
  }

}

function bindMemberTerminEditControls(
  member
) {

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

  bindMediaPickerButton('pick-gpx-btn', {
    kind: 'gpx',
    hiddenInputId: 'gpxStoragePathPick',
    previewContainerId: 'currentGpx',
    title: 'GPX aus Mediathek',
    pickerMode: 'member'
  });

  window.memberEditUnsavedGuard =
    initMemberEditUnsavedGuard();

  const saveButton =
    document.getElementById('save-event');

  if (
    saveButton
    && saveButton.dataset.bound
      !== 'true'
  ) {

    saveButton.dataset.bound = 'true';

    saveButton.addEventListener(
      'click',
      () => {
        void saveMemberTerminEdit(member);
      }
    );

  }

}

async function initMemberTerminEditTab(
  member,
  options
) {

  if (
    !member
    || typeof isClubMember !== 'function'
    || !isClubMember(member)
  ) {
    return;
  }

  const terminId =
    options?.terminId
    || memberTerminEditParams.get('id')
    || null;

  setMemberTerminEditId(terminId);

  const editable =
    await memberTerminAssertEditable(
      member
    );

  if (!editable) {
    return;
  }

  bindMemberTerminEditControls(member);

  await loadMemberTerminEdit(member);

  memberTerminTabInitialized = true;

}

async function initMemberTerminEditPage() {

  const container =
    document.getElementById(
      'member-termin-editor'
    );

  if (!container) {
    return;
  }

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (
    !member
    || typeof isClubMember !== 'function'
    || !isClubMember(member)
  ) {

    const returnUrl =
      encodeURIComponent(
        window.location.pathname
        + window.location.search
      );

    window.location.href =
      `/profil/?next=${returnUrl}`;

    return;

  }

  if (
    container.dataset.shellRendered
      !== 'true'
  ) {

    container.innerHTML =
      renderMemberTerminEditPanelShell({
        isVorstand:
          memberTerminIsVorstandUser(
            member
          ),
        compact: true
      });

    container.dataset.shellRendered =
      'true';

  }

  await initMemberTerminEditTab(
    member,
    {
      terminId:
        memberTerminEditParams.get('id')
    }
  );

}
