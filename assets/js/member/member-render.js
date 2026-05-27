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

function formatMemberBoolean(value) {

  return value === true ? 'Ja' : 'Nein';

}

function formatConsentDate(value) {

  if (!value) {
    return '';
  }

  return formatDateLong(value);

}

function renderConsentBlock(
  label,
  granted,
  grantedDate,
  consentKey
) {

  if (granted) {

    return `
      <div class="member-consent-row">
        <div class="member-consent-info">
          <strong>${escapeMemberHtml(label)}</strong>
          <span class="member-consent-status member-consent-status--yes">
            Erteilt am ${formatConsentDate(grantedDate)}
          </span>
        </div>
        <button
          type="button"
          class="member-consent-btn"
          disabled
        >
          Einwilligen
        </button>
      </div>
    `;

  }

  return `
    <div class="member-consent-row">
      <div class="member-consent-info">
        <strong>${escapeMemberHtml(label)}</strong>
        <span class="member-consent-status member-consent-status--no">
          Noch nicht erteilt
        </span>
      </div>
      <button
        type="button"
        class="member-consent-btn member-consent-btn--active"
        data-consent="${consentKey}"
      >
        Einwilligen
      </button>
    </div>
  `;

}

function renderMemberPushSection(pushState) {

  if (!pushState?.supported) {

    return `
      <p class="member-push-unsupported">
        Push-Mitteilungen werden in diesem Browser nicht unterstützt.
      </p>
    `;

  }

  if (pushState.active) {

    return `
      <p class="member-push-status member-push-status--yes">
        ✓ Push aktiviert
      </p>

      <dl class="member-profile-list member-push-details">

        <div class="member-profile-row">
          <dt>Gerät</dt>
          <dd>${formatMemberField(pushState.device_name)}</dd>
        </div>

        <div class="member-profile-row">
          <dt>Registriert</dt>
          <dd>${formatMemberPushDate(pushState.created_at)}</dd>
        </div>

      </dl>

      <button
        type="button"
        class="member-push-btn"
        disabled
      >
        Push-Mitteilungen aktivieren
      </button>
    `;

  }

  return `
    <button
      type="button"
      id="member-push-enable"
      class="member-push-btn member-push-btn--active"
    >
      Push-Mitteilungen aktivieren
    </button>
  `;

}

function formatMemberPushDate(value) {

  if (!value) {
    return '—';
  }

  return formatDateLong(value);

}

function renderMemberProfile(
  member,
  pushState = {}
) {

  const container =
    document.getElementById(
      'member-profile'
    );

  if (!container || !member) {
    return;
  }

  container.innerHTML = `

<section class="member-profile-section-block">

  <h2>Stammdaten</h2>

  <dl class="member-profile-list">

    <div class="member-profile-row">
      <dt>Mitgliedsnummer</dt>
      <dd>${formatMemberField(member.mitgliedsnummer)}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Vorname</dt>
      <dd>${formatMemberField(member.vorname)}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Nachname</dt>
      <dd>${formatMemberField(member.nachname)}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Abteilung</dt>
      <dd>${formatMemberField(member.abteilung)}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Geburtsdatum</dt>
      <dd>${formatMemberBirthdate(member.geburtsdatum)}</dd>
    </div>

    <div class="member-profile-row">
      <dt>E-Mail</dt>
      <dd>${formatMemberField(member.email)}</dd>
    </div>

  </dl>

</section>

<section class="member-profile-section-block">

  <h2>Kontaktdaten bearbeiten</h2>

  <form id="member-edit-form" class="member-edit-form">

    <label>
      Straße
      <input type="text" name="strasse" value="${escapeMemberHtml(member.strasse)}">
    </label>

    <label>
      Hausnummer
      <input type="text" name="hausnummer" value="${escapeMemberHtml(member.hausnummer)}">
    </label>

    <label>
      PLZ
      <input type="text" name="plz" value="${escapeMemberHtml(member.plz)}">
    </label>

    <label>
      Wohnort
      <input type="text" name="wohnort" value="${escapeMemberHtml(member.wohnort)}">
    </label>

    <label>
      Telefonnummer
      <input type="tel" name="telefonnummer" value="${escapeMemberHtml(member.telefonnummer)}">
    </label>

    <button type="submit" class="member-save-btn">
      Änderungen speichern
    </button>

    <p id="member-save-status" class="member-save-status" hidden></p>

  </form>

</section>

<section class="member-profile-section-block">

  <h2>Datenschutz-Einwilligungen</h2>

  ${renderConsentBlock(
    'Einwilligung Kontakt',
    member.einwilligung_kontakt,
    member.kontakt_eingewilligt_am,
    'kontakt'
  )}

  ${renderConsentBlock(
    'Einwilligung Bilder',
    member.einwilligung_bilder,
    member.bilder_eingewilligt_am,
    'bilder'
  )}

</section>

<section class="member-profile-section-block">

  <h2>Push-Mitteilungen</h2>

  ${renderMemberPushSection(pushState)}

</section>

<section class="member-profile-section-block member-profile-actions">

  <button type="button" id="member-logout-btn" class="member-logout-btn">
    Logout
  </button>

</section>

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
