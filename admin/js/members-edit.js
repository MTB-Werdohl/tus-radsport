const params =
  new URLSearchParams(
    window.location.search
  );

let originalEmail = '';
let editingMember = null;

function getEditMemberId() {

  const fromUrl =
    params.get('id');

  if (fromUrl) {
    return fromUrl;
  }

  return sessionStorage.getItem(
    'adminMemberEditId'
  );

}

function formatDateInputValue(value) {

  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);

}

function setMemberEditStatus(message, isError) {

  const el =
    document.getElementById(
      'member-edit-status'
    );

  if (!el) {
    return;
  }

  if (!message) {

    el.classList.add('hidden');
    el.textContent = '';
    el.classList.remove(
      'member-edit-status--error'
    );

    return;

  }

  el.classList.remove('hidden');
  el.textContent = message;
  el.classList.toggle(
    'member-edit-status--error',
    isError === true
  );

}

function showMemberEditForm() {

  document
    .getElementById('member-edit-loading')
    ?.classList.add('hidden');

  document
    .getElementById('member-edit-form')
    ?.classList.remove('hidden');

}

function emptyToNull(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  return String(value).trim();

}

function readMemberFormFields() {

  return {
    vorname:
      document.getElementById('vorname').value,
    nachname:
      document.getElementById('nachname').value,
    mitgliedsnummer:
      document.getElementById('mitgliedsnummer').value,
    abteilung:
      document.getElementById('abteilung').value,
    email:
      document.getElementById('email').value,
    strasse:
      document.getElementById('strasse').value,
    hausnummer:
      document.getElementById('hausnummer').value,
    plz:
      document.getElementById('plz').value,
    wohnort:
      document.getElementById('wohnort').value,
    geburtsdatum:
      document.getElementById('geburtsdatum').value,
    telefonnummer:
      document.getElementById('telefonnummer').value,
    rolle:
      document.getElementById('rolle').value
  };

}

function buildMemberPayload(fields) {

  const rolle =
    fields.rolle === 'Vorstand'
      ? 'Vorstand'
      : fields.rolle === 'public'
        ? 'public'
        : 'Mitglied';

  return {
    mitgliedsnummer: emptyToNull(fields.mitgliedsnummer),
    vorname: emptyToNull(fields.vorname),
    nachname: emptyToNull(fields.nachname),
    abteilung: emptyToNull(fields.abteilung),
    strasse: emptyToNull(fields.strasse),
    hausnummer: emptyToNull(fields.hausnummer),
    plz: emptyToNull(fields.plz),
    wohnort: emptyToNull(fields.wohnort),
    geburtsdatum: emptyToNull(fields.geburtsdatum),
    email: emptyToNull(fields.email)?.toLowerCase() || null,
    telefonnummer: emptyToNull(fields.telefonnummer),
    rolle
  };

}

function fillMemberForm(member) {

  document.getElementById('vorname').value =
    member.vorname || '';

  document.getElementById('nachname').value =
    member.nachname || '';

  document.getElementById('mitgliedsnummer').value =
    member.mitgliedsnummer || '';

  document.getElementById('abteilung').value =
    member.abteilung || '';

  document.getElementById('email').value =
    member.email || '';

  document.getElementById('strasse').value =
    member.strasse || '';

  document.getElementById('hausnummer').value =
    member.hausnummer || '';

  document.getElementById('plz').value =
    member.plz || '';

  document.getElementById('wohnort').value =
    member.wohnort || '';

  document.getElementById('geburtsdatum').value =
    formatDateInputValue(member.geburtsdatum);

  document.getElementById('telefonnummer').value =
    member.telefonnummer || '';

  document.getElementById('rolle').value =
    member.rolle || 'Mitglied';

}

function formatConsentLine(
  label,
  granted,
  date
) {

  if (granted) {

    const dateText =
      date
        ? ` (${date})`
        : '';

    return `${label}: Ja${dateText}`;

  }

  return `${label}: Nein`;

}

function showConsentInfo(member) {

  document
    .getElementById('consent-info')
    .classList.remove('hidden');

  document.getElementById('consent-kontakt').textContent =
    formatConsentLine(
      'Kontakt',
      member.einwilligung_kontakt === true,
      member.kontakt_eingewilligt_am
    );

  document.getElementById('consent-bilder').textContent =
    formatConsentLine(
      'Bilder',
      member.einwilligung_bilder === true,
      member.bilder_eingewilligt_am
    );

}

async function initMemberEdit() {

  window.adminUnsavedGuard =
    initAdminUnsavedGuard({
      message:
        'Sicher, dass du ohne Speichern zurück willst?'
    });

  const editId =
    getEditMemberId();

  if (!editId) {
    showMemberEditForm();
    return;
  }

  document
    .getElementById('member-edit-loading')
    ?.classList.remove('hidden');

  document
    .getElementById('member-edit-form')
    ?.classList.add('hidden');

  sessionStorage.setItem(
    'adminMemberEditId',
    String(editId)
  );

  document
    .getElementById('form-title')
    .innerText =
      'Mitglied bearbeiten';

  const memberId =
    normalizeMemberId(editId);

  try {

    const { data, error } =
      await fetchMemberById(memberId);

    if (error) {

      console.error(error);

      setMemberEditStatus(
        'Mitglied konnte nicht geladen werden: '
        + error.message,
        true
      );

      alert(
        'Mitglied konnte nicht geladen werden: '
        + error.message
      );

      showMemberEditForm();

      return;

    }

    if (!data) {

      setMemberEditStatus(
        'Mitglied konnte nicht gefunden werden.',
        true
      );

      alert(
        'Mitglied konnte nicht gefunden werden.'
      );

      showMemberEditForm();

      return;

    }

    if (data.anonymized_at) {

      setMemberEditStatus(
        'Dieses Mitglied wurde anonymisiert und kann nicht bearbeitet werden.',
        true
      );

      alert(
        'Dieses Mitglied wurde anonymisiert. '
        + 'Abstimmungen bleiben anonym gezählt.'
      );

      window.location.href =
        '/admin/mitglieder.html';

      return;

    }

    originalEmail =
      data.email || '';

    editingMember = data;

    fillMemberForm(data);
    showConsentInfo(data);

    const emailInput =
      document.getElementById('email');

    if (emailInput) {
      emailInput.readOnly = true;
    }

    document
      .getElementById('export-member-pdf')
      ?.classList.remove('hidden');

    setMemberEditStatus('', false);
    showMemberEditForm();

  } catch (error) {

    console.error(error);

    setMemberEditStatus(
      'Mitglied konnte nicht geladen werden.',
      true
    );

    alert(
      'Mitglied konnte nicht geladen werden.'
    );

    showMemberEditForm();

  }

}

