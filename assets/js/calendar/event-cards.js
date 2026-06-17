function buildTerminCardsForRange(
  data,
  start,
  end
) {

  const cards = [];

  dedupeTermineRows(
    filterTermineForPublicListing(
      data
    )
  ).forEach(item => {

    if (
      terminListingOverlapsRange(
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
let terminCardsRenderGeneration = 0;

function beginTerminCardsRender() {

  terminCardsRenderGeneration += 1;

  return terminCardsRenderGeneration;

}

function isCurrentTerminCardsRender(
  generation
) {

  return (
    generation
    === terminCardsRenderGeneration
  );

}

function renderEmptyTerminCards(
  wrapper
) {

  wrapper.insertAdjacentHTML(
    'beforeend',
    `
<article class="calendar-card">
  <div>
    <h3>Keine Termine</h3>
    <p>Derzeit nichts Geplantes.</p>
  </div>
</article>
    `.trim()
  );

}

function buildMemberTerminEditorUrl(
  options = {}
) {

  const params =
    new URLSearchParams();

  if (options.id) {
    params.set(
      'id',
      String(options.id)
    );
  }

  const query =
    params.toString();

  return query
    ? `/termin-bearbeiten/?${query}`
    : '/termin-bearbeiten/';

}

function canShowKalenderNewTerminButton(
  viewer
) {

  return (
    typeof canShowEventVorstandTools
      === 'function'
    && canShowEventVorstandTools(viewer)
  );

}

const CALENDAR_CARD_DEFAULT_IMAGE_PATH =
  'shared/images/1781467844219-gruppentour_1.webp';

function escapeTerminCardHtml(
  value
) {

  if (
    value === null
    || value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatTerminCardExcerpt(
  content,
  maxLength = 140
) {

  if (!content) {
    return '';
  }

  const text =
    String(content)
      .replace(
        /!\[[^\]]*\]\([^)]*\)/g,
        ''
      )
      .replace(
        /\[([^\]]+)\]\([^)]*\)/g,
        '$1'
      )
      .replace(
        /[#*`>_~[\]()]/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(
    0,
    maxLength - 1
  ).trim()}…`;

}

function resolveTerminCardImageUrl(
  event
) {

  if (
    typeof resolveTerminImage
      === 'function'
  ) {

    const imageUrl =
      resolveTerminImage(event);

    if (imageUrl) {
      return imageUrl;
    }

  }

  if (
    typeof resolveMediaPublicUrl
      === 'function'
  ) {

    return (
      resolveMediaPublicUrl(
        CALENDAR_CARD_DEFAULT_IMAGE_PATH
      )
      || ''
    );

  }

  return '';

}

function resolveCalendarCardParticipation(
  event,
  participationMap
) {

  if (
    !participationMap
    || !event?.id
  ) {
    return null;
  }

  return (
    participationMap.get(
      String(event.id)
    )
    || null
  );

}

function buildCalendarCardClassName(
  event
) {

  let className =
    'calendar-card';

  if (
    normalizeContentVisibility(
      event.sichtbarkeit
    ) === CONTENT_VISIBILITY.draft
  ) {
    className +=
      ' calendar-card--draft';
  }

  return className;

}

function buildCalendarCardParticipationBadge(
  participationAnswer
) {

  const yesAnswer =
    window.siteConfig.feedback
      .answers.yes;

  const maybeAnswer =
    window.siteConfig.feedback
      .answers.maybe;

  if (
    participationAnswer === yesAnswer
  ) {
    return `
<span class="calendar-card__participation calendar-card__participation--yes">
  Zusage
</span>
    `.trim();
  }

  if (
    participationAnswer === maybeAnswer
  ) {
    return `
<span class="calendar-card__participation calendar-card__participation--maybe">
  Interesse
</span>
    `.trim();
  }

  return '';

}

async function resolveCalendarParticipationMap(
  viewer
) {

  if (
    !viewer?.id
    || typeof isClubMember
      !== 'function'
    || !isClubMember(viewer)
    || typeof fetchMemberEventParticipationMap
      !== 'function'
  ) {
    return new Map();
  }

  try {

    return await fetchMemberEventParticipationMap(
      viewer.id
    );

  } catch (error) {

    console.error(error);

    return new Map();

  }

}

function shouldUseMemberTerminEditorNavigation() {

  return window.matchMedia(
    '(max-width: 900px)'
  ).matches;

}

function openMemberTerminEditorPopup(
  options = {}
) {

  const url =
    buildMemberTerminEditorUrl(options);

  if (shouldUseMemberTerminEditorNavigation()) {

    window.location.href = url;

    return null;

  }

  const features =
    'popup=yes,width=960,height=920,'
    + 'menubar=no,toolbar=no,location=no,'
    + 'status=no,scrollbars=yes,resizable=yes';

  const popup =
    window.open(
      url,
      'mtbTerminEditor',
      features
    );

  if (popup) {
    popup.focus();
    return popup;
  }

  window.location.href = url;

  return null;

}

function renderKalenderNewTerminButton(
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
    'Neuer Termin';

  button.addEventListener(
    'click',
    () => {
      openMemberTerminEditorPopup();
    }
  );

  bar.appendChild(button);
  wrapper.appendChild(bar);

}

function getTerminMonthGroupKey(
  event
) {

  const sortDate =
    getTerminSortDate(event);

  if (
    !sortDate
    || Number.isNaN(
      sortDate.getTime()
    )
  ) {
    return '';
  }

  return `${sortDate.getFullYear()}-${sortDate.getMonth()}`;

}

function formatTerminMonthDividerLabel(
  event
) {

  const sortDate =
    getTerminSortDate(event);

  if (
    !sortDate
    || Number.isNaN(
      sortDate.getTime()
    )
  ) {
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

function formatTerminYearDividerLabel(
  year
) {

  return String(year);

}

function renderTerminYearDivider(
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
    formatTerminYearDividerLabel(year);

  divider.appendChild(labelEl);
  wrapper.appendChild(divider);

}

function renderTerminMonthDivider(
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

function renderTerminListWithDividers(
  wrapper,
  events,
  options = {}
) {

  if (options.showNewTerminButton) {

    renderKalenderNewTerminButton(
      wrapper
    );

  }

  let lastYear = null;
  let lastMonthKey = null;

  const renderedKeys =
    new Set();

  dedupeTermineRows(events).forEach((event) => {

    const listingKey =
      getTerminListingKey(event);

    if (
      listingKey
      && renderedKeys.has(listingKey)
    ) {
      return;
    }

    if (listingKey) {
      renderedKeys.add(listingKey);
    }

    const sortDate =
      getTerminSortDate(event);

    const monthKey =
      getTerminMonthGroupKey(event);

    const year =
      sortDate
      && !Number.isNaN(sortDate.getTime())
        ? sortDate.getFullYear()
        : null;

    if (
      year != null
      && year !== lastYear
    ) {

      renderTerminYearDivider(
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

      renderTerminMonthDivider(
        wrapper,
        formatTerminMonthDividerLabel(
          event
        )
      );

      lastMonthKey = monthKey;

    }

    renderTerminCard(
      wrapper,
      event,
      options
    );

  });

}

function renderTerminCard(
  wrapper,
  event,
  options = {}
) {

  const card =
    document.createElement('article');

  const participationAnswer =
    resolveCalendarCardParticipation(
      event,
      options.participationMap
    );

  card.className =
    buildCalendarCardClassName(
      event
    );

  const imageUrl =
    resolveTerminCardImageUrl(event);

  const title =
    escapeTerminCardHtml(
      event.title || 'Ohne Titel'
    );

  const whenLine =
    escapeTerminCardHtml(
      formatCardDate(event)
    );

  const locationLine =
    event.location
      ? escapeTerminCardHtml(
        event.location
      )
      : '';

  const excerpt =
    escapeTerminCardHtml(
      formatTerminCardExcerpt(
        event.content
      )
    );

  const participationBadge =
    buildCalendarCardParticipationBadge(
      participationAnswer
    );

  const vorstandActions =
    options.vorstandActions
    && typeof renderKalenderTerminVorstandActionsHtml
      === 'function'
      ? renderKalenderTerminVorstandActionsHtml(
        event
      )
      : '';

  const metaHtml =
    [
      whenLine
        ? `
<span class="calendar-card__when">
  🗓️ ${whenLine}
</span>
        `.trim()
        : '',
      locationLine
        ? `
<span class="calendar-card__where">
  📍 ${locationLine}
</span>
        `.trim()
        : ''
    ]
      .filter(Boolean)
      .join('');

  const imageHtml =
    imageUrl
      ? `
<img
  src="${escapeTerminCardHtml(imageUrl)}"
  alt=""
  loading="lazy"
  class="calendar-card__image">
      `.trim()
      : `
<div
  class="calendar-card__image calendar-card__image--placeholder"
  aria-hidden="true"></div>
      `.trim();

  card.innerHTML = `

<a
  href="${getEventUrl(event.slug)}"
  class="calendar-card__link">

<div class="calendar-card__layout">

  <div class="calendar-card__media">
    ${imageHtml}
  </div>

  <div class="calendar-card__body">

    <h3>
      ${contentVisibilityIcon(
        event.sichtbarkeit
      )}
      ${title}
      ${participationBadge}
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

${vorstandActions}

`;

  wrapper.appendChild(card);

}

function getAllUpcomingTerminCards(
  data
) {

  return filterUpcomingTerminCards(
    dedupeTermineRows(
      filterTermineForPublicListing(
        [...data].sort(
          (left, right) =>
            getTerminSortDate(left)
            - getTerminSortDate(right)
        )
      )
    )
  );

}

async function loadAllUpcomingTerminCards(
  options = {}
) {

  const renderGeneration =
    beginTerminCardsRender();

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

  if (
    !isCurrentTerminCardsRender(
      renderGeneration
    )
  ) {
    return;
  }

  const visibleCards =
    getAllUpcomingTerminCards(data);

  const toRender =
    typeof limit === 'number'
      ? visibleCards.slice(0, limit)
      : visibleCards;

  const viewer =
    typeof resolveContentListingViewer
      === 'function'
      ? resolveContentListingViewer()
      : null;

  const participationMap =
    options.participationMap
    ?? await resolveCalendarParticipationMap(
      viewer
    );

  if (
    !isCurrentTerminCardsRender(
      renderGeneration
    )
  ) {
    return;
  }

  wrapper.replaceChildren();

  const vorstandActions =
    options.vorstandActions === true
    || (
      options.vorstandActions !== false
      && typeof canShowEventVorstandTools
        === 'function'
      && canShowEventVorstandTools(viewer)
    );

  const showNewTerminButton =
    canShowKalenderNewTerminButton(viewer);

  if (!toRender.length) {

    if (showNewTerminButton) {

      renderKalenderNewTerminButton(
        wrapper
      );

    }

    renderEmptyTerminCards(wrapper);

    return;

  }

  const renderOptions = {
    vorstandActions,
    showNewTerminButton,
    participationMap
  };

  renderTerminListWithDividers(
    wrapper,
    toRender,
    renderOptions
  );

  if (
    vorstandActions
    && typeof bindKalenderVorstandActions
      === 'function'
  ) {

    bindKalenderVorstandActions(
      wrapper
    );

  }

}

async function loadCards(
  start,
  end,
  options = {}
) {

  const renderGeneration =
    beginTerminCardsRender();

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

  if (
    !isCurrentTerminCardsRender(
      renderGeneration
    )
  ) {
    return;
  }

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

  const viewer =
    options.viewer
    ?? (
      typeof resolveContentListingViewer
        === 'function'
        ? resolveContentListingViewer()
        : null
    );

  const participationMap =
    options.participationMap
    ?? await resolveCalendarParticipationMap(
      viewer
    );

  if (
    !isCurrentTerminCardsRender(
      renderGeneration
    )
  ) {
    return;
  }

  wrapper.replaceChildren();

  const renderOptions = {
    participationMap,
    vorstandActions:
      options.vorstandActions === true
      || (
        options.vorstandActions !== false
        && typeof canShowEventVorstandTools
          === 'function'
        && canShowEventVorstandTools(viewer)
      )
  };

  if (!toRender.length) {

    renderEmptyTerminCards(wrapper);

    return;

  }

  dedupeTermineRows(toRender).forEach((event) => {

    renderTerminCard(
      wrapper,
      event,
      renderOptions
    );

  });

}
