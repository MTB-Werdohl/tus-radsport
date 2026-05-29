function getFeedbackEntityEditUrl(
  entityType,
  entityId
) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {
    return `/admin/termine_edit.html?id=${entityId}`;
  }

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.news
  ) {
    return `/admin/news_edit.html?id=${entityId}`;
  }

  return '#';

}

function getFeedbackEntityTypeLabel(entityType) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {
    return 'Termin';
  }

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.news
  ) {
    return 'News';
  }

  return entityType;

}

function renderFeedbackSummaryLines(
  module,
  summary
) {

  const counts =
    summary?.counts || {};

  let keys = [];

  if (
    module.type
    === window.siteConfig.feedback.types.yesMaybe
  ) {

    keys = [
      window.siteConfig.feedback.answers.yes,
      window.siteConfig.feedback.answers.maybe
    ];

  } else if (
    module.type
    === window.siteConfig.feedback.types.yesNoComment
  ) {

    keys = [
      window.siteConfig.feedback.answers.yes,
      window.siteConfig.feedback.answers.no
    ];

  } else if (
    module.type
    === window.siteConfig.feedback.types.poll
  ) {

    const config =
      normalizeFeedbackPollConfig(
        module.config
      );

    keys =
      config.options.map(
        (option) => option.id
      );

  } else {

    keys =
      Object.keys(counts);

  }

  const lines =
    keys.map((key) => {

      const label =
        formatFeedbackAnswerLabel(
          module,
          key
        );

      const count =
        counts[key] || 0;

      return `
        <div class="feedback-card-answer-row">
          ${escapeAdminHtml(label)}:
          <strong>${count}</strong>
        </div>
      `;

    })
      .join('');

  if (!lines) {
    return `
      <div class="feedback-card-answer-row">
        Keine Antworten
      </div>
    `;
  }

  return lines;

}

function formatFeedbackEntityTitle(
  module,
  entity
) {

  if (entity?.title) {
    return entity.title;
  }

  const typeLabel =
    getFeedbackEntityTypeLabel(
      module.entity_type
    );

  return `${typeLabel} nicht gefunden`;

}

async function loadFeedbackList() {

  const container =
    document.getElementById('feedback-list');

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="admin-hint">Feedback wird geladen …</p>';

  const modules =
    await fetchAllFeedbackModules();

  if (!modules.length) {

    container.innerHTML =
      '<p class="admin-hint">Noch keine Feedback-Module angelegt.</p>';

    return;

  }

  const entityMap =
    await fetchFeedbackEntityTitlesForModules(
      modules
    );

  const validModules = [];
  const orphanedModules = [];

  modules.forEach((module) => {

    const entity =
      getFeedbackEntityFromMap(
        entityMap,
        module
      );

    if (entity) {
      validModules.push(module);
    } else {
      orphanedModules.push(module);
    }

  });

  if (orphanedModules.length) {

    await Promise.all(
      orphanedModules.map((module) =>
        deleteFeedbackForEntity(
          module.entity_type,
          module.entity_id
        )
      )
    );

  }

  if (!validModules.length) {

    container.innerHTML =
      '<p class="admin-hint">Noch keine Feedback-Module angelegt.</p>';

    return;

  }

  const enriched =
    await Promise.all(
      validModules.map(async (module) => {

        const entity =
          getFeedbackEntityFromMap(
            entityMap,
            module
          );

        const answers =
          await fetchFeedbackAnswersForModule(
            module.id
          );

        const summary =
          buildFeedbackSummary(
            module,
            answers
          );

        return {
          module,
          entity,
          summary
        };

      })
    );

  window.__feedbackListRows =
    enriched;

  renderFeedbackList(
    enriched,
    document
      .getElementById('feedback-search')
      ?.value
      || ''
  );

  document
    .getElementById('feedback-search')
    ?.addEventListener('input', (event) => {

      renderFeedbackList(
        window.__feedbackListRows,
        event.target.value
      );

    });

}

function renderFeedbackList(
  rows,
  searchValue
) {

  const container =
    document.getElementById('feedback-list');

  if (!container) {
    return;
  }

  const query =
    String(searchValue || '')
      .trim()
      .toLowerCase();

  const filtered =
    rows.filter((row) => {

      if (!query) {
        return true;
      }

      const haystack = [
        row.module.question,
        row.entity?.title,
        getFeedbackTypeLabel(row.module.type),
        getFeedbackEntityTypeLabel(
          row.module.entity_type
        )
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);

    });

  if (!filtered.length) {

    container.innerHTML =
      '<p class="admin-hint">Keine Treffer.</p>';

    return;

  }

  container.innerHTML =
    filtered
      .map((row) => {

        const module =
          row.module;

        const entityTitle =
          escapeAdminHtml(
            formatFeedbackEntityTitle(
              module,
              row.entity
            )
          );

        const question =
          escapeAdminHtml(
            module.question || '—'
          );

        const editUrl =
          getFeedbackEntityEditUrl(
            module.entity_type,
            module.entity_id
          );

        const disabledBadge =
          module.enabled === false
            ? '<span class="feedback-card-disabled">Deaktiviert</span>'
            : '';

        return `

<article class="event-card feedback-admin-card${module.enabled === false ? ' feedback-admin-card--disabled' : ''}">

  <div class="event-header">

    <div class="feedback-card-body">

      <div class="feedback-card-title">
        ${entityTitle}
        ${disabledBadge}
      </div>

      <div class="feedback-card-question">
        ${question}
      </div>

      <div class="feedback-card-answers">
        <div class="feedback-card-answers-label">
          Antworten:
        </div>
        ${renderFeedbackSummaryLines(
          module,
          row.summary
        )}
      </div>

    </div>

    <div class="actions feedback-card-actions">

      <a
        href="/admin/feedback_results.html?module_id=${module.id}"
        class="new-button">

        Auswertung

      </a>

      <a
        href="${editUrl}"
        class="secondary-button">

        Bearbeiten

      </a>

    </div>

  </div>

</article>

`;

      })
      .join('');

}
