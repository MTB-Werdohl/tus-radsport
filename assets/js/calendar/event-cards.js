async function loadCards(
  start,
  end
) {

  const wrapper =
    document.getElementById(
      'event-cards'
    );

  if (!wrapper) {
    return;
  }

  let data;

  try {

    data = await fetchTermine();

  } catch (error) {

    console.error(error);

    return;

  }

  wrapper.innerHTML = '';

  const cards = [];

  data.forEach(item => {

    if (item.recurring) {

      const recurringEnd =
        item.endRecur
          ? parseTerminDateOnly(item.endRecur)
          : null;

      const recurringStart =
        item.startRecur
          ? parseTerminDateOnly(item.startRecur)
          : null;

      const current =
        new Date(start);

      while (current < end) {

        const date =
          `${current.getFullYear()}-${
            String(current.getMonth() + 1)
              .padStart(2, '0')
          }-${
            String(current.getDate())
              .padStart(2, '0')
          }`;

        const excluded =
          item.exclude?.includes(date);

        const validDay =
          item.daysOfWeek
            ?.includes(current.getDay());

        const afterStart =
          !recurringStart
          || current >= recurringStart;

        const beforeEnd =
          !recurringEnd
          || current <= recurringEnd;

        if (
          validDay
          && !excluded
          && afterStart
          && beforeEnd
        ) {

          cards.push({

            ...item,

            generatedDate:
              new Date(current)

          });

        }

        current.setDate(
          current.getDate() + 1
        );

      }

      return;

    }

    if (
      singleTerminOverlapsRange(
        item,
        start,
        end
      )
    ) {

      cards.push(item);

    }

  });

  cards.sort((a, b) => {

    return (
      getTerminSortDate(a)
      - getTerminSortDate(b)
    );

  });

  const now = new Date();

  now.setHours(0, 0, 0, 0);

  const visibleCards =
    cards.filter((event) => {

      const endDay =
        getTerminVisibilityEndDay(event);

      if (!endDay) {
        return false;
      }

      return endDay >= now;

    });

  visibleCards.forEach(event => {

    const card =
      document.createElement('article');

    card.className = 'calendar-card';

    const category =
      getTerminCategory(event.category);

    card.innerHTML = `

<a href="/event.html?slug=${encodeURIComponent(event.slug)}">

<div>

<h3>

${category.icon}

${event.title}

</h3>

<p>

🗓️

${formatCardDate(event)}

${
  event.location
    ? ` · 📍 ${event.location}`
    : ''
}

</p>

</div>

</a>

`;

    wrapper.appendChild(card);

  });

}
