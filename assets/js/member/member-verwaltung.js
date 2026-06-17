const MEMBER_VERWALTUNG_EXPANDER_STORAGE_KEY =
  'memberVerwaltungOpenExpander';

const MEMBER_VERWALTUNG_MEMBERS_CONFIG = {
  searchId: 'member-verwaltung-members-search',
  containerId: 'member-verwaltung-members',
  newMemberId: 'member-verwaltung-new-member',
  exportPdfId: 'member-verwaltung-export-members-pdf'
};

const MEMBER_VERWALTUNG_PROTOCOLS_CONFIG = {
  searchId: 'member-verwaltung-protocols-search',
  containerId: 'member-verwaltung-protocols',
  paginationId: 'member-verwaltung-protocols-pagination',
  newProtocolId: 'member-verwaltung-new-protocol'
};

const MEMBER_VERWALTUNG_EXPANDERS = [
  {
    id: 'saison',
    title: 'Saisonmodus',
    renderBody: renderMemberSiteContentAdminShell,
    onOpen: async (panel) => {

      if (
        panel.dataset.inited !== 'true'
        && typeof initSiteContentAdminPage
          === 'function'
      ) {

        await initSiteContentAdminPage();

        panel.dataset.inited = 'true';

      }

    }
  },
  {
    id: 'mitglieder',
    title: 'Mitglieder',
    renderBody: renderMemberVerwaltungMembersShell
  },
  {
    id: 'protokolle',
    title: 'Protokolle, Beschlüsse, Informationen',
    renderBody: renderMemberVerwaltungProtocolsShell
  },
  {
    id: 'vorstandssitzung',
    title: 'Vorstandssitzung',
    renderBody: renderMemberVerwaltungMeetingShell
  }
];

function getStoredMemberVerwaltungExpander() {

  try {

    return sessionStorage.getItem(
      MEMBER_VERWALTUNG_EXPANDER_STORAGE_KEY
    );

  } catch (error) {

    return null;

  }

}

function storeMemberVerwaltungExpander(
  expanderId
) {

  try {

    if (expanderId) {

      sessionStorage.setItem(
        MEMBER_VERWALTUNG_EXPANDER_STORAGE_KEY,
        expanderId
      );

      sessionStorage.setItem(
        'memberProfileActiveTab',
        'verwaltung'
      );

    } else {

      sessionStorage.removeItem(
        MEMBER_VERWALTUNG_EXPANDER_STORAGE_KEY
      );

    }

  } catch (error) {
    /* ignore */
  }

}

function rememberMemberVerwaltungContext(
  expanderId
) {

  storeMemberVerwaltungExpander(
    expanderId
  );

}

function getMemberVerwaltungExpanderConfig(
  expanderId
) {

  return MEMBER_VERWALTUNG_EXPANDERS.find(
    (config) =>
      config.id === expanderId
  );

}

function renderMemberSiteContentAdminShell() {

  return `
<div class="member-verwaltung-saison-form">

  <p class="member-verwaltung-hint">
    Wenn der Saisonmodus aktiv ist, sehen alle Besucher
    einen Banner und ein schließbares Overlay mit deinen
    Hinweistexten.
  </p>

  <form
    id="site-saison-form"
    class="member-verwaltung-saison-fields">

    <label class="member-verwaltung-checkbox-row">
      <input
        type="checkbox"
        id="site-saison-enabled">
      <span>Saisonmodus aktiv</span>
    </label>

    <label
      class="member-verwaltung-field"
      for="site-saison-banner-text">

      <span class="member-verwaltung-field-label">
        Banner-Text
      </span>

      <textarea
        id="site-saison-banner-text"
        rows="3"
        maxlength="500"
        placeholder="Kurzer Hinweis in der Leiste unter dem Header"></textarea>

    </label>

    <label
      class="member-verwaltung-field"
      for="site-saison-overlay-text">

      <span class="member-verwaltung-field-label">
        Overlay-Text
      </span>

      <textarea
        id="site-saison-overlay-text"
        rows="5"
        maxlength="800"
        placeholder="Ausführlicher Hinweis im Overlay-Fenster"></textarea>

    </label>

    <button
      type="submit"
      class="member-verwaltung-primary-btn">

      Saisonmodus speichern

    </button>

  </form>

  <p
    id="site-saison-status"
    class="member-verwaltung-hint"></p>

</div>
  `.trim();

}

function renderMemberVerwaltungMembersShell() {

  return `
<div class="member-verwaltung-toolbar">

  <input
    id="member-verwaltung-members-search"
    type="search"
    placeholder="Vorname, Nachname oder beides …">

  <button
    id="member-verwaltung-export-members-pdf"
    class="member-verwaltung-secondary-btn"
    type="button">

    Liste als PDF

  </button>

  <button
    id="member-verwaltung-new-member"
    class="member-verwaltung-primary-btn"
    type="button">

    Neues Mitglied

  </button>

</div>

<div
  id="member-verwaltung-members"
  class="member-verwaltung-list"></div>
  `.trim();

}

function renderMemberVerwaltungProtocolsShell() {

  return `
<div class="member-verwaltung-toolbar">

  <input
    id="member-verwaltung-protocols-search"
    type="search"
    placeholder="Protokolle suchen …">

  <button
    id="member-verwaltung-new-protocol"
    class="member-verwaltung-primary-btn"
    type="button">

    Neues Protokoll

  </button>

</div>

<div
  id="member-verwaltung-protocols"
  class="member-verwaltung-list"></div>

<div
  id="member-verwaltung-protocols-pagination"
  class="member-verwaltung-pagination"></div>
  `.trim();

}

