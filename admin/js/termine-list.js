let eventsListPage = 1;

function sortEventsForAdmin(a, b) {

  const now = new Date();

  now.setHours(0, 0, 0, 0);

  const aDate =
    getSingleTerminStartDay(a)
    || new Date(0);

  const bDate =
    getSingleTerminStartDay(b)
    || new Date(0);

  const aEnd =
    getTerminVisibilityEndDay(a)
    || aDate;

  const bEnd =
    getTerminVisibilityEndDay(b)
    || bDate;

  const aPast =
    aEnd < now;

  const bPast =
    bEnd < now;

  if (!aPast && bPast) {
    return -1;
  }

  if (aPast && !bPast) {
    return 1;
  }

  if (!aPast && !bPast) {
    return aDate - bDate;
  }

  return bDate - aDate;

}

function bindEventsListActions(container) {

  container.querySelectorAll('[data-open-id]').forEach(button => {

    button.addEventListener('click', () => {

      openEvent(button.dataset.openId);

    });

  });

  container.querySelectorAll('[data-delete-id]').forEach(button => {

    button.addEventListener('click', () => {

      deleteEvent(button.dataset.deleteId);

    });

  });

}

function renderEventsListItems(
  container,
  pageItems
) {

  pageItems.forEach((event, index, array) => {

    const now =
      new Date();

    now.setHours(0, 0, 0, 0);

    const eventEnd =
      getTerminVisibilityEndDay(event);

    const isPast =
      eventEnd
      && eventEnd < now;

    const previous =
      array[index - 1];

    const previousPast =
      previous
        ? (
          getTerminVisibilityEndDay(previous)
          || getSingleTerminStartDay(previous)
        ) < now
        : false;

    if (
      isPast
      && !previousPast
    ) {

      container.innerHTML += `

      <div class="event-separator">

        <span>
          Vergangene Termine
        </span>

      </div>

    `;

    }

    container.innerHTML += `

      <div class="event-card">

        <div class="event-header">

          <div>

            <strong>
              ${escapeAdminHtml(event.title)}
            </strong>

            <div class="event-meta">

              ${formatAdminTerminMeta(event)}

              ${event.location
                ? ' · 📍 ' + escapeAdminHtml(event.location)
                : ''
              }

              · ${escapeAdminHtml(visibilityListLabel(event.sichtbarkeit))}

            </div>

          </div>

          <div class="actions">

            <button type="button" data-open-id="${event.id}">
              ✏
            </button>

            <button type="button" class="delete-button" data-delete-id="${event.id}">
              🗑
            </button>

          </div>

        </div>

      </div>

    `;

  });

}

async function loadEvents() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .order('id', {
        ascending: false
      });

  if (error) {

    console.error(error);

    alert(
      'Termine konnten nicht geladen werden.'
    );

    return;

  }

  if (!data) {

    console.error(
      'Keine Daten geladen'
    );

    return;

  }

  const search =
    document.getElementById('search')
      ?.value
      .toLowerCase()
      .trim()
      || '';

  const filtered =
    data
      .filter(event => {

        return (
          event.title
            ?.toLowerCase()
            .includes(search)
          ||
          event.location
            ?.toLowerCase()
            .includes(search)
        );

      })
      .sort(sortEventsForAdmin);

  const paged =
    paginateAdminListItems(
      filtered,
      eventsListPage
    );

  eventsListPage = paged.page;

  const container =
    document.getElementById('events');

  container.innerHTML = '';

  if (!paged.items.length) {

    container.innerHTML =
      paged.totalItems
        ? '<p class="admin-hint">Keine Treffer auf dieser Seite.</p>'
        : '<p class="admin-hint">Noch keine Termine angelegt.</p>';

    renderAdminPagination({
      containerId: 'events-pagination',
      totalItems: paged.totalItems,
      currentPage: paged.page,
      onPageChange(page) {
        eventsListPage = page;
        loadEvents();
      }
    });

    return;

  }

  renderEventsListItems(
    container,
    paged.items
  );

  bindEventsListActions(container);

  renderAdminPagination({
    containerId: 'events-pagination',
    totalItems: paged.totalItems,
    currentPage: paged.page,
    onPageChange(page) {
      eventsListPage = page;
      loadEvents();
    }
  });

}

async function deleteEvent(id) {

  const confirmDelete =
    confirm('Termin löschen?');

  if (!confirmDelete) {
    return;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .delete()
      .eq('id', id);

  if (error) {

    console.error(error);

    alert(
      'Termin konnte nicht gelöscht werden.'
    );

    return;

  }

  loadEvents();

}

function newEvent() {

  window.location.href =
    '/admin/termine_edit.html';

}

function openEvent(id) {

  window.location.href =
    '/admin/termine_edit.html?id=' + id;

}

document
  .getElementById('search')
  ?.addEventListener('input', () => {

    eventsListPage = 1;
    loadEvents();

  });

document
  .getElementById('new-event')
  ?.addEventListener('click', newEvent);
