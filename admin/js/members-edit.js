const params =
  new URLSearchParams(
    window.location.search
  );

const editId =
  params.get('id');

let originalEmail = '';
let currentMember = null;

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
    member.geburtsdatum || '';

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

  if (!editId) {
    return;
  }

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

      alert(
        'Mitglied konnte nicht geladen werden: '
        + error.message
      );

      return;

    }

    if (!data) {

      alert(
        'Mitglied konnte nicht gefunden werden.'
      );

      return;

    }

    originalEmail =
      data.email || '';

    currentMember = data;

    fillMemberForm(data);
    showConsentInfo(data);

    document
      .getElementById('export-member-pdf')
      ?.classList.remove('hidden');

  } catch (error) {

    console.error(error);

    alert(
      'Mitglied konnte nicht geladen werden.'
    );

  }

}

function normalizeMemberId(value) {

  const trimmed =
    String(value || '').trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;

}

async function fetchMemberById(memberId) {

  return window.supabaseClient
    .from(window.siteConfig.tables.members)
    .select('*')
    .eq('id', memberId)
    .maybeSingle();

}

function buildMemberExportData() {

  const fields =
    readMemberFormFields();

  return {
    ...currentMember,
    ...buildMemberPayload(fields),
    einwilligung_kontakt:
      currentMember?.einwilligung_kontakt,
    kontakt_eingewilligt_am:
      currentMember?.kontakt_eingewilligt_am,
    einwilligung_bilder:
      currentMember?.einwilligung_bilder,
    bilder_eingewilligt_am:
      currentMember?.bilder_eingewilligt_am
  };

}

function exportCurrentMemberPdf() {

  if (!currentMember) {
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
      '/admin/js/member-pdf.js';

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

  const payload =
    buildMemberPayload(fields);

  let error;

  if (editId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.members)
        .update(payload)
        .eq('id', normalizeMemberId(editId)));

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

  const emailChanged =
    editId
    && normalizedEmail
    && normalizedEmail
      !== originalEmail.trim().toLowerCase();

  if (emailChanged) {

    alert(
      'E-Mail geändert. Das Mitglied muss sich mit der neuen Adresse neu anmelden.'
    );

  }

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markClean();
  }

  window.location.href =
    '/admin/mitglieder.html';

}

document
  .getElementById('save-member')
  ?.addEventListener('click', saveMember);

document
  .getElementById('export-member-pdf')
  ?.addEventListener('click', exportCurrentMemberPdf);
