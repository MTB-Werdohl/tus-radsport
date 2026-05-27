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
      .value
      .toLowerCase();

  const container =
    document.getElementById('events');

  container.innerHTML = '';

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

    .sort((a, b) => {

      if (a.recurring && !b.recurring) {
        return -1;
      }

      if (!a.recurring && b.recurring) {
        return 1;
      }

      if (a.recurring && b.recurring) {
        return a.title.localeCompare(b.title);
      }

      const now = new Date();

      const aDate =
        new Date(a.date);

      const bDate =
        new Date(b.date);

      const aPast =
        aDate < now;

      const bPast =
        bDate < now;

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

    })

    .forEach((event, index, array) => {

      const now =
        new Date();

      const eventDate =
        event.date
          ? new Date(event.date)
          : null;

      const isPast =
        eventDate && eventDate < now;

      const previous =
        array[index - 1];

      const previousPast =
        previous?.date
          ? new Date(previous.date) < now
          : false;

      if (
        isPast &&
        !previousPast &&
        !event.recurring
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

                ${event.recurring
                  ? '🔁 Wiederkehrend'
                  : `
                    📅 ${
                      new Date(event.date)
                        .toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                    }

                    ·

                    🕒 ${
                      new Date(event.date)
                        .toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                    } Uhr
                  `
                }

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
  ?.addEventListener('input', loadEvents);

document
  .getElementById('new-event')
  ?.addEventListener('click', newEvent);
