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

function renderMemberSiteContentAdminShell() {

  return `
<div class="site-content-admin member-verwaltung-hinweise-admin">

  <p class="member-verwaltung-hint">
    Wenn der Saisonmodus aktiv ist, sehen alle Besucher
    einen Banner und ein schließbares Overlay mit deinen
    Hinweistexten.
  </p>

  <form id="site-saison-form">

    <label class="member-verwaltung-checkbox-row">
      <input
        type="checkbox"
        id="site-saison-enabled">
      Saisonmodus aktiv
    </label>

    <label for="site-saison-banner-text">
      Banner-Text
    </label>

    <textarea
      id="site-saison-banner-text"
      rows="3"
      maxlength="500"
      placeholder="Kurzer Hinweis in der Leiste unter dem Header"></textarea>

    <label for="site-saison-overlay-text">
      Overlay-Text
    </label>

    <textarea
      id="site-saison-overlay-text"
      rows="5"
      maxlength="800"
      placeholder="Ausführlicher Hinweis im Overlay-Fenster"></textarea>

    <button type="submit">
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

function bindMemberVerwaltungExpanders() {

  MEMBER_VERWALTUNG_EXPANDERS.forEach((config) => {

    const toggle =
      document.getElementById(
        `member-verwaltung-expander-toggle-${config.id}`
      );

    const panel =
      document.getElementById(
        `member-verwaltung-expander-panel-${config.id}`
      );

    if (
      !toggle
      || !panel
      || toggle.dataset.bound === 'true'
    ) {
      return;
    }

    toggle.dataset.bound = 'true';

    toggle.addEventListener(
      'click',
      async () => {

        const opening =
          panel.hidden;

        panel.hidden = !opening;

        toggle.setAttribute(
          'aria-expanded',
          opening ? 'true' : 'false'
        );

        if (
          opening
          && typeof config.onOpen === 'function'
        ) {

          await config.onOpen(panel);

        }

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

}
