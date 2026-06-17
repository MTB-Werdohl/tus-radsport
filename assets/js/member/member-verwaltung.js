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
