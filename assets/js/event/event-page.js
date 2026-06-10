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

  if (!event)
    return;

  if (
    typeof getCalendarViewMonth === 'function'
    && !getCalendarViewMonth()
    && event.date
  ) {

    saveCalendarViewMonth(
      new Date(event.date)
    );

  }

  renderEvent(
    event
  );

  await initFeedbackModule({
    entityType:
      window.siteConfig.feedback.entityTypes.event,
    entityId: event.id,
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
