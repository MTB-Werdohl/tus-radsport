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
    || module.type === 'yes_no_comment'
  ) {

    keys = [
      window.siteConfig.feedback.answers.yes,
      window.siteConfig.feedback.answers.maybe
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

function getFeedbackVotingScopeLabel(module) {

  return module?.public_voting === true
    ? 'Public'
    : 'Intern';

}

function renderFeedbackVotingScopeLabel(module) {

  const scope =
    getFeedbackVotingScopeLabel(module);

  const scopeClass =
    scope === 'Public'
      ? 'feedback-card-scope--public'
      : 'feedback-card-scope--intern';

  return `
    <span class="feedback-card-scope ${scopeClass}">
      (${scope})
    </span>
  `;

}

let feedbackListPage = 1;
let feedbackSearchBound = false;

function compareFeedbackRowsByCreatedDesc(a, b) {

  return compareByCreatedDesc(
    a.module,
    b.module
  );

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
    enriched.sort(compareFeedbackRowsByCreatedDesc);

  feedbackListPage = 1;

  renderFeedbackList(
    window.__feedbackListRows,
    document
      .getElementById('feedback-search')
      ?.value
      || ''
  );

  if (!feedbackSearchBound) {

    feedbackSearchBound = true;

    document
      .getElementById('feedback-search')
      ?.addEventListener('input', (event) => {

        feedbackListPage = 1;

        renderFeedbackList(
          window.__feedbackListRows,
          event.target.value
        );

      });

  }

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
        ),
        getFeedbackVotingScopeLabel(
          row.module
        )
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);

    })
      .sort(compareFeedbackRowsByCreatedDesc);

  const paged =
    paginateAdminListItems(
      filtered,
      feedbackListPage
    );

  feedbackListPage = paged.page;

  if (!paged.items.length) {

    container.innerHTML =
      paged.totalItems
        ? '<p class="admin-hint">Keine Treffer auf dieser Seite.</p>'
        : '<p class="admin-hint">Keine Treffer.</p>';

    renderAdminPagination({
      containerId: 'feedback-pagination',
      totalItems: paged.totalItems,
      currentPage: paged.page,
      onPageChange(page) {
        feedbackListPage = page;
        renderFeedbackList(
          rows,
          searchValue
        );
      }
    });

    return;

  }

  container.innerHTML =
    paged.items
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
        ${renderFeedbackVotingScopeLabel(module)}
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
        class="feedback-card-btn feedback-card-btn--primary">

        Auswertung

      </a>

      <a
        href="${editUrl}"
        class="feedback-card-btn feedback-card-btn--secondary">

        Bearbeiten

      </a>

    </div>

  </div>

</article>

`;

      })
      .join('');

  renderAdminPagination({
    containerId: 'feedback-pagination',
    totalItems: paged.totalItems,
    currentPage: paged.page,
    onPageChange(page) {
      feedbackListPage = page;
      renderFeedbackList(
        rows,
        searchValue
      );
    }
  });

}
