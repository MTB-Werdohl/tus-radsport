const HOME_NEWS_LIMIT = 2;
const HOME_TERMINE_LIMIT = 3;

function escapeHomeHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function collectUpcomingTermine(
  data,
  limit
) {

  const start =
    new Date();

  start.setHours(0, 0, 0, 0);

  const end =
    new Date(start);

  end.setFullYear(
    end.getFullYear() + 1
  );

  const cards = [];

  (data || []).forEach((item) => {

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
            generatedDate: date
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

  const now =
    new Date();

  now.setHours(0, 0, 0, 0);

  return cards
    .filter((event) => {

      const endDay =
        getTerminVisibilityEndDay(event);

      if (!endDay) {
        return false;
      }

      return endDay >= now;

    })
    .slice(0, limit);

}

function renderHomeNewsTeaser(news) {

  const wrapper =
    document.getElementById(
      'home-news-teaser'
    );

  if (!wrapper) {
    return;
  }

  const items =
    (news || []).slice(
      0,
      HOME_NEWS_LIMIT
    );

  if (!items.length) {

    wrapper.innerHTML = `
<article class="calendar-card">
  <div>
    <h3>Keine News</h3>
    <p>Aktuell nichts Neues.</p>
  </div>
</article>
`;

    return;

  }

  wrapper.innerHTML =
    items
      .map((item) => {

        const excerpt =
          escapeHomeHtml(
            item.excerpt || ''
          );

        return `
<article class="calendar-card">
  <a href="${getNewsUrl(item.slug)}">
    <div>
      <h3>${escapeHomeHtml(item.title)}</h3>
      <p>${excerpt}</p>
    </div>
  </a>
</article>
`;

      })
      .join('');

}

function renderHomeTermineTeaser(termine) {

  const wrapper =
    document.getElementById(
      'home-termine-teaser'
    );

  if (!wrapper) {
    return;
  }

  const items =
    collectUpcomingTermine(
      termine,
      HOME_TERMINE_LIMIT
    );

  if (!items.length) {

    wrapper.innerHTML = `
<article class="calendar-card">
  <div>
    <h3>Keine Termine</h3>
    <p>Derzeit nichts Geplantes.</p>
  </div>
</article>
`;

    return;

  }

  wrapper.innerHTML =
    items
      .map((event) => {

        const category =
          getTerminCategory(
            event.category
          );

        const location =
          event.location
            ? ` · 📍 ${escapeHomeHtml(event.location)}`
            : '';

        return `
<article class="calendar-card">
  <a href="${getEventUrl(event.slug)}">
    <div>
      <h3>${category.icon} ${escapeHomeHtml(event.title)}</h3>
      <p>🗓️ ${formatCardDate(event)}${location}</p>
    </div>
  </a>
</article>
`;

      })
      .join('');

}

async function loadHomeTeasers() {

  try {

    const [news, termine] =
      await Promise.all([
        fetchPublishedNews(),
        fetchTermine()
      ]);

    renderHomeNewsTeaser(news);
    renderHomeTermineTeaser(termine);

  } catch (error) {

    console.error(
      'Home-Teaser Fehler:',
      error
    );

  }

}

async function initHomePage() {

  if (typeof waitForAuthSession === 'function') {

    const session =
      await waitForAuthSession();

    if (
      session
      && typeof validateMemberSession === 'function'
    ) {

      await validateMemberSession(
        session,
        { strict: false }
      );

    }

  }

  await loadHomeTeasers();

}

document.addEventListener(
  'DOMContentLoaded',
  initHomePage
);
