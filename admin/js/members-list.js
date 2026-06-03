function formatMemberListName(member) {

  if (member?.anonymized_at) {
    return 'Anonym (gelöscht)';
  }

  const parts = [
    member.vorname,
    member.nachname
  ].filter(Boolean);

  if (parts.length === 0) {
    return '—';
  }

  return parts.join(' ');

}

function renderConsentValue(value) {

  const isYes =
    value === true;

  const label =
    isYes
      ? 'Ja'
      : 'Nein';

  const className =
    isYes
      ? 'member-consent-yes'
      : 'member-consent-no';

  return `
    <span class="${className}">
      ${label}
    </span>
  `;

}

function renderMemberCard(item) {

  const name =
    escapeAdminHtml(
      formatMemberListName(item)
    );

  const telefon =
    escapeAdminHtml(
      item.telefonnummer || '—'
    );

  const email =
    escapeAdminHtml(
      item.email || '—'
    );

  const isPublic =
    typeof isPublicParticipant === 'function'
      ? isPublicParticipant(item)
      : String(item.rolle || '')
          .trim()
          .toLowerCase() === 'public';

  const isAnonymized =
    !!item.anonymized_at;

  const publicLabel =
    isPublic
      ? `
          <span class="member-role-public">
            (Nichtmitglied)
          </span>
        `
      : '';

  const anonymizedLabel =
    isAnonymized
      ? `
          <span class="member-role-anonymized">
            (anonymisiert)
          </span>
        `
      : '';

  const contactLine =
    isAnonymized
      ? `
          <div class="member-card-contact member-card-contact--anonymized">
            Personenbezogene Daten entfernt · Abstimmungen bleiben anonym gezählt
          </div>
        `
      : `
          <div class="member-card-contact">
            ${telefon}, ${email}
            · Login:
            ${escapeAdminHtml(formatMemberLastLogin(item.last_login_at))}
          </div>
        `;

  const actions =
    isAnonymized
      ? ''
      : `
        <div class="actions">

          <button type="button" data-open-id="${String(item.id)}">
            ✏
          </button>

          <button type="button" class="delete-button" data-delete-id="${encodeURIComponent(String(item.id))}">
            🗑
          </button>

        </div>
      `;

  const loginActive =
    !isAnonymized
    && memberHasLoggedIn(item);

  const loginDotClass =
    loginActive
      ? 'member-login-dot--active'
      : 'member-login-dot--inactive';

  const loginDot =
    isAnonymized
      ? ''
      : `
          <span
            class="member-login-dot ${loginDotClass}"
            title="${loginActive ? 'Hat sich angemeldet' : 'Noch nie angemeldet'}"
            aria-hidden="true">
          </span>
        `;

  return `
    <div class="event-card member-list-card${isAnonymized ? ' member-list-card--anonymized' : ''}">

      <div class="event-header">

        <div class="member-card-body">

          <div class="member-card-name">
            ${loginDot}${name}${publicLabel}${anonymizedLabel}
          </div>

          ${contactLine}

          <div class="member-card-consents">
            Kontakt:
            ${renderConsentValue(item.einwilligung_kontakt)}
            · Bilder:
            ${renderConsentValue(item.einwilligung_bilder)}
          </div>

        </div>

        ${actions}

      </div>

    </div>
  `;

}

function showMembersLoadError(error) {

  console.error(error);

  const message =
    error?.message
    || String(error);

  alert(
    'Mitglieder konnten nicht geladen werden: '
    + message
  );

}

let allMembers = [];

function getMemberSearchTerm() {

  return document
    .getElementById('search')
    ?.value
    .toLowerCase()
    .trim() || '';

}

function filterMembersBySearch(members) {

  const search =
    getMemberSearchTerm();

  return (members || []).filter((item) => {

    if (!search) {
      return true;
    }

    return item.vorname
      ?.toLowerCase()
      .includes(search);

  });

}

async function loadMembers() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .select('*')
      .order('nachname', { ascending: true })
      .order('vorname', { ascending: true });

  if (error) {

    showMembersLoadError(error);

    return;

  }

  allMembers = data || [];

  renderMembersList(allMembers);

}

function renderMembersList(members) {

  const filtered =
    filterMembersBySearch(members);

  const container =
    document.getElementById('members');

  container.innerHTML = '';

  filtered.forEach(item => {

    container.innerHTML +=
      renderMemberCard(item);

  });

  container.querySelectorAll('[data-open-id]').forEach(button => {

    button.addEventListener('click', () => {

      openMember(button.dataset.openId);

    });

  });

  container.querySelectorAll('[data-delete-id]').forEach(button => {

    button.addEventListener('click', () => {

      deleteMember(button.dataset.deleteId);

    });

  });

}

async function deleteMember(id) {

  const confirmDelete =
    confirm(
      'Mitglied wirklich löschen?\n\n'
      +       'Personenbezogene Daten werden entfernt. '
      + 'Abstimmungen bleiben anonym gezählt.'
    );

  if (!confirmDelete) {
    return;
  }

  const memberId =
    normalizeMemberId(
      decodeURIComponent(String(id))
    );

  if (
    typeof anonymizeMemberAccount
      !== 'function'
  ) {

    alert(
      'Account-Löschung ist nicht verfügbar '
      + '(member-account.js fehlt).'
    );

    return;

  }

  const result =
    await anonymizeMemberAccount({
      memberId
    });

  if (result?.error) {

    console.error(result.error);

    alert(
      result.error.message
        || 'Löschen fehlgeschlagen.'
    );

    return;

  }

  loadMembers();

}

function newMember() {

  sessionStorage.removeItem(
    'adminMemberEditId'
  );

  window.location.href =
    '/admin/mitglieder_edit.html';

}

function openMember(id) {

  sessionStorage.setItem(
    'adminMemberEditId',
    String(id)
  );

  window.location.href =
    '/admin/mitglieder_edit.html?id='
    + encodeURIComponent(String(id));

}

function exportMembersPdf() {

  const filtered =
    filterMembersBySearch(allMembers);

  exportMembersListPdf(filtered)
    .catch((error) => {

      console.error(error);

      alert(
        error.message
        || 'PDF konnte nicht erstellt werden.'
      );

    });

}

document
  .getElementById('search')
  ?.addEventListener('input', () => {
    renderMembersList(allMembers);
  });

document
  .getElementById('new-member')
  ?.addEventListener('click', newMember);

document
  .getElementById('export-members-pdf')
  ?.addEventListener('click', exportMembersPdf);
