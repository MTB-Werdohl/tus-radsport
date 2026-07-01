function escapeEventVorstandHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function canShowEventVorstandTools(member) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

function ensureEventVorstandModal(
  id,
  title,
  dialogClass
) {

  let modal =
    document.getElementById(id);

  if (modal) {
    return modal;
  }

  modal =
    document.createElement('div');

  modal.id = id;
  modal.className = 'member-feedback-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
<div
  class="member-feedback-modal__backdrop"
  data-close-event-vorstand-modal="true">

</div>

<div
  class="member-feedback-modal__dialog ${dialogClass || ''}"
  role="dialog"
  aria-modal="true"
  aria-labelledby="${id}-title">

  <button
    type="button"
    class="member-feedback-modal__close"
    data-close-event-vorstand-modal="true"
    aria-label="Schließen">

    ×

  </button>

  <h2
    id="${id}-title"
    class="member-feedback-modal__title">

    ${escapeEventVorstandHtml(title)}

  </h2>

  <div
    class="news-vorstand-modal__body"
    data-event-vorstand-modal-body>

  </div>

</div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelectorAll(
      '[data-close-event-vorstand-modal="true"]'
    )
    .forEach((el) => {

      el.addEventListener('click', () => {
        closeEventVorstandModal(id);
      });

    });

  return modal;

}

function openEventVorstandModal(
  id,
  title
) {

  const modal =
    ensureEventVorstandModal(
      id,
      title
    );

  const titleEl =
    modal.querySelector(
      `#${id}-title`
    );

  if (titleEl) {
    titleEl.textContent = title;
  }

  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');

  document.body.classList.add(
    'member-feedback-modal-open'
  );

}

function closeEventVorstandModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  document.body.classList.remove(
    'member-feedback-modal-open'
  );

}

function renderKalenderTerminVorstandActionsHtml(
  event
) {

  return `
<div class="news-vorstand-actions__inner">

<button
  type="button"
  class="news-vorstand-btn"
  data-kalender-vorstand-edit
  data-event-id="${event.id}">

  Bearbeiten

</button>

<button
  type="button"
  class="news-vorstand-btn"
  data-kalender-vorstand-results
  data-event-id="${event.id}"
  data-event-title="${escapeEventVorstandHtml(event.title || '')}">

  Auswertung

</button>

<button
  type="button"
  class="news-vorstand-btn news-vorstand-btn--danger"
  data-kalender-vorstand-delete
  data-event-id="${event.id}">

  Löschen

</button>

</div>
  `.trim();

}

async function openEventFeedbackResultsForTermin(
  eventId,
  title
) {

  const feedbackModule =
    await fetchFeedbackModule(
      window.siteConfig.feedback.entityTypes.event,
      eventId
    );

  if (!feedbackModule?.id) {

    alert(
      'Für diesen Termin gibt es noch keine Rückmeldungen.'
    );

    return;

  }

  await openEventFeedbackResultsModal(
    feedbackModule.id,
    title
  );

}

