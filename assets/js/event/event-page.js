function resolveEventDetailSlug() {

  let slug =

    new URLSearchParams(
      window.location.search
    )

    .get('slug');

  if (slug) {
    return slug;
  }

  const parts =

    window.location.pathname
      .split('/')
      .filter(Boolean);

  if (
    parts.length >= 2
    && parts[0] === 'kalender'
  ) {
    return parts[parts.length - 1];
  }

  return null;

}

async function loadEvent() {

  const slug =
    resolveEventDetailSlug();

  if (!slug) {
    return;
  }

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

  if (
    typeof initFeedbackModule === 'function'
  ) {

    try {

      await initFeedbackModule({
        entityType:
          window.siteConfig.feedback.entityTypes.event,
        entityId: event.id,
        entityVisibility:
          event.sichtbarkeit,
        entityRecurring: false,
        entityTermin: event,
        container: 'event-feedback',
        member
      });

    } catch (error) {

      console.error(error);

    }

  }

  const eventUrl =
    getEventUrl(event.slug);

  window.history.replaceState(
    {},
    '',
    eventUrl
  );

  window.reloadAfterVorstandContentSave =
    (savedMeta) => {

      if (
        savedMeta?.slug
        && typeof getEventUrl === 'function'
      ) {

        window.location.href =
          getEventUrl(savedMeta.slug);

        return;

      }

      void loadEvent();

    };

}

document.addEventListener(
  'DOMContentLoaded',
  loadEvent
);
