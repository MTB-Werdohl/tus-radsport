function formatMemberListName(member) {

  const parts = [
    member.vorname,
    member.nachname
  ].filter(Boolean);

  if (parts.length === 0) {
    return '—';
  }

  return parts.join(' ');

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

      const name =
        escapeAdminHtml(
          formatMemberListName(item)
        );

      const email =
        escapeAdminHtml(item.email || '—');

      const rolle =
        escapeAdminHtml(item.rolle || 'Mitglied');

      const nummer =
        escapeAdminHtml(
          item.mitgliedsnummer || '—'
        );

      const abteilung =
        escapeAdminHtml(item.abteilung || '—');

      container.innerHTML += `

        <div class="event-card">

          <div class="event-header">

            <div>

              <strong>
                ${name}
              </strong>

              <div class="event-meta">

                ${rolle}

                · Nr. ${nummer}

                · ${abteilung}

                · ${email}

              </div>

            </div>

            <div class="actions">

              <button type="button" data-open-id="${String(item.id)}">
                ✏
              </button>

              <button type="button" class="delete-button" data-delete-id="${encodeURIComponent(String(item.id))}">
                🗑
              </button>

            </div>

          </div>

        </div>

      `;

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
      'Mitglied wirklich löschen? Push-Abos werden ebenfalls entfernt.'
    );

  if (!confirmDelete) {
    return;
  }

  const memberId =
    normalizeMemberId(
      decodeURIComponent(String(id))
    );

  const { error: pushError } =
    await window.supabaseClient
      .from(window.siteConfig.tables.pushSubscriptions)
      .delete()
      .eq('member_id', memberId);

  if (pushError) {

    console.error(pushError);

    alert(pushError.message);

    return;

  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .delete()
      .eq('id', memberId);

  if (error) {

    console.error(error);

    alert(error.message);

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
