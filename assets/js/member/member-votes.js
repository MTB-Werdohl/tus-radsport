const MEMBER_VOTES_POLLS_PAGE_SIZE = 5;

let memberVotesGroupedCache = null;
let memberVotesPollsPage = 1;

function getFeedbackEntityPageUrl(
  entityType,
  slug
) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {
    return getEventUrl(slug);
  }

  return '/';

}

function formatMemberVoteAnswerLine(
  module,
  answerRow,
  answerLabel,
  entityRecurring
) {

  if (
    module?.type
    === window.siteConfig.feedback.types.poll
  ) {

    return `🗳️ ${answerLabel}`;

  }

  const code =
    String(answerRow.answer || '')
      .trim();

  let icon = '🗳️';

  if (
    isFeedbackEventSubscriptionMode(
      module,
      entityRecurring
    )
    && isFeedbackSubscriptionAnswer(code)
  ) {
    icon = '📬';
  } else if (
    code
    === window.siteConfig.feedback.answers.yes
  ) {
    icon = '✅';
  } else if (
    code
    === window.siteConfig.feedback.answers.maybe
  ) {
    icon = '🤔';
  }

  return `${icon} ${answerLabel}`;

}

function buildMemberVoteItem(
  answerRow,
  module,
  entity
) {

  const isEvent =
    module.entity_type
    === window.siteConfig.feedback.entityTypes.event;

  const answerLabel =
    module.type
    === window.siteConfig.feedback.types.poll
      ? formatFeedbackPollAnswerDisplay(
        module,
        answerRow
      )
      : formatFeedbackAnswerLabel(
        module,
        answerRow.answer,
        entity?.recurring === true
      );

  return {
    answerRow,
    module,
    entity,
    answerLabel,
    url:
      getFeedbackEntityPageUrl(
        module.entity_type,
        entity.slug
      ),
    dateLabel:
      isEvent
        ? formatCardDate(entity)
        : null,
    sortDate:
      isEvent
        ? getTerminSortDate(entity)
        : null,
    updatedAt:
      answerRow.updated_at
      || answerRow.created_at
  };

}

async function fetchMemberVotesGrouped(
  memberId
) {

  const answers =
    await fetchMemberFeedbackAnswers(
      memberId
    );

  const modules =
    (answers || [])
      .map((row) => row.feedback_modules)
      .filter(Boolean);

  const entityMap =
    await fetchFeedbackEntityRecordsForModules(
      modules
    );

  const termine = [];
  const abstimmungen = [];

  (answers || []).forEach((answerRow) => {

    const module =
      answerRow.feedback_modules;

    if (!module) {
      return;
    }

    const entity =
      getFeedbackEntityRecordFromMap(
        entityMap,
        module
      );

    if (
      !entity
      || !entity.slug
    ) {
      return;
    }

    const item =
      buildMemberVoteItem(
        answerRow,
        module,
        entity
      );

    const isEvent =
      module.entity_type
      === window.siteConfig.feedback.entityTypes.event;

    if (isEvent) {

      if (
        isTerminStillUpcoming(entity)
      ) {
        termine.push(item);
      }

      return;

    }

  });

  termine.sort((left, right) => {

    if (
      left.sortDate
      && right.sortDate
    ) {
      return (
        left.sortDate
        - right.sortDate
      );
    }

    if (left.sortDate) {
      return -1;
    }

    if (right.sortDate) {
      return 1;
    }

    return 0;

  });

  abstimmungen.sort((left, right) => (
    new Date(right.updatedAt)
    - new Date(left.updatedAt)
  ));

  return {
    termine,
    abstimmungen
  };

}

async function fetchMemberUpcomingVotes(
  memberId
) {

  const grouped =
    await fetchMemberVotesGrouped(
      memberId
    );

  return [
    ...grouped.termine,
    ...grouped.abstimmungen
  ];

}

function normalizeMemberVotesPage(
  page,
  totalItems,
  pageSize
) {

  const size =
    Math.max(
      1,
      Number(pageSize) || 1
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(totalItems / size)
    );

  const safePage =
    Math.min(
      Math.max(
        1,
        Number(page) || 1
      ),
      totalPages
    );

  return {
    page: safePage,
    totalPages,
    pageSize: size
  };

}

function paginateMemberVotesItems(
  items,
  page,
  pageSize
) {

  const totalItems =
    items.length;

  const normalized =
    normalizeMemberVotesPage(
      page,
      totalItems,
      pageSize
    );

  const startIndex =
    (normalized.page - 1)
    * normalized.pageSize;

  return {
    items:
      items.slice(
        startIndex,
        startIndex + normalized.pageSize
      ),
    page: normalized.page,
    totalPages: normalized.totalPages,
    totalItems,
    pageSize: normalized.pageSize
  };

}

