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

  const event =

    await getEvent(
      slug
    );

  if (!event)
    return;

  renderEvent(
    event
  );

window.history.replaceState(
  {},
  '',
  `/kalender/${event.slug}`
);

}

loadEvent();