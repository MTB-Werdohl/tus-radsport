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

  const isVorstandUser =
    typeof isVorstand === 'function'
    && isVorstand(member);

  renderEvent(
    event,
    {
      isVorstand: isVorstandUser
    }
  );

  await initFeedbackModule({
    entityType:
      window.siteConfig.feedback.entityTypes.event,
    entityId: event.id,
    entityVisibility:
      event.sichtbarkeit,
    entityRecurring: false,
    entityTermin: event,
    container: 'event-feedback'
  });

  if (
    isVorstandUser
    && typeof initEventDetailVorstand
      === 'function'
  ) {

    initEventDetailVorstand(
      event,
      member
    );

  }

  const eventUrl =
    getEventUrl(event.slug);

  window.history.replaceState(
    {},
    '',
    eventUrl
  );

  window.reloadAfterVorstandContentSave =
    () => {
      void loadEvent();
    };

}

document.addEventListener(
  'DOMContentLoaded',
  loadEvent
);