function renderMemberVoteCard(item) {

  const title =
    formatContentCardTitle(
      escapeMemberHtml(
        item.entity.title || 'Ohne Titel'
      ),
      item.entity.sichtbarkeit
    );

  const answerLine =
    formatMemberVoteAnswerLine(
      item.module,
      item.answerRow,
      escapeMemberHtml(
        item.answerLabel
      ),
      item.entity?.recurring === true
    );

  const metaParts = [];

  if (item.dateLabel) {
    metaParts.push(
      `🗓️ ${escapeMemberHtml(item.dateLabel)}`
    );
  }

  metaParts.push(answerLine);

  const cardClass =
    contentVisibilityCardClass(
      item.entity.sichtbarkeit
    );

  return `
<article class="${cardClass} member-vote-card">
  <a href="${escapeMemberHtml(item.url)}">
    <div>
      <h3>${title}</h3>
      <p>${metaParts.join(' · ')}</p>
    </div>
  </a>
</article>
  `;

}

function renderMemberVotesCards(items) {

  if (!items.length) {
    return '';
  }

  return items
    .map(renderMemberVoteCard)
    .join('');

}

function renderMemberVotesPagination(
  container,
  totalItems,
  currentPage
) {

  if (!container) {
    return;
  }

  const normalized =
    normalizeMemberVotesPage(
      currentPage,
      totalItems,
      MEMBER_VOTES_POLLS_PAGE_SIZE
    );

  if (
    totalItems
    <= MEMBER_VOTES_POLLS_PAGE_SIZE
  ) {

    container.innerHTML = '';
    container.hidden = true;

    return;

  }

  container.hidden = false;

  container.innerHTML = `

<div class="member-votes-pagination">

  <button
    type="button"
    class="member-votes-pagination__btn member-votes-pagination__prev"
    ${normalized.page <= 1 ? 'disabled' : ''}>

    ← Zurück

  </button>

  <span class="member-votes-pagination__info">
    Seite ${normalized.page} von ${normalized.totalPages}
  </span>

  <button
    type="button"
    class="member-votes-pagination__btn member-votes-pagination__next"
    ${normalized.page >= normalized.totalPages ? 'disabled' : ''}>

    Weiter →

  </button>

</div>

  `;

  container
    .querySelector('.member-votes-pagination__prev')
    ?.addEventListener('click', () => {

      renderMemberVotesList(
        document.getElementById(
          'member-votes-list'
        ),
        memberVotesGroupedCache,
        normalized.page - 1
      );

    });

  container
    .querySelector('.member-votes-pagination__next')
    ?.addEventListener('click', () => {

      renderMemberVotesList(
        document.getElementById(
          'member-votes-list'
        ),
        memberVotesGroupedCache,
        normalized.page + 1
      );

    });

}

function renderMemberVotesSection(
  heading,
  itemsHtml,
  emptyText
) {

  const body =
    itemsHtml
      ? `<div class="member-votes-section__cards">${itemsHtml}</div>`
      : `<p class="member-votes-section__empty">${escapeMemberHtml(emptyText)}</p>`;

  return `
<section class="member-votes-section">

  <h3 class="member-votes-section__heading">
    ${escapeMemberHtml(heading)}
  </h3>

  <hr class="member-votes-divider" aria-hidden="true">

  ${body}

</section>
  `;

}

function renderMemberVotesList(
  container,
  grouped,
  pollsPage = 1
) {

  if (!container) {
    return;
  }

  const termine =
    grouped?.termine || [];

  const abstimmungen =
    grouped?.abstimmungen || [];

  memberVotesGroupedCache = grouped;
  memberVotesPollsPage =
    normalizeMemberVotesPage(
      pollsPage,
      abstimmungen.length,
      MEMBER_VOTES_POLLS_PAGE_SIZE
    ).page;

  if (
    !termine.length
    && !abstimmungen.length
  ) {

    container.innerHTML = `
<article class="calendar-card">
  <div>
    <h3>Keine Teilnahmen</h3>
    <p>
      Zu kommenden Terminen und Internem hast du derzeit nichts abgestimmt.
    </p>
  </div>
</article>
    `;

    return;

  }

  const pagedPolls =
    paginateMemberVotesItems(
      abstimmungen,
      memberVotesPollsPage,
      MEMBER_VOTES_POLLS_PAGE_SIZE
    );

  container.innerHTML = `

${renderMemberVotesSection(
  'Termine',
  renderMemberVotesCards(termine),
  'Keine anstehenden Termine mit deiner Antwort.'
)}

${renderMemberVotesSection(
  'Abstimmungen',
  renderMemberVotesCards(pagedPolls.items),
  'Keine Abstimmungen im Internen.'
)}

<div
  id="member-votes-polls-pagination"
  class="member-votes-pagination-wrap"
  hidden></div>

  `;

  renderMemberVotesPagination(
    container.querySelector(
      '#member-votes-polls-pagination'
    ),
    abstimmungen.length,
    pagedPolls.page
  );

}
