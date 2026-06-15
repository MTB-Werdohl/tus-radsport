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

  let recap = null;

  if (
    typeof terminAllowsRecapClient === 'function'
    && terminAllowsRecapClient(event)
  ) {

    if (
      isVorstandUser
      && typeof loadRecapByTerminId
        === 'function'
    ) {

      recap =
        await loadRecapByTerminId(
          event.id
        );

    } else if (
      typeof getEventRecap === 'function'
    ) {

      recap =
        await getEventRecap(event.id);

    }

  }

  const fromErlebtes =
    new URLSearchParams(
      window.location.search
    ).get('from') === 'erlebtes'
    || window.location.hash
      === '#event-recap';

  renderEvent(
    event,
    recap,
    {
      fromErlebtes,
      isVorstand: isVorstandUser
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

  if (
    typeof initEventDetailVorstand
      === 'function'
  ) {

    initEventDetailVorstand(
      event,
      member,
      { fromErlebtes }
    );

  }

  if (
    typeof initEventRecapVorstand
      === 'function'
  ) {

    initEventRecapVorstand(
      event,
      recap,
      member,
      { fromErlebtes }
    );

  }

  if (
    fromErlebtes
    && recap
    && (
      recap.status === 'published'
      || isVorstandUser
    )
    && typeof scrollEventRecapIntoView
      === 'function'
  ) {
    scrollEventRecapIntoView();
  }

  const eventUrl =
    getEventUrl(event.slug);

  const hash =
    fromErlebtes
    && recap
    && (
      recap.status === 'published'
      || isVorstandUser
    )
      ? '#event-recap'
      : '';

  window.history.replaceState(
    {},
    '',
    `${eventUrl}${hash}`
  );

}

document.addEventListener(
  'DOMContentLoaded',
  loadEvent
);
