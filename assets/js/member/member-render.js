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

function consentRevokedBeforeGrant(
  grantedDate,
  revokedDate
) {

  if (
    !grantedDate
    || !revokedDate
  ) {
    return false;
  }

  return (
    String(revokedDate).slice(0, 10)
    < String(grantedDate).slice(0, 10)
  );

}

function buildConsentStatusLines(
  granted,
  grantedDate,
  revokedDate
) {

  if (granted) {

    const lines = [
      `Erteilt am ${formatConsentDate(grantedDate)}`
    ];

    if (
      consentRevokedBeforeGrant(
        grantedDate,
        revokedDate
      )
    ) {

      lines.push(
        `Zuvor widerrufen am ${formatConsentDate(revokedDate)}`
      );

    }

    return lines;

  }

  if (revokedDate) {
    return [
      `Widerrufen am ${formatConsentDate(revokedDate)}`
    ];
  }

  return ['Noch nicht erteilt'];

}

const MEMBER_CONSENT_TEXTS = {

  kontakt: {
    label: 'Einwilligung Kontakt',
    body:
      'Ich willige ein, dass meine oben angegebenen Kontaktdaten durch die Abteilung zur '
      + 'Organisation des Ausfahrts- und Wettkampfbetriebs, zur Weitergabe von Terminen und '
      + 'Informationen sowie zur internen Abstimmung innerhalb der Abteilung genutzt werden '
      + 'dürfen. Eine Weitergabe an Dritte außerhalb des Vereins erfolgt nicht.'
  },

  bilder: {
    label: 'Einwilligung Bilder (Tourfotos & Aktivitätsbilder)',
    body:
      'Ich willige ein, dass Fotos und Videos meiner Person, die im Rahmen von Ausfahrten, '
      + 'Wettkämpfen oder Vereinsveranstaltungen entstehen, für Zwecke der '
      + 'Öffentlichkeitsarbeit der Abteilung veröffentlicht werden dürfen (insbesondere auf der '
      + 'Vereinswebsite, in sozialen Medien sowie in Presseveröffentlichungen). '
      + 'Diese Einwilligung gilt nicht für mein freiwilliges Profilbild im Mitgliederbereich. '
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
        data-consent-dialog="${consentKey}"
        aria-haspopup="dialog"
        aria-controls="member-consent-dialog-${consentKey}"
        aria-label="Einwilligungstext anzeigen"
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

function renderConsentDialogs() {

  return Object
    .entries(MEMBER_CONSENT_TEXTS)
    .map(([key, info]) => `

      <div
        class="member-consent-modal"
        id="member-consent-dialog-${key}"
        hidden
      >

        <button
          type="button"
          class="member-consent-modal__backdrop"
          aria-label="Schließen"
        ></button>

        <div
          class="member-consent-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-consent-dialog-title-${key}"
        >

          <div class="member-consent-dialog__inner">

            <header class="member-consent-dialog__header">

              <h3
                class="member-consent-dialog__title"
                id="member-consent-dialog-title-${key}"
              >
                ${escapeMemberHtml(info.label)}
              </h3>

              <button
                type="button"
                class="member-consent-dialog__close"
                aria-label="Schließen"
              >
                ×
              </button>

            </header>

            <div class="member-consent-dialog__body">

              <p>${escapeMemberHtml(info.body)}</p>

              <p class="member-consent-dialog__revoke">
                ${escapeMemberHtml(MEMBER_CONSENT_REVOKE_HINT)}
              </p>

            </div>

            <footer class="member-consent-dialog__footer">

              <button
                type="button"
                class="member-consent-dialog__close-btn"
              >
                Schließen
              </button>

            </footer>

          </div>

        </div>

      </div>

    `)
    .join('');

}

function renderConsentBlock(
  granted,
  grantedDate,
  revokedDate,
  consentKey
) {

  const labelHtml =
    renderConsentLabel(consentKey);

  const statusLines =
    buildConsentStatusLines(
      granted,
      grantedDate,
      revokedDate
    );

  const statusClass =
    granted
      ? 'member-consent-status--yes'
      : revokedDate
        ? 'member-consent-status--revoked'
        : 'member-consent-status--no';

  const statusHtml =
    statusLines
      .map((line) => `
          <span class="member-consent-status ${statusClass}">
            ${escapeMemberHtml(line)}
          </span>
        `.trim())
      .join('');

  if (granted) {

    return `
      <div class="member-consent-row">
        <div class="member-consent-info">
          ${labelHtml}
          ${statusHtml}
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
        ${statusHtml}
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

function shouldShowMemberActivitiesTab(
  stravaState
) {

  return !!(
    stravaState?.available
    && stravaState?.status?.connected
  );

}

function resolveMemberProfileActiveTab(
  activeTab,
  stravaState
) {

  if (
    activeTab === 'aktivitaeten'
    && !shouldShowMemberActivitiesTab(stravaState)
  ) {
    return 'profil';
  }

  return activeTab || 'profil';

}

function renderMemberProfileTabsNav(
  activeTab,
  stravaState
) {

  const tabs = [
    {
      id: 'profil',
      label: 'Profil'
    },
    {
      id: 'content',
      label: 'Content'
    },
    {
      id: 'abstimmungen',
      label: 'Teilnahmen'
    },
    {
      id: 'aktivitaeten',
      label: 'Meine Aktivitäten'
    },
    {
      id: 'strava',
      label: 'Strava'
    }
  ];

  const visibleTabs =
    tabs.filter((tab) =>
      tab.id !== 'aktivitaeten'
      || shouldShowMemberActivitiesTab(stravaState)
    );

  const buttons =
    visibleTabs.map((tab) => {

      const isActive =
        activeTab === tab.id;

      return `
  <button
    type="button"
    class="member-profile-tab${isActive ? ' is-active' : ''}"
    role="tab"
    id="member-profile-tab-btn-${tab.id}"
    aria-selected="${isActive ? 'true' : 'false'}"
    aria-controls="member-profile-tab-${tab.id}"
    data-profile-tab="${tab.id}">

    ${tab.label}

  </button>
      `;

    }).join('');

  return `
<nav
  class="member-profile-tabs"
  role="tablist"
  aria-label="Profilbereiche">

  ${buttons}

</nav>
  `;

}

function renderMemberVotesPanelShell() {

  return `
<section class="member-profile-section-block">

  <h2>Teilnahmen</h2>

  <div
    id="member-votes-list"
    class="member-votes-list">

    <p>Teilnahmen werden geladen …</p>

  </div>

</section>
  `;

}

function renderMemberActivitiesPanelShell() {

  return `
<section class="member-profile-section-block">

  <h2>Meine Aktivitäten</h2>

  <div id="member-activities-list">
    <p>Aktivitäten werden geladen …</p>
  </div>

</section>
  `;

}

function renderMemberActivitiesList(
  container,
  payload,
  member
) {

  if (!container) {
    return;
  }

  const activities =
    payload?.activities || [];

  if (!activities.length) {

    container.innerHTML = `
<p class="member-strava-hint">
  Noch keine Aktivitäten importiert. Neue Touren erscheinen nach dem
  nächsten Strava-Sync automatisch hier.
</p>
    `;

    return;

  }

  const memberName =
    [
      member?.vorname,
      member?.nachname
    ].filter(Boolean).join(' ')
    || member?.member_name
    || 'Mitglied';

  const avatarHtml =
    typeof renderMemberAvatarHtml === 'function'
      ? renderMemberAvatarHtml(
        member,
        'member-avatar--md'
      )
      : '';

  const cards =
    activities.map((activity) => {

      const inPublicFeed =
        activity.in_public_feed === true;

      const badge =
        inPublicFeed
          ? `<span class="member-activity-badge member-activity-badge--public">
              Im Feed sichtbar
            </span>`
          : `<span class="member-activity-badge member-activity-badge--private">
              Privat
            </span>`;

      const url =
        inPublicFeed
        && typeof getActivityUrl === 'function'
          ? getActivityUrl(activity.id)
          : null;

      return renderActivityCardHtml(
        activity,
        {
          memberName,
          avatarHtml,
          avatarEntry: member,
          badgeHtml: ` ${badge}`,
          extraClass: 'member-activity-card',
          url,
          escapeHtml: escapeMemberHtml
        }
      );

    }).join('');

  const feedHint =
    payload?.publishFeed
      ? ''
      : `<p class="member-strava-hint member-activity-feed-hint">
          Feed-Freigabe ist aus — alle Touren bleiben privat, auch wenn
          Strava verbunden ist.
        </p>`;

  container.innerHTML = `
${feedHint}
<div class="member-activities-list">
  ${cards}
</div>
  `;

  refreshActivityMaps(container);

}

function renderMemberAvatarProfileBlock(
  member
) {

  const preview =
    renderMemberAvatarHtml(
      member,
      'member-avatar--lg'
    );

  const hasAvatar =
    !!member?.avatar_storage_path;

  return `
<section class="member-profile-section-block member-profile-avatar-block">

  <h2>Profilbild</h2>

  <div class="member-profile-avatar-row">

    ${preview}

    <div class="member-profile-avatar-actions">

      <button
        type="button"
        id="member-avatar-toggle-btn"
        class="member-avatar-toggle-btn${hasAvatar ? ' is-active' : ''}"
        aria-pressed="${hasAvatar ? 'true' : 'false'}">

        ${hasAvatar ? 'Profilbild entfernen' : 'Profilbild hochladen'}

      </button>

      <input
        type="file"
        id="member-avatar-file"
        class="member-avatar-file-input"
        accept="image/jpeg,image/png,image/webp"
        hidden>

      <p
        id="member-avatar-status"
        class="member-save-status"
        hidden></p>

    </div>

  </div>

</section>
  `;

}

function renderMemberConsentSection(
  member
) {

  return `
<section class="member-profile-section-block">

  <h2>Datenschutz-Einwilligungen</h2>

  ${renderConsentBlock(
    member.einwilligung_kontakt,
    member.kontakt_eingewilligt_am,
    member.kontakt_widerrufen_am,
    'kontakt'
  )}

  ${renderConsentBlock(
    member.einwilligung_bilder,
    member.bilder_eingewilligt_am,
    member.bilder_widerrufen_am,
    'bilder'
  )}

  <p class="member-consent-footnote">
    Die Einwilligungen sind freiwillig und können jederzeit mit Wirkung für die Zukunft
    widerrufen werden. Der Widerruf ist in Textform (z.&nbsp;B. per E-Mail) gegenüber dem Verein
    zu richten.
  </p>

  ${renderConsentDialogs()}

</section>
  `.trim();

}

function renderClubMemberProfilContent(
  member
) {

  return `

${renderMemberAvatarProfileBlock(member)}

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

${renderMemberConsentSection(member)}

<section class="member-profile-section-block member-profile-actions">

  <button type="button" id="member-logout-btn" class="member-logout-btn">
    Logout
  </button>

</section>

  `;

}

function renderStravaProfilePanel(
  stravaState
) {

  if (
    !stravaState?.available
  ) {

    const message =
      stravaState?.error?.message
      || 'Strava ist derzeit nicht verfügbar.';

    return `
<section class="member-profile-section-block">

  <h2>Strava</h2>

  <p class="member-strava-hint member-strava-hint--error">
    ${escapeMemberHtml(message)}
  </p>

</section>
    `;

  }

  const status =
    stravaState.status || {};

  if (!status.connected) {

    return `
<section class="member-profile-section-block">

  <h2>Strava verbinden</h2>

  <p class="member-strava-hint">
    Strava verbinden — Touren werden automatisch importiert. Sichtbarkeit
    (Feed, Rankings, Vereinsziele) stellst du unten ein.
  </p>

  <button
    type="button"
    id="strava-connect-btn"
    class="member-save-btn member-strava-connect-btn">

    Mit Strava verbinden

  </button>

</section>
    `;

  }

  const needsRetry =
    stravaNeedsRetry(status);

  const statusLabel =
    formatStravaStatusLabel(status);

  const statusClass =
    status.syncStatus === 'active'
      ? 'member-strava-status--active'
      : (
        status.syncStatus === 'error'
          ? 'member-strava-status--error'
          : 'member-strava-status--pending'
      );

  const activityCount =
    Number(status.importedActivityCount) || 0;

  return `
<section class="member-profile-section-block">

  <h2>Strava verbunden</h2>

  <dl class="member-profile-list">

    <div class="member-profile-row">
      <dt>Verbunden seit</dt>
      <dd>${escapeMemberHtml(formatStravaDateTime(status.connectedAt))}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Letzte Synchronisierung</dt>
      <dd>${escapeMemberHtml(formatStravaDateTime(status.lastSyncAt))}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Importierte Aktivitäten</dt>
      <dd>${escapeMemberHtml(String(activityCount))}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Status</dt>
      <dd class="member-strava-status ${statusClass}">
        ${escapeMemberHtml(statusLabel)}
      </dd>
    </div>

  </dl>

  ${
    status.syncErrorMessage
    && status.syncStatus === 'error'
      ? `<p class="member-strava-hint member-strava-hint--error">
          ${escapeMemberHtml(status.syncErrorMessage)}
        </p>`
      : ''
  }

  ${
    needsRetry
      ? `<button
          type="button"
          id="strava-retry-sync-btn"
          class="member-save-btn member-strava-retry-btn">
          Synchronisierung erneut versuchen
        </button>`
      : ''
  }

  ${
    status.syncStatus === 'syncing'
      ? `<p class="member-strava-hint">
          Deine Strava-Aktivitäten werden importiert. Das kann einige Minuten dauern.
        </p>`
      : ''
  }

</section>

<section class="member-profile-section-block">

  <h2>Sichtbarkeit</h2>

  <div id="strava-visibility-form" class="member-strava-visibility-form">

    <label class="member-strava-checkbox">
      <input
        type="checkbox"
        name="publish_feed"
        ${status.publishFeed ? 'checked' : ''}>
      Im Aktivitätsfeed erscheinen
      <span class="member-strava-checkbox-note">
        Öffentlich, letzte 90 Tage — Vorname und Nachname
      </span>
    </label>

    <label class="member-strava-checkbox">
      <input
        type="checkbox"
        name="publish_rankings"
        ${status.publishRankings ? 'checked' : ''}>
      In Rankings erscheinen
    </label>

    <label class="member-strava-checkbox">
      <input
        type="checkbox"
        name="contribute_to_club_goals"
        ${status.contributeToClubGoals ? 'checked' : ''}>
      Zu Vereinszielen beitragen
    </label>

    <p id="strava-visibility-status" class="member-save-status" hidden></p>

  </div>

</section>

<section class="member-profile-section-block member-strava-disconnect">

  <h2>Verbindung trennen</h2>

  <button
    type="button"
    id="strava-disconnect-btn"
    class="member-strava-disconnect-btn">

    Verbindung trennen

  </button>

  <div
    id="strava-disconnect-warning"
    class="member-strava-disconnect-warning"
    hidden>

    <p class="member-strava-warning-text">
      <strong>Achtung:</strong> Alle importierten Strava-Aktivitäten werden
      aus dem Vereinsportal entfernt. Feed, Rankings und Vereinsziele
      werden zurückgesetzt. In Strava selbst ändert sich nichts.
    </p>

    <div class="member-strava-disconnect-actions">

      <button
        type="button"
        id="strava-disconnect-cancel-btn"
        class="member-logout-btn">

        Abbrechen

      </button>

      <button
        type="button"
        id="strava-disconnect-confirm-btn"
        class="member-strava-disconnect-btn">

        Ja, Verbindung trennen

      </button>

    </div>

  </div>

</section>
  `;

}

function renderMemberProfile(
  member,
  options
) {

  const stravaState =
    options?.stravaState || null;

  const activeTab =
    resolveMemberProfileActiveTab(
      options?.activeTab || 'profil',
      stravaState
    );

  const showActivitiesTab =
    shouldShowMemberActivitiesTab(stravaState);

  const container =
    document.getElementById(
      'member-profile'
    );

  if (!container || !member) {
    return;
  }

  if (isPublicParticipant(member)) {

    container.innerHTML = `

<section class="member-profile-section-block">

  <h2>Externe Anmeldung</h2>

  <p class="member-public-hint">
    Du bist als externer Teilnehmer registriert — kein Vereinsmitglied.
    Du kannst dich trotzdem an Veranstaltungen anmelden und teilnehmen.
  </p>

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
      <dt>E-Mail</dt>
      <dd>${formatMemberField(member.email)}</dd>
    </div>

    <div class="member-profile-row">
      <dt>Telefon</dt>
      <dd>${formatMemberField(member.telefonnummer)}</dd>
    </div>

  </dl>

</section>

${renderMemberConsentSection(member)}

<section class="member-profile-section-block member-profile-actions">

  <button type="button" id="member-logout-btn" class="member-logout-btn">
    Logout
  </button>

</section>

<section class="member-profile-section-block member-profile-delete">

  <h2>Account löschen</h2>

  <button
    type="button"
    id="member-delete-account-btn"
    class="member-delete-account-btn">

    Account löschen

  </button>

</section>

    `;

    return;

  }

  container.innerHTML = `

${renderMemberProfileTabsNav(
  activeTab,
  stravaState
)}

<div
  id="member-profile-tab-profil"
  class="member-profile-tab-panel"
  role="tabpanel"
  aria-labelledby="member-profile-tab-btn-profil"
  data-profile-panel="profil"
  ${activeTab !== 'profil' ? 'hidden' : ''}>

  ${renderClubMemberProfilContent(member)}

</div>

<div
  id="member-profile-tab-content"
  class="member-profile-tab-panel"
  role="tabpanel"
  aria-labelledby="member-profile-tab-btn-content"
  data-profile-panel="content"
  ${activeTab !== 'content' ? 'hidden' : ''}>

  ${renderMemberContentPanelShell()}

</div>

<div
  id="member-profile-tab-abstimmungen"
  class="member-profile-tab-panel"
  role="tabpanel"
  aria-labelledby="member-profile-tab-btn-abstimmungen"
  data-profile-panel="abstimmungen"
  ${activeTab !== 'abstimmungen' ? 'hidden' : ''}>

  ${renderMemberVotesPanelShell()}

</div>

${
  showActivitiesTab
    ? `
<div
  id="member-profile-tab-aktivitaeten"
  class="member-profile-tab-panel"
  role="tabpanel"
  aria-labelledby="member-profile-tab-btn-aktivitaeten"
  data-profile-panel="aktivitaeten"
  ${activeTab !== 'aktivitaeten' ? 'hidden' : ''}>

  ${renderMemberActivitiesPanelShell()}

</div>
`
    : ''
}

<div
  id="member-profile-tab-strava"
  class="member-profile-tab-panel"
  role="tabpanel"
  aria-labelledby="member-profile-tab-btn-strava"
  data-profile-panel="strava"
  ${activeTab !== 'strava' ? 'hidden' : ''}>

  ${renderStravaProfilePanel(stravaState)}

</div>

  `;

}

function renderMemberProfileGuestLogin() {

  const container =
    document.getElementById(
      'member-profile'
    );

  if (!container) {
    return;
  }

  container.innerHTML = `

<section class="member-profile-guest">

  <h2>Anmeldung erforderlich</h2>

  <p class="member-profile-guest-lead">
    Melde dich an, um dein Profil zu sehen.
  </p>

  <p class="member-profile-guest-hint">
    E-Mail unter <strong>„Mitglieder“</strong> (oben rechts) eingeben —
    Login-Link im <strong>gleichen Browser</strong> öffnen.
  </p>

  <p class="member-profile-guest-actions">
    <a
      href="/mitglieder-hilfe/"
      class="member-profile-help-link">

      Anleitung: Login &amp; Teilnahme

    </a>
  </p>

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