async function deleteEventFromVorstand(
  eventId
) {

  if (
    !eventId
    || !confirm(
      'Termin wirklich löschen?'
    )
  ) {
    return;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .delete()
      .eq('id', eventId);

  if (error) {

    console.error(error);

    alert(
      'Termin konnte nicht gelöscht werden.'
    );

    return;

  }

  const onDetail =
    document.getElementById('event')
      ?.dataset?.eventId;

  if (
    onDetail
    && String(eventId) === String(onDetail)
  ) {

    window.location.href =
      typeof getCalendarUrl === 'function'
        ? getCalendarUrl()
        : '/kalender/';

    return;

  }

  if (
    typeof reloadAfterVorstandContentSave
      === 'function'
  ) {

    reloadAfterVorstandContentSave();

  } else if (
    typeof invalidateTermineCache
      === 'function'
  ) {

    invalidateTermineCache();

    if (
      typeof loadAllUpcomingTerminCards
        === 'function'
    ) {
      void loadAllUpcomingTerminCards();
    }

  } else {

    window.location.reload();

  }

}

function bindKalenderVorstandActions(
  container
) {

  if (
    !container
    || container.dataset.kalenderVorstandBound
      === 'true'
  ) {
    return;
  }

  container.dataset.kalenderVorstandBound =
    'true';

  container.addEventListener(
    'click',
    (clickEvent) => {

      const target =
        clickEvent.target;

      const editButton =
        target.closest(
          '[data-kalender-vorstand-edit]'
        );

      if (editButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const eventId =
          parseInt(
            editButton.dataset.eventId,
            10
          );

        if (eventId) {
          openMemberTerminEditorPopup({
            id: eventId
          });
        }

        return;

      }

      const resultsButton =
        target.closest(
          '[data-kalender-vorstand-results]'
        );

      if (resultsButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const eventId =
          parseInt(
            resultsButton.dataset.eventId,
            10
          );

        if (eventId) {

          void openEventFeedbackResultsForTermin(
            eventId,
            resultsButton.dataset.eventTitle
              || ''
          );

        }

        return;

      }

      const deleteButton =
        target.closest(
          '[data-kalender-vorstand-delete]'
        );

      if (deleteButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const eventId =
          parseInt(
            deleteButton.dataset.eventId,
            10
          );

        if (eventId) {
          void deleteEventFromVorstand(
            eventId
          );
        }

      }

    }
  );

}

function renderEventVorstandToolbar(
  eventData,
  feedbackModule,
  showResults
) {

  const actions =
    document.getElementById(
      'event-vorstand-actions'
    );

  if (!actions) {
    return;
  }

  if (!eventData?.id) {

    actions.innerHTML = '';

    return;

  }

  actions.innerHTML =
    renderKalenderTerminVorstandActionsHtml(
      eventData
    );

  const eventRoot =
    document.getElementById('event');

  if (eventRoot) {
    bindKalenderVorstandActions(
      eventRoot
    );
  }

}

async function openEventFeedbackResultsModal(
  moduleId,
  title
) {

  const modalId =
    'event-vorstand-results-modal';

  ensureEventVorstandModal(
    modalId,
    title || 'Rückmeldungen',
    'member-feedback-modal__dialog--results'
  );

  const modal =
    document.getElementById(modalId);

  const body =
    modal?.querySelector(
      '[data-event-vorstand-modal-body]'
    );

  if (!body) {
    return;
  }

  body.innerHTML = `
<p class="admin-hint">
  Auswertung wird geladen …
</p>
  `;

  openEventVorstandModal(
    modalId,
    title || 'Rückmeldungen'
  );

  if (
    typeof loadFeedbackResultsForModule
      !== 'function'
  ) {

    body.innerHTML = `
<p class="admin-hint admin-hint--error">
  Auswertung konnte nicht geladen werden.
</p>
    `;

    return;

  }

  await loadFeedbackResultsForModule(
    moduleId,
    body,
    {
      showSummary: false,
      showFreeTextList: false,
      hideEmailColumn: true,
      editable: true,
      onParticipantsChanged: () => {

        window.dispatchEvent(
          new CustomEvent(
            'feedback-module-refresh'
          )
        );

      }
    }
  );

}

function initEventDetailVorstand(
  eventData,
  member,
  options = {}
) {

  renderEventVorstandToolbar(
    eventData,
    null,
    false
  );

}

async function initEventDetailVorstandAsync(
  eventData,
  member
) {

  renderEventVorstandToolbar(
    eventData,
    null,
    false
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    const eventRoot =
      document.getElementById('event');

    if (
      !eventRoot
      || !eventRoot.dataset.eventId
    ) {
      return;
    }

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    if (!canShowEventVorstandTools(member)) {
      return;
    }

    initEventDetailVorstand(
      {
        id:
          parseInt(
            eventRoot.dataset.eventId,
            10
          ),
        title:
          eventRoot.dataset.eventTitle
          || ''
      },
      member
    );

  }
);
