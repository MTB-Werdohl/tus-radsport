let protocolListPage = 1;

function compareProtocolsByDateDesc(a, b) {

  const dateA =
    new Date(a.meeting_date || 0)
      .getTime();

  const dateB =
    new Date(b.meeting_date || 0)
      .getTime();

  if (dateB !== dateA) {
    return dateB - dateA;
  }

  return (b.id || 0) - (a.id || 0);

}

function bindProtocolListActions(container) {

  container.querySelectorAll('[data-delete-id]').forEach(button => {

    button.addEventListener('click', (event) => {

      event.preventDefault();
      event.stopPropagation();

      deleteProtocol(button.dataset.deleteId);

    });

  });

}

async function loadProtocols() {

  const { data, error } =
    await window.supabaseClient
      .from(getProtocolTableName())
      .select('*')
      .order(
        'meeting_date',
        { ascending: false, nullsFirst: false }
      )
      .order(
        'id',
        { ascending: false }
      );

  if (error) {

    console.error(error);

    return;

  }

  const search =
    document
      .getElementById('search')
      ?.value
      .toLowerCase()
      .trim()
      || '';

  const filtered =
    (data || [])
      .filter((item) => {

        if (!search) {
          return true;
        }

        const haystack = [
          formatProtocolTitle(item),
          getProtocolScopeLabel(item.scope),
          item.content
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(search);

      })
      .sort(compareProtocolsByDateDesc);

  const paged =
    paginateAdminListItems(
      filtered,
      protocolListPage
    );

  protocolListPage = paged.page;

  const container =
    document.getElementById('protocols');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!paged.items.length) {

    container.innerHTML =
      paged.totalItems
        ? '<p class="admin-hint">Keine Treffer auf dieser Seite.</p>'
        : '<p class="admin-hint">Noch keine Protokolle angelegt.</p>';

    renderAdminPagination({
      containerId: 'protocols-pagination',
      totalItems: paged.totalItems,
      currentPage: paged.page,
      onPageChange(page) {
        protocolListPage = page;
        loadProtocols();
      }
    });

    return;

  }

  paged.items.forEach((item) => {

    const cardClass =
      getProtocolScopeCardClass(item.scope);

    const viewUrl =
      getProtocolViewUrl(item.id);

    container.innerHTML += `

      <div class="event-card ${cardClass}">

        <div class="event-header">

          <a
            href="${escapeAdminHtml(viewUrl)}"
            class="admin-protocol-card-link"
          >

            <strong>
              ${escapeAdminHtml(formatProtocolTitle(item))}
            </strong>

            <div class="event-meta">

              ${escapeAdminHtml(getProtocolScopeLabel(item.scope))}

              ·

              ${escapeAdminHtml(formatProtocolDate(item.meeting_date))}

            </div>

          </a>

          <div class="actions">

            <button
              type="button"
              class="delete-button"
              data-delete-id="${item.id}"
              title="Löschen"
            >
              🗑
            </button>

          </div>

        </div>

      </div>

    `;

  });

  bindProtocolListActions(container);

  renderAdminPagination({
    containerId: 'protocols-pagination',
    totalItems: paged.totalItems,
    currentPage: paged.page,
    onPageChange(page) {
      protocolListPage = page;
      loadProtocols();
    }
  });

}

async function deleteProtocol(id) {

  const confirmDelete =
    confirm(
      'Protokoll inkl. aller Dateien im Ordner löschen?'
    );

  if (!confirmDelete) {
    return;
  }

  const { data, error: loadError } =
    await window.supabaseClient
      .from(getProtocolTableName())
      .select('*')
      .eq('id', id)
      .single();

  if (loadError) {

    console.error(loadError);

    return;

  }

  try {

    await deleteProtocolDocumentStorage(
      id,
      data
    );

  } catch (error) {

    console.error(error);

    alert('Dateien konnten nicht gelöscht werden.');

    return;

  }

  const { error } =
    await window.supabaseClient
      .from(getProtocolTableName())
      .delete()
      .eq('id', id);

  if (error) {

    console.error(error);

    alert('Protokoll konnte nicht gelöscht werden.');

    return;

  }

  loadProtocols();

}

function newProtocol() {

  window.location.href =
    getProtocolEditUrl();

}

document
  .getElementById('search')
  ?.addEventListener('input', () => {

    protocolListPage = 1;
    loadProtocols();

  });

document
  .getElementById('new-protocol')
  ?.addEventListener('click', newProtocol);
