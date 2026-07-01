function escapeInternCardHtml(
  value
) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

let internCardsRenderGeneration = 0;

function beginInternCardsRender() {

  internCardsRenderGeneration += 1;

  return internCardsRenderGeneration;

}

function isCurrentInternCardsRender(
  generation
) {

  return (
    generation
    === internCardsRenderGeneration
  );

}

function getInternNewsSortDate(
  item
) {

  const raw =
    item?.created_at
    || item?.updated_at;

  if (!raw) {
    return null;
  }

  const date =
    new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;

}

function getInternNewsMonthGroupKey(
  item
) {

  const sortDate =
    getInternNewsSortDate(item);

  if (!sortDate) {
    return '';
  }

  return `${sortDate.getFullYear()}-${sortDate.getMonth()}`;

}

function formatInternNewsMonthDividerLabel(
  item
) {

  const sortDate =
    getInternNewsSortDate(item);

  if (!sortDate) {
    return '';
  }

  const label =
    sortDate.toLocaleDateString(
      'de-DE',
      { month: 'long' }
    );

  return label.charAt(0).toUpperCase()
    + label.slice(1);

}

function formatInternNewsCardDate(
  item
) {

  const sortDate =
    getInternNewsSortDate(item);

  if (!sortDate) {
    return '';
  }

  return sortDate.toLocaleDateString(
    'de-DE',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );

}

function formatInternNewsCardExcerpt(
  item
) {

  if (item?.excerpt) {
    return String(item.excerpt).trim();
  }

  if (
    typeof buildMemberNewsExcerpt
      === 'function'
  ) {

    return buildMemberNewsExcerpt(
      item?.content,
      item?.title
    );

  }

  return '';

}

function buildInternCardClassName(
  item
) {

  return (
    `calendar-card calendar-card--${
      normalizeContentVisibility(
        item?.sichtbarkeit
      )
    }`
  );

}

function resolveInternCardImageUrl(
  item
) {

  if (
    typeof resolveNewsImage === 'function'
  ) {

    const url =
      resolveNewsImage(item);

    if (url) {
      return url;
    }

  }

  return item?.image || null;

}

function renderInternNewNewsButton(
  wrapper
) {

  const bar =
    document.createElement('div');

  bar.className =
    'kalender-new-termin-bar';

  const button =
    document.createElement('button');

  button.type = 'button';
  button.className =
    'kalender-new-termin-btn';

  button.textContent =
    'Neuer Beitrag';

  button.addEventListener(
    'click',
    () => {
      openMemberInternEditorPopup();
    }
  );

  bar.appendChild(button);
  wrapper.appendChild(bar);

}

function renderInternNewsYearDivider(
  wrapper,
  year
) {

  const divider =
    document.createElement('div');

  divider.className =
    'kalender-year-divider';

  const labelEl =
    document.createElement('span');

  labelEl.className =
    'kalender-year-divider__label';

  labelEl.textContent =
    String(year);

  divider.appendChild(labelEl);
  wrapper.appendChild(divider);

}

function renderInternNewsMonthDivider(
  wrapper,
  label
) {

  const divider =
    document.createElement('div');

  divider.className =
    'kalender-month-divider';

  const labelEl =
    document.createElement('span');

  labelEl.className =
    'kalender-month-divider__label';

  labelEl.textContent = label;

  divider.appendChild(labelEl);
  wrapper.appendChild(divider);

}

function renderInternNewsCard(
  wrapper,
  item,
  options = {}
) {

  const card =
    document.createElement('article');

  card.className =
    buildInternCardClassName(item);

  const imageUrl =
    resolveInternCardImageUrl(item);

  const title =
    escapeInternCardHtml(
      item.title || 'Ohne Titel'
    );

  const whenLine =
    escapeInternCardHtml(
      formatInternNewsCardDate(item)
    );

  const excerpt =
    escapeInternCardHtml(
      formatInternNewsCardExcerpt(item)
    );

  const detailUrl =
    typeof getInternNewsUrl === 'function'
      ? getInternNewsUrl(item.slug)
      : `/intern-detail.html?slug=${encodeURIComponent(item.slug || '')}`;

  const imageHtml =
    imageUrl
      ? `
<img
  src="${escapeInternCardHtml(imageUrl)}"
  alt=""
  loading="lazy"
  class="calendar-card__image">
      `.trim()
      : `
<div
  class="calendar-card__image calendar-card__image--placeholder"
  aria-hidden="true"></div>
      `.trim();

  const metaHtml =
    whenLine
      ? `
<span class="calendar-card__when">
  🗓️ ${whenLine}
</span>
      `.trim()
      : '';

  card.innerHTML = `

<a
  href="${detailUrl}"
  class="calendar-card__link">

<div class="calendar-card__layout">

  <div class="calendar-card__media">
    ${imageHtml}
  </div>

  <div class="calendar-card__body">

    <h3>
      ${contentVisibilityIcon(
        item.sichtbarkeit
      )}
      ${title}
    </h3>

    ${
      metaHtml
        ? `
<div class="calendar-card__meta">
  ${metaHtml}
</div>
        `.trim()
        : ''
    }

    ${
      excerpt
        ? `
<p class="calendar-card__excerpt">
  ${excerpt}
</p>
        `.trim()
        : ''
    }

  </div>

</div>

</a>

`;

  wrapper.appendChild(card);

}

