function buildTerminCardsForRange(
  data,
  start,
  end
) {

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

  return cards;

}

function filterUpcomingTerminCards(cards) {

  const now = new Date();

  now.setHours(0, 0, 0, 0);

  return cards.filter((event) => {

    const endDay =
      getTerminVisibilityEndDay(event);

    if (!endDay) {
      return false;
    }

    return endDay >= now;

  });

}

function getUpcomingTerminCardsForRange(
  data,
  start,
  end
) {

  return filterUpcomingTerminCards(
    buildTerminCardsForRange(
      data,
      start,
      end
    )
  );

}

function monthStartFromDate(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

}

function addCalendarMonths(
  monthStart,
  count
) {

  const next =
    new Date(monthStart);

  next.setMonth(
    next.getMonth() + count
  );

  return new Date(
    next.getFullYear(),
    next.getMonth(),
    1
  );

}

function findNextMonthStartWithUpcomingTermine(
  data,
  fromMonthStart
) {

  const maxMonths = 36;

  for (
    let offset = 1;
    offset <= maxMonths;
    offset += 1
  ) {

    const monthStart =
      addCalendarMonths(
        fromMonthStart,
        offset
      );

    if (
      monthHasUpcomingTermine(
        data,
        monthStart
      )
    ) {
      return monthStart;
    }

  }

  return null;

}

function findPreviousMonthStartWithUpcomingTermine(
  data,
  fromMonthStart
) {

  const maxMonths = 36;

  for (
    let offset = 1;
    offset <= maxMonths;
    offset += 1
  ) {

    const monthStart =
      addCalendarMonths(
        fromMonthStart,
        -offset
      );

    if (
      monthHasUpcomingTermine(
        data,
        monthStart
      )
    ) {
      return monthStart;
    }

  }

  return null;

}

function monthHasUpcomingTermine(
  data,
  monthStart
) {

  const rangeEnd =
    addCalendarMonths(
      monthStart,
      1
    );

  return (
    getUpcomingTerminCardsForRange(
      data,
      monthStart,
      rangeEnd
    ).length > 0
  );

}

function findAdjacentMonthStartWithUpcomingTermine(
  data,
  fromMonthStart,
  direction
) {

  if (direction === 'backward') {

    return findPreviousMonthStartWithUpcomingTermine(
      data,
      fromMonthStart
    );

  }

  return findNextMonthStartWithUpcomingTermine(
    data,
    fromMonthStart
  );

}

let calendarAutoAdvanceDepth = 0;

function renderEmptyTerminCards(
  wrapper
) {

  wrapper.innerHTML = `
<article class="calendar-card">
  <div>
    <h3>Keine Termine</h3>
    <p>Derzeit nichts Geplantes.</p>
  </div>
</article>
`;

}

function renderTerminCard(
  wrapper,
  event
) {

  const card =
    document.createElement('article');

  card.className =
    contentVisibilityCardClass(
      event.sichtbarkeit
    );

  const category =
    getTerminCategory(event.category);

  card.innerHTML = `

<a href="${getEventUrl(event.slug)}">

<div>

<h3>

${contentVisibilityIcon(
  event.sichtbarkeit
)}

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
}${
  event.creator_label
    ? ` · 👤 ${escapeContentCreatorHtml(event.creator_label)}`
    : ''
}

</p>

</div>

</a>

`;

  wrapper.appendChild(card);

}

async function loadCards(
  start,
  end,
  options = {}
) {

  const wrapperId =
    options.wrapperId
    || 'event-cards';

  const limit =
    options.limit;

  const wrapper =
    document.getElementById(
      wrapperId
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

  const visibleCards =
    getUpcomingTerminCardsForRange(
      data,
      start,
      end
    );

  const toRender =
    typeof limit === 'number'
      ? visibleCards.slice(0, limit)
      : visibleCards;

  const shouldAutoAdvanceMonth =
    options.autoAdvanceMonth === true
    && wrapperId === 'event-cards'
    && options.calendar;

  if (
    !toRender.length
    && shouldAutoAdvanceMonth
    && calendarAutoAdvanceDepth < 12
  ) {

    const viewedMonth =
      monthStartFromDate(start);

    const targetMonth =
      findAdjacentMonthStartWithUpcomingTermine(
        data,
        viewedMonth,
        options.advanceDirection
      );

    if (
      targetMonth
      && targetMonth.getTime()
        !== viewedMonth.getTime()
    ) {

      calendarAutoAdvanceDepth += 1;

      options.calendar.gotoDate(
        targetMonth
      );

      return;

    }

  }

  calendarAutoAdvanceDepth = 0;

  if (!toRender.length) {

    renderEmptyTerminCards(wrapper);

    return;

  }

  toRender.forEach((event) => {

    renderTerminCard(
      wrapper,
      event
    );

  });

}
