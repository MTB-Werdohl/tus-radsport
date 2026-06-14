async function loadEvent() {

  let slug =

    new URLSearchParams(
      window.location.search
    )

    .get('slug');

  if (!slug) {

    const parts =

      window.location.pathname
        .split('/')
        .filter(Boolean);

    slug =

      parts[
        parts.length - 1
      ];

  }

  if (!slug)
    return;

  const member =
    await ensureContentViewerMember();

  const event =

    await getEvent(
      slug,
      member
    );

  if (!event) {

    await handleContentUnavailable({
      kind: 'event',
      slug,
      member,
      containerId: 'event',
      backUrl:
        typeof getCalendarUrl === 'function'
          ? getCalendarUrl()
          : '/kalender/',
      backLabel: '← Zurück zum Kalender'
    });

    return;

  }

  if (
    typeof getCalendarViewMonth === 'function'
    && !getCalendarViewMonth()
    && event.date
  ) {

    saveCalendarViewMonth(
      new Date(event.date)
    );

  }

  let recap = null;

  if (
    typeof getEventRecap === 'function'
    && typeof terminAllowsRecapClient === 'function'
    && terminAllowsRecapClient(event)
  ) {

    recap =
      await getEventRecap(event.id);

  }

  renderEvent(
    event,
    recap,
    {
      fromErlebtes:
        new URLSearchParams(
          window.location.search
        ).get('from') === 'erlebtes'
    }
  );

  await initFeedbackModule({
    entityType:
      window.siteConfig.feedback.entityTypes.event,
    entityId: event.id,
    entityVisibility:
      event.sichtbarkeit,
    entityRecurring:
      event.recurring === true,
    entityTermin: event,
    container: 'event-feedback'
  });

window.history.replaceState(
  {},
  '',
  getEventUrl(event.slug)
);

}

document.addEventListener(
  'DOMContentLoaded',
  loadEvent
);
