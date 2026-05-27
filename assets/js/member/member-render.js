function escapeMemberHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatMemberField(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  return escapeMemberHtml(value);

}

function formatMemberBirthdate(value) {

  if (!value) {
    return '—';
  }

  return formatDateLong(value);

}

function renderMemberProfile(member) {

  const container =
    document.getElementById(
      'member-profile'
    );

  if (!container || !member) {
    return;
  }

  container.innerHTML = `

<dl class="member-profile-list">

  <div class="member-profile-row">
    <dt>Vorname</dt>
    <dd>${formatMemberField(member.vorname)}</dd>
  </div>

  <div class="member-profile-row">
    <dt>Nachname</dt>
    <dd>${formatMemberField(member.nachname)}</dd>
  </div>

  <div class="member-profile-row">
    <dt>Mitgliedsnummer</dt>
    <dd>${formatMemberField(member.mitgliedsnummer)}</dd>
  </div>

  <div class="member-profile-row">
    <dt>Abteilung</dt>
    <dd>${formatMemberField(member.abteilung)}</dd>
  </div>

  <div class="member-profile-row">
    <dt>Wohnort</dt>
    <dd>${formatMemberField(member.wohnort)}</dd>
  </div>

  <div class="member-profile-row">
    <dt>Geburtsdatum</dt>
    <dd>${formatMemberBirthdate(member.geburtsdatum)}</dd>
  </div>

</dl>

  `;

}

function renderMemberProfileError(message) {

  const container =
    document.getElementById(
      'member-profile'
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <p class="member-profile-error">
      ${escapeMemberHtml(message)}
    </p>
  `;

}

function renderMemberProfileLoading() {

  const container =
    document.getElementById(
      'member-profile'
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <p>Profil wird geladen …</p>
  `;

}
