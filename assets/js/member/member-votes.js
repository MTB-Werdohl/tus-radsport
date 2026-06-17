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
        false
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
  const seenEntityIds =
    new Set();

  const yesAnswer =
    window.siteConfig.feedback
      .answers.yes;

  (answers || []).forEach((answerRow) => {

    const module =
      answerRow.feedback_modules;

    if (!module) {
      return;
    }

    if (
      module.entity_type
      !== window.siteConfig.feedback.entityTypes.event
    ) {
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

    if (
      !isTerminStillUpcoming(entity)
    ) {
      return;
    }

    const entityKey =
      String(entity.id || entity.slug);

    const answerCode =
      String(answerRow.answer || '')
        .trim();

    if (seenEntityIds.has(entityKey)) {

      const existingIndex =
        termine.findIndex((item) => {

          const itemKey =
            String(
              item.entity.id
              || item.entity.slug
            );

          return itemKey === entityKey;

        });

      if (existingIndex >= 0) {

        const existingAnswer =
          String(
            termine[existingIndex]
              .answerRow
              .answer
            || ''
          ).trim();

        if (
          answerCode === yesAnswer
          && existingAnswer
            !== yesAnswer
        ) {

          termine[existingIndex] =
            buildMemberVoteItem(
              answerRow,
              module,
              entity
            );

        }

      }

      return;

    }

    seenEntityIds.add(entityKey);

    termine.push(
      buildMemberVoteItem(
        answerRow,
        module,
        entity
      )
    );

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

  return { termine };

}

async function fetchMemberUpcomingVotes(
  memberId
) {

  const grouped =
    await fetchMemberVotesGrouped(
      memberId
    );

  return grouped.termine;

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
      false
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

function renderMemberVotesList(
  container,
  grouped
) {

  if (!container) {
    return;
  }

  const termine =
    grouped?.termine || [];

  if (!termine.length) {

    container.innerHTML = `
<article class="calendar-card">
  <div>
    <p>Keine anstehenden Termine mit deiner Zusage.</p>
  </div>
</article>
    `;

    return;

  }

  container.innerHTML =
    renderMemberVotesCards(termine);

}