async function fetchMemberById(memberId) {

  const table =
    window.siteConfig.tables.members;

  const idCandidates =
    buildMemberIdCandidates(memberId);

  for (const candidate of idCandidates) {

    const { data, error } =
      await window.supabaseClient
        .from(table)
        .select('*')
        .eq('id', candidate)
        .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    if (data) {
      return { data, error: null };
    }

  }

  const { data: allMembers, error: listError } =
    await window.supabaseClient
      .from(table)
      .select('*');

  if (listError) {
    return { data: null, error: listError };
  }

  const normalizedTarget =
    String(memberId).trim();

  const found =
    (allMembers || []).find((row) =>
      String(row.id).trim()
        === normalizedTarget
    ) || null;

  return {
    data: found,
    error: null
  };

}

function buildMemberIdCandidates(memberId) {

  const trimmed =
    String(memberId ?? '').trim();

  if (!trimmed) {
    return [];
  }

  const candidates = [trimmed];

  if (/^\d+$/.test(trimmed)) {

    const asNumber =
      Number(trimmed);

    if (
      !Number.isNaN(asNumber)
      && !candidates.includes(asNumber)
    ) {
      candidates.push(asNumber);
    }

  }

  return candidates;

}

function buildMemberExportData() {

  const fields =
    readMemberFormFields();

  return {
    ...editingMember,
    ...buildMemberPayload(fields),
    einwilligung_kontakt:
      editingMember?.einwilligung_kontakt,
    kontakt_eingewilligt_am:
      editingMember?.kontakt_eingewilligt_am,
    einwilligung_bilder:
      editingMember?.einwilligung_bilder,
    bilder_eingewilligt_am:
      editingMember?.bilder_eingewilligt_am
  };

}

function exportCurrentMemberPdf() {

  if (!editingMember) {
    return;
  }

  loadMemberPdfScripts()
    .then(() => {
      return exportMemberPdf(
        buildMemberExportData()
      );
    })
    .catch((error) => {

      console.error(error);

      alert(
        error.message
        || 'PDF konnte nicht erstellt werden.'
      );

    });

}

function loadMemberPdfScripts() {

  if (
    typeof exportMemberPdf === 'function'
    && typeof loadPdfMake === 'function'
  ) {
    return loadPdfMake();
  }

  return new Promise((resolve, reject) => {

    const script =
      document.createElement('script');

    script.src =
      '/admin/js/member-pdf.js'
      + '?v='
      + (window.siteConfig.adminJsVersion || '1');

    script.onload = () => {

      if (typeof loadPdfMake !== 'function') {

        reject(
          new Error(
            'PDF-Bibliothek konnte nicht geladen werden.'
          )
        );

        return;

      }

      loadPdfMake()
        .then(resolve)
        .catch(reject);

    };

    script.onerror = () => {

      reject(
        new Error(
          'PDF-Skript konnte nicht geladen werden.'
        )
      );

    };

    document.head.appendChild(script);

  });

}

async function saveMember() {

  const editId =
    getEditMemberId();

  const fields =
    readMemberFormFields();

  if (
    !fields.vorname?.trim()
    && !fields.nachname?.trim()
  ) {

    alert(
      'Bitte mindestens Vor- oder Nachname angeben.'
    );

    return;

  }

  const normalizedEmail =
    fields.email?.trim().toLowerCase() || '';

  if (
    !editId
    && !normalizedEmail
  ) {

    alert(
      'Bitte eine E-Mail angeben.'
    );

    return;

  }

  if (
    editId
    && normalizedEmail
    && originalEmail
    && normalizedEmail
      !== originalEmail.trim().toLowerCase()
  ) {

    alert(
      'Die E-Mail ist an den Login gebunden und kann hier nicht geändert werden. '
      + 'Bitte Vorstand/Admin kontaktieren, damit Mitgliedsdaten und Login-Adresse '
      + 'gemeinsam angepasst werden.'
    );

    return;

  }

  const payload =
    buildMemberPayload(fields);

  if (editId) {
    delete payload.email;
  }

  let error;

  if (editId) {

    const memberId =
      editingMember?.id
      ?? normalizeMemberId(editId);

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.members)
        .update(payload)
        .eq('id', memberId));

  } else {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.members)
        .insert([payload]));

  }

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markClean();
  }

  sessionStorage.removeItem(
    'adminMemberEditId'
  );

  window.location.href =
    '/admin/mitglieder.html';

}

document
  .getElementById('save-member')
  ?.addEventListener('click', saveMember);

document
  .getElementById('export-member-pdf')
  ?.addEventListener('click', exportCurrentMemberPdf);