function renderInternNewsListWithDividers(
  wrapper,
  items,
  options = {}
) {

  if (options.showNewNewsButton) {

    renderInternNewNewsButton(
      wrapper
    );

  }

  let lastYear = null;
  let lastMonthKey = null;

  items.forEach((item) => {

    const sortDate =
      getInternNewsSortDate(item);

    const monthKey =
      getInternNewsMonthGroupKey(item);

    const year =
      sortDate
        ? sortDate.getFullYear()
        : null;

    if (
      year != null
      && year !== lastYear
    ) {

      renderInternNewsYearDivider(
        wrapper,
        year
      );

      lastYear = year;
      lastMonthKey = null;

    }

    if (
      monthKey
      && monthKey !== lastMonthKey
    ) {

      renderInternNewsMonthDivider(
        wrapper,
        formatInternNewsMonthDividerLabel(
          item
        )
      );

      lastMonthKey = monthKey;

    }

    renderInternNewsCard(
      wrapper,
      item,
      options
    );

  });

}

function renderInternGuestWall(
  member
) {

  const wrapper =
    document.getElementById('intern-cards');

  if (!wrapper) {
    return;
  }

  if (
    typeof renderContentAccessDenied
      !== 'function'
  ) {

    wrapper.innerHTML = `
<p class="content-access-lead">
  Dieser Bereich ist nur für Vereinsmitglieder.
</p>
    `.trim();

    return;

  }

  renderContentAccessDenied({
    containerId: 'intern-cards',
    kind: 'intern',
    visibility:
      CONTENT_VISIBILITY.members,
    member,
    backUrl: '/',
    backLabel: '← Zur Startseite'
  });

}

function renderEmptyInternNews(
  wrapper,
  options = {}
) {

  if (options.showNewNewsButton) {

    renderInternNewNewsButton(
      wrapper
    );

  }

  const empty =
    document.createElement('p');

  empty.className =
    'kalender-empty-hint';

  empty.textContent =
    'Noch keine internen Beiträge.';

  wrapper.appendChild(empty);

}

function canShowInternVorstandTools(
  member
) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

async function loadInternNewsCards(
  options = {}
) {

  const renderGeneration =
    beginInternCardsRender();

  const wrapper =
    document.getElementById('intern-cards');

  if (!wrapper) {
    return;
  }

  const member =
    options.member
    ?? (
      typeof resolveContentListingViewer
        === 'function'
        ? resolveContentListingViewer()
        : null
    );

  if (
    typeof canAccessNewsSection
      !== 'function'
    || !canAccessNewsSection(member)
  ) {

    if (
      !isCurrentInternCardsRender(
        renderGeneration
      )
    ) {
      return;
    }

    renderInternGuestWall(member);

    return;

  }

  let rows;

  try {

    rows =
      await fetchInternNews();

  } catch (error) {

    if (
      !isCurrentInternCardsRender(
        renderGeneration
      )
    ) {
      return;
    }

    console.error(
      'Intern-News laden fehlgeschlagen:',
      error
    );

    const hint =
      error?.message
      || error?.code
      || '';

    wrapper.innerHTML = `
<p class="kalender-empty-hint">
  Beiträge konnten nicht geladen werden.
</p>
${
  hint
    ? `
<p class="kalender-empty-hint kalender-empty-hint--detail">
  ${escapeInternCardHtml(hint)}
</p>
    `.trim()
    : ''
}
    `.trim();

    return;

  }

  if (
    !isCurrentInternCardsRender(
      renderGeneration
    )
  ) {
    return;
  }

  const visible =
    typeof filterInternNewsForListing
      === 'function'
      ? filterInternNewsForListing(
        rows,
        member
      )
      : rows;

  const sorted =
    typeof sortInternNewsRows === 'function'
      ? sortInternNewsRows(visible)
      : visible;

  const showNewNewsButton =
    options.showNewNewsButton === true
    || (
      options.showNewNewsButton !== false
      && canShowInternVorstandTools(member)
    );

  wrapper.replaceChildren();

  if (!sorted.length) {

    renderEmptyInternNews(
      wrapper,
      { showNewNewsButton }
    );

    return;

  }

  renderInternNewsListWithDividers(
    wrapper,
    sorted,
    {
      showNewNewsButton
    }
  );

}
