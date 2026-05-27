const params =
  new URLSearchParams(
    window.location.search
  );

const editId =
  params.get('id');

let originalEmail = '';

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
      member.einwilligung_kontakt,
      member.kontakt_eingewilligt_am
    );

  document.getElementById('consent-bilder').textContent =
    formatConsentLine(
      'Bilder',
      member.einwilligung_bilder,
      member.bilder_eingewilligt_am
    );

}

async function initMemberEdit() {

  if (!editId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'Mitglied bearbeiten';

  let member;

  try {

    member =
      await fetchMemberByIdForAdmin(editId);

  } catch (error) {

    console.error(error);

    alert(
      'Mitglied konnte nicht geladen werden.'
    );

    return;

  }

  originalEmail =
    member.email || '';

  fillMemberForm(member);
  showConsentInfo(member);

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

  try {

    if (editId) {

      await updateMemberAdmin(
        editId,
        fields
      );

    } else {

      await createMemberAdmin(fields);

    }

  } catch (error) {

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

  window.location.href =
    '/admin/mitglieder.html';

}

document
  .getElementById('save-member')
  ?.addEventListener('click', saveMember);
