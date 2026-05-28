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

async function loadHomeTermineTeaser() {

  const start =
    new Date();

  start.setHours(0, 0, 0, 0);

  const end =
    new Date(start);

  end.setFullYear(
    end.getFullYear() + 1
  );

  await loadCards(
    start,
    end,
    {
      wrapperId:
        'home-termine-teaser',
      limit:
        HOME_TERMINE_LIMIT
    }
  );

}

async function loadHomeTeasers() {

  try {

    const news =
      await fetchPublishedNews();

    renderHomeNewsTeaser(news);
    await loadHomeTermineTeaser();

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
