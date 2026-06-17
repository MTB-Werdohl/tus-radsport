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

function renderMemberVerwaltungPanelShell() {

  return `
<section class="member-profile-section-block member-verwaltung-section">

  <div class="member-verwaltung-section-head">

    <h2>Saisonmodus</h2>

    <button
      type="button"
      id="member-verwaltung-hinweise-toggle"
      class="member-verwaltung-link-btn"
      aria-expanded="false"
      aria-controls="member-verwaltung-hinweise-panel">

      Saisonmodus bearbeiten

    </button>

  </div>

  <div
    id="member-verwaltung-hinweise-panel"
    class="member-verwaltung-hinweise-panel"
    hidden>

    ${renderMemberSiteContentAdminShell()}

  </div>

</section>

<section class="member-profile-section-block member-verwaltung-section">

  <h2>Mitglieder</h2>

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

</section>

<section class="member-profile-section-block member-verwaltung-section">

  <h2>Protokolle, Beschlüsse, Informationen</h2>

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

</section>

<section class="member-profile-section-block member-verwaltung-section">

  <h2>Vorstandssitzung</h2>

  <a
    href="https://meet.jit.si/radsportvorstandmtbwerdohl"
    class="member-verwaltung-meeting-link"
    target="_blank"
    rel="noopener noreferrer">

    Videokonferenz per Jitsi öffnen

  </a>

</section>
  `.trim();

}

function bindMemberVerwaltungHinweiseToggle() {

  const toggle =
    document.getElementById(
      'member-verwaltung-hinweise-toggle'
    );

  const panel =
    document.getElementById(
      'member-verwaltung-hinweise-panel'
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

      toggle.textContent =
        opening
          ? 'Schließen'
          : 'Saisonmodus bearbeiten';

      if (
        opening
        && panel.dataset.inited !== 'true'
        && typeof initSiteContentAdminPage
          === 'function'
      ) {

        await initSiteContentAdminPage();

        panel.dataset.inited = 'true';

      }

    }
  );

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

    bindMemberVerwaltungHinweiseToggle();

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
