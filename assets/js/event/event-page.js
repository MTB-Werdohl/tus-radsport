async function loadEvent() {

  const slug =

    new URLSearchParams(

      window.location.search

    )

    .get('slug');

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

}

loadEvent();