function isTerminStillUpcoming(termin) {

  const today =
    new Date();

  today.setHours(0, 0, 0, 0);

  if (termin?.recurring) {

    const recurringEnd =
      termin.endRecur
        ? parseTerminDateOnly(
          termin.endRecur
        )
        : null;

    if (
      recurringEnd
      && recurringEnd < today
    ) {
      return false;
    }

    return true;

  }

  const endDay =
    getTerminVisibilityEndDay(termin);

  if (!endDay) {
    return false;
  }

  return endDay >= today;

}

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

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.news
  ) {
    return getNewsUrl(slug);
  }

  return '/';

}

function formatMemberVoteAnswerLine(
  module,
  answerRow,
  answerLabel
) {

  const code =
    String(answerRow.answer || '')
      .trim();

  let icon = '🗳️';

  if (
    code
    === window.siteConfig.feedback.answers.yes
  ) {
    icon = '✅';
  } else if (
    code
    === window.siteConfig.feedback.answers.no
  ) {
    icon = '❌';
  } else if (
    code
    === window.siteConfig.feedback.answers.maybe
  ) {
    icon = '🤔';
  }

  return `${icon} ${answerLabel}`;

}

async function fetchMemberUpcomingVotes(
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

  const items = [];

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

    const isEvent =
      module.entity_type
      === window.siteConfig.feedback.entityTypes.event;

    if (
      isEvent
      && !isTerminStillUpcoming(entity)
    ) {
      return;
    }

    const answerLabel =
      formatFeedbackAnswerLabel(
        module,
        answerRow.answer
      );

    items.push({
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
    });

  });

  items.sort((left, right) => {

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

    return (
      new Date(right.updatedAt)
      - new Date(left.updatedAt)
    );

  });

  return items;

}

function renderMemberVotesList(
  container,
  items
) {

  if (!container) {
    return;
  }

  if (!items.length) {

    container.innerHTML = `
<article class="calendar-card">
  <div>
    <h3>Keine Abstimmungen</h3>
    <p>
      Zu kommenden Terminen hast du derzeit nichts abgestimmt.
    </p>
  </div>
</article>
    `;

    return;

  }

  container.innerHTML =
    items
      .map((item) => {

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
            )
          );

        const metaParts = [];

        if (item.dateLabel) {
          metaParts.push(
            `🗓️ ${escapeMemberHtml(item.dateLabel)}`
          );
        }

        metaParts.push(answerLine);

        if (
          item.module.type
          === window.siteConfig.feedback.types.yesNoComment
          && item.answerRow.comment
        ) {
          metaParts.push(
            `💬 ${escapeMemberHtml(
              item.answerRow.comment
            )}`
          );
        }

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

      })
      .join('');

}
