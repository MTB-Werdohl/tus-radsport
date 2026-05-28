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

  const enriched =
    await Promise.all(
      modules.map(async (module) => {

        const entity =
          await fetchFeedbackEntityTitle(
            module.entity_type,
            module.entity_id
          );

        const answerCount =
          await countFeedbackAnswers(
            module.id
          );

        return {
          module,
          entity,
          answerCount
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
            row.entity?.title
              || `ID ${module.entity_id}`
          );

        const entityTypeLabel =
          getFeedbackEntityTypeLabel(
            module.entity_type
          );

        return `

<article class="event-card feedback-admin-card">

  <div class="event-header">

    <h2>
      ${escapeAdminHtml(module.question)}
    </h2>

    <span class="feedback-admin-badge">
      ${escapeAdminHtml(
        getFeedbackTypeLabel(module.type)
      )}
    </span>

  </div>

  <p>
    ${escapeAdminHtml(entityTypeLabel)}:
    <strong>${entityTitle}</strong>
  </p>

  <p>
    Antworten:
    <strong>${row.answerCount}</strong>
  </p>

  <div class="feedback-admin-card-actions">

    <a
      href="/admin/feedback_results.html?module_id=${module.id}"
      class="new-button">

      Auswertung

    </a>

    <a
      href="${getFeedbackEntityEditUrl(
        module.entity_type,
        module.entity_id
      )}">

      Inhalt bearbeiten

    </a>

  </div>

</article>

`;

      })
      .join('');

}
