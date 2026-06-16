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

  <nav
    class="site-content-admin-tabs"
    aria-label="Website-Hinweise Bereiche">

    <button
      type="button"
      class="site-content-admin-tab is-active"
      data-site-content-tab="banner">

      Banner

    </button>

    <button
      type="button"
      class="site-content-admin-tab"
      data-site-content-tab="saison">

      Saisonmodus

    </button>

    <button
      type="button"
      class="site-content-admin-tab"
      data-site-content-tab="landing">

      Landing-Hinweise

    </button>

    <button
      type="button"
      class="site-content-admin-tab"
      data-site-content-tab="overlay">

      Overlay

    </button>

  </nav>

  <section
    class="site-content-admin-panel"
    data-site-content-panel="banner">

    <form id="site-banner-form">

      <label>
        <input
          type="checkbox"
          id="site-banner-active"
          name="active">
        Banner aktiv
      </label>

      <label for="site-banner-text">
        Text
      </label>

      <textarea
        id="site-banner-text"
        rows="3"
        maxlength="500"></textarea>

      <label for="site-banner-url">
        Link (optional)
      </label>

      <input
        type="text"
        id="site-banner-url"
        placeholder="/training/">

      <label for="site-banner-style">
        Stil
      </label>

      <select id="site-banner-style">
        <option value="info">Info</option>
        <option value="warning">Warnung</option>
      </select>

      <label for="site-banner-starts">
        Von (optional)
      </label>

      <input
        type="datetime-local"
        id="site-banner-starts">

      <label for="site-banner-ends">
        Bis (optional)
      </label>

      <input
        type="datetime-local"
        id="site-banner-ends">

      <button type="submit">
        Banner speichern
      </button>

    </form>

    <p
      id="site-banner-status"
      class="member-verwaltung-hint"></p>

  </section>

  <section
    class="site-content-admin-panel"
    data-site-content-panel="saison"
    hidden>

    <form id="site-saison-form">

      <label for="site-saison-mode">
        Status
      </label>

      <select id="site-saison-mode">
        <option value="active">Saison aktiv</option>
        <option value="pause">Saisonpause</option>
      </select>

      <label for="site-saison-message">
        Hinweistext
      </label>

      <textarea
        id="site-saison-message"
        rows="3"
        maxlength="500"></textarea>

      <label for="site-saison-starts">
        Von (optional)
      </label>

      <input
        type="datetime-local"
        id="site-saison-starts">

      <label for="site-saison-ends">
        Bis (optional)
      </label>

      <input
        type="datetime-local"
        id="site-saison-ends">

      <button type="submit">
        Saisonmodus speichern
      </button>

    </form>

    <p
      id="site-saison-status"
      class="member-verwaltung-hint"></p>

  </section>

  <section
    class="site-content-admin-panel"
    data-site-content-panel="landing"
    hidden>

    <form id="site-landing-form">

      <p class="member-verwaltung-hint">
        Maximal 5 kurze Hinweise für die Startseite.
        Leer lassen = statischer Jekyll-Text bleibt sichtbar.
      </p>

      <div id="site-landing-items"></div>

      <button
        type="button"
        id="site-landing-add"
        class="member-verwaltung-secondary-btn">

        Hinweis hinzufügen

      </button>

      <button type="submit">
        Landing-Hinweise speichern
      </button>

    </form>

    <p
      id="site-landing-status"
      class="member-verwaltung-hint"></p>

  </section>

  <section
    class="site-content-admin-panel"
    data-site-content-panel="overlay"
    hidden>

    <form id="site-overlay-form">

      <label>
        <input
          type="checkbox"
          id="site-overlay-active"
          name="active">
        Overlay aktiv
      </label>

      <label for="site-overlay-title">
        Titel
      </label>

      <input
        type="text"
        id="site-overlay-title"
        maxlength="120">

      <label for="site-overlay-text">
        Text
      </label>

      <textarea
        id="site-overlay-text"
        rows="4"
        maxlength="800"></textarea>

      <label>
        <input
          type="checkbox"
          id="site-overlay-dismissible"
          checked>
        Besucher können schließen
      </label>

      <label for="site-overlay-starts">
        Von (optional)
      </label>

      <input
        type="datetime-local"
        id="site-overlay-starts">

      <label for="site-overlay-ends">
        Bis (optional)
      </label>

      <input
        type="datetime-local"
        id="site-overlay-ends">

      <button type="submit">
        Overlay speichern
      </button>

    </form>

    <p
      id="site-overlay-status"
      class="member-verwaltung-hint"></p>

  </section>

</div>
  `.trim();

}

function renderMemberVerwaltungPanelShell() {

  return `
<section class="member-profile-section-block member-verwaltung-section">

  <div class="member-verwaltung-section-head">

    <h2>Website-Hinweise</h2>

    <button
      type="button"
      id="member-verwaltung-hinweise-toggle"
      class="member-verwaltung-link-btn"
      aria-expanded="false"
      aria-controls="member-verwaltung-hinweise-panel">

      Hinweise bearbeiten

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
          : 'Hinweise bearbeiten';

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
