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

const MEMBER_CONSENT_TEXTS = {

  kontakt: {
    label: 'Einwilligung Kontakt',
    body:
      'Ich willige ein, dass meine oben angegebenen Kontaktdaten durch die Abteilung zur '
      + 'Organisation des Trainings- und Wettkampfbetriebs, zur Weitergabe von Terminen und '
      + 'Informationen sowie zur internen Abstimmung innerhalb der Abteilung genutzt werden '
      + 'dürfen. Eine Weitergabe an Dritte außerhalb des Vereins erfolgt nicht.'
  },

  bilder: {
    label: 'Einwilligung Bilder',
    body:
      'Ich willige ein, dass Fotos und Videos meiner Person, die im Rahmen von Training, '
      + 'Wettkämpfen oder Vereinsveranstaltungen entstehen, für Zwecke der '
      + 'Öffentlichkeitsarbeit der Abteilung veröffentlicht werden dürfen (insbesondere auf der '
      + 'Vereinswebsite, in sozialen Medien sowie in Presseveröffentlichungen). '
      + 'Ich wurde darauf hingewiesen, dass Inhalte im Internet weltweit abrufbar sind und eine '
      + 'Weiterverwendung durch Dritte nicht ausgeschlossen werden kann.'
  }

};

const MEMBER_CONSENT_REVOKE_HINT =
  'Zum Widerruf genügt eine Mitteilung in Textform (z. B. per E-Mail) an den Verein '
  + '(Hinweis siehe unten).';

function renderConsentLabel(consentKey) {

  const info =
    MEMBER_CONSENT_TEXTS[consentKey];

  if (!info) {
    return '';
  }

  return `
    <span class="member-consent-tooltip">
      <strong class="member-consent-tooltip__label">
        ${escapeMemberHtml(info.label)}
      </strong>
      <button
        type="button"
        class="member-consent-tooltip__trigger"
        aria-label="Einwilligungstext und Widerruf anzeigen"
      >
        i
      </button>
      <span class="member-consent-tooltip__panel" role="tooltip">
        <span class="member-consent-tooltip__text">
          ${escapeMemberHtml(info.body)}
        </span>
        <span class="member-consent-tooltip__revoke">
          ${escapeMemberHtml(MEMBER_CONSENT_REVOKE_HINT)}
        </span>
      </span>
    </span>
  `;

}

function renderConsentBlock(
  granted,
  grantedDate,
  consentKey
) {

  const labelHtml =
    renderConsentLabel(consentKey);

  if (granted) {

    return `
      <div class="member-consent-row">
        <div class="member-consent-info">
          ${labelHtml}
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
        ${labelHtml}
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
        id="member-push-disable"
        class="member-push-btn member-push-btn--active member-push-btn--cancel"
      >
        Push abbestellen
      </button>
    `;

  }

  return `
    <button
      type="button"
      id="member-push-enable"
      class="member-push-btn member-push-btn--active"
    >
      Push bestellen
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
    member.einwilligung_kontakt,
    member.kontakt_eingewilligt_am,
    'kontakt'
  )}

  ${renderConsentBlock(
    member.einwilligung_bilder,
    member.bilder_eingewilligt_am,
    'bilder'
  )}

  <p class="member-consent-footnote">
    Die Einwilligungen sind freiwillig und können jederzeit mit Wirkung für die Zukunft
    widerrufen werden. Der Widerruf ist in Textform (z.&nbsp;B. per E-Mail) gegenüber dem Verein
    zu richten.
  </p>

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