function renderMemberVerwaltungMeetingShell() {

  return `
<a
  href="https://meet.jit.si/radsportvorstandmtbwerdohl"
  class="member-verwaltung-meeting-link"
  target="_blank"
  rel="noopener noreferrer">

  Videokonferenz per Jitsi öffnen

</a>
  `.trim();

}

function renderMemberVerwaltungExpanderSection(
  config
) {

  const bodyHtml =
    typeof config.renderBody === 'function'
      ? config.renderBody()
      : '';

  return `
<section
  class="member-profile-section-block member-verwaltung-section member-verwaltung-expander"
  data-verwaltung-expander="${config.id}">

  <button
    type="button"
    class="member-verwaltung-expander-toggle"
    id="member-verwaltung-expander-toggle-${config.id}"
    aria-expanded="false"
    aria-controls="member-verwaltung-expander-panel-${config.id}">

    <span class="member-verwaltung-expander-title">
      ${config.title}
    </span>

    <span
      class="member-verwaltung-expander-icon"
      aria-hidden="true">

      ▸

    </span>

  </button>

  <div
    id="member-verwaltung-expander-panel-${config.id}"
    class="member-verwaltung-expander-panel"
    hidden>

    ${bodyHtml}

  </div>

</section>
  `.trim();

}

function renderMemberVerwaltungPanelShell() {

  return MEMBER_VERWALTUNG_EXPANDERS
    .map(renderMemberVerwaltungExpanderSection)
    .join('\n\n');

}

async function setMemberVerwaltungExpanderOpen(
  expanderId,
  options = {}
) {

  const save =
    options.save !== false;

  for (const config of MEMBER_VERWALTUNG_EXPANDERS) {

    const toggle =
      document.getElementById(
        `member-verwaltung-expander-toggle-${config.id}`
      );

    const panel =
      document.getElementById(
        `member-verwaltung-expander-panel-${config.id}`
      );

    if (!toggle || !panel) {
      continue;
    }

    const shouldOpen =
      expanderId === config.id;

    if (shouldOpen) {

      if (panel.hidden) {

        panel.hidden = false;

        toggle.setAttribute(
          'aria-expanded',
          'true'
        );

        if (
          typeof config.onOpen === 'function'
        ) {

          await config.onOpen(panel);

        }

      }

      continue;

    }

    if (!panel.hidden) {

      panel.hidden = true;

      toggle.setAttribute(
        'aria-expanded',
        'false'
      );

    }

  }

  if (save) {

    storeMemberVerwaltungExpander(
      expanderId || ''
    );

  }

}

async function toggleMemberVerwaltungExpander(
  expanderId
) {

  const panel =
    document.getElementById(
      `member-verwaltung-expander-panel-${expanderId}`
    );

  if (!panel) {
    return;
  }

  if (!panel.hidden) {

    await setMemberVerwaltungExpanderOpen(null);

    return;

  }

  await setMemberVerwaltungExpanderOpen(
    expanderId
  );

}

async function restoreMemberVerwaltungExpanders() {

  const urlSection =
    new URLSearchParams(
      window.location.search
    ).get('section');

  const stored =
    getStoredMemberVerwaltungExpander();

  const expanderId =
    urlSection
    || stored;

  if (
    !expanderId
    || !getMemberVerwaltungExpanderConfig(
      expanderId
    )
  ) {
    return;
  }

  await setMemberVerwaltungExpanderOpen(
    expanderId,
    { save: false }
  );

}

function bindMemberVerwaltungExpanders() {

  MEMBER_VERWALTUNG_EXPANDERS.forEach((config) => {

    const toggle =
      document.getElementById(
        `member-verwaltung-expander-toggle-${config.id}`
      );

    if (
      !toggle
      || toggle.dataset.bound === 'true'
    ) {
      return;
    }

    toggle.dataset.bound = 'true';

    toggle.addEventListener(
      'click',
      () => {

        void toggleMemberVerwaltungExpander(
          config.id
        );

      }
    );

  });

}

async function initMemberVerwaltungTab() {

  const panel =
    document.getElementById(
      'member-profile-tab-verwaltung'
    );

  if (!panel) {
    return;
  }

  if (panel.dataset.verwaltungBound !== 'true') {

    bindMemberVerwaltungExpanders();

    if (
      typeof setMembersListConfig
        === 'function'
    ) {
      setMembersListConfig(
        MEMBER_VERWALTUNG_MEMBERS_CONFIG
      );
    }

    if (
      typeof bindMembersListControls
        === 'function'
    ) {
      bindMembersListControls();
    }

    if (
      typeof setProtocolsListConfig
        === 'function'
    ) {
      setProtocolsListConfig(
        MEMBER_VERWALTUNG_PROTOCOLS_CONFIG
      );
    }

    if (
      typeof bindProtocolsListControls
        === 'function'
    ) {
      bindProtocolsListControls();
    }

    panel.dataset.verwaltungBound = 'true';

  } else {

    if (
      typeof setMembersListConfig
        === 'function'
    ) {
      setMembersListConfig(
        MEMBER_VERWALTUNG_MEMBERS_CONFIG
      );
    }

    if (
      typeof setProtocolsListConfig
        === 'function'
    ) {
      setProtocolsListConfig(
        MEMBER_VERWALTUNG_PROTOCOLS_CONFIG
      );
    }

  }

  if (typeof loadMembers === 'function') {
    await loadMembers();
  }

  if (typeof loadProtocols === 'function') {
    await loadProtocols();
  }

  await restoreMemberVerwaltungExpanders();

}
