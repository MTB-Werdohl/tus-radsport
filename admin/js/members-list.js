function escapeAdminHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

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

  const search =
    document
      .getElementById('search')
      .value
      .toLowerCase()
      .trim();

  const container =
    document.getElementById('members');

  container.innerHTML = '';

  (data || [])

    .filter(item => {

      if (!search) {
        return true;
      }

      return item.vorname
        ?.toLowerCase()
        .includes(search);

    })

    .forEach(item => {

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

              <button type="button" data-open-id="${item.id}">
                ✏
              </button>

              <button type="button" class="delete-button" data-delete-id="${item.id}">
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

  const { error: pushError } =
    await window.supabaseClient
      .from(window.siteConfig.tables.pushSubscriptions)
      .delete()
      .eq('member_id', id);

  if (pushError) {

    console.error(pushError);

    alert(pushError.message);

    return;

  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .delete()
      .eq('id', id);

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  loadMembers();

}

function newMember() {

  window.location.href =
    '/admin/mitglieder_edit.html';

}

function openMember(id) {

  window.location.href =
    '/admin/mitglieder_edit.html?id=' + id;

}

document
  .getElementById('search')
  ?.addEventListener('input', loadMembers);

document
  .getElementById('new-member')
  ?.addEventListener('click', newMember);
