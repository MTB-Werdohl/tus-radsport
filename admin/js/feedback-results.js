function formatFeedbackMemberName(memberRow) {

  const member =
    memberRow?.members;

  if (!member) {
    return 'Mitglied';
  }

  const name =
    [
      member.vorname,
      member.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  return name || member.email || 'Mitglied';

}

function formatFeedbackDateTime(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

}

function renderFeedbackSummaryHtml(
  module,
  summary
) {

  const items =
    Object.entries(summary.counts)
      .map(([key, count]) => {

        const label =
          module.type
          === window.siteConfig.feedback.types.poll
            ? (
              getFeedbackPollOptionLabel(
                module,
                key
              )
              || '(Option entfernt)'
            )
            : formatFeedbackAnswerLabel(
              module,
              key
            );

        return `
<li>
  <strong>${escapeAdminHtml(label)}</strong>:
  ${count}
</li>
`;

      })
      .join('');

  return `

<section class="feedback-admin-summary">

<h2>
  Zusammenfassung
</h2>

<p>
  Antworten gesamt:
  <strong>${summary.total}</strong>
</p>

<ul class="feedback-admin-summary-list">
  ${items}
</ul>

</section>

`;

}

function renderFeedbackAnswersTable(
  module,
  answers
) {

  if (!answers.length) {

    return `
<p class="admin-hint">
  Noch keine Antworten.
</p>
`;

  }

  const rows =
    answers
      .map((row) => `

<tr>

<td>
  ${escapeAdminHtml(
    formatFeedbackMemberName(row)
  )}
</td>

<td>
  ${escapeAdminHtml(
    row.members?.email || '—'
  )}
</td>

<td>
  ${escapeAdminHtml(
    formatFeedbackAnswerLabel(
      module,
      row.answer
    )
  )}
</td>

<td>
  ${escapeAdminHtml(
    row.comment || '—'
  )}
</td>

<td>
  ${escapeAdminHtml(
    formatFeedbackDateTime(row.updated_at)
  )}
</td>

</tr>

`)
      .join('');

  return `

<div class="feedback-admin-table-wrap">

<table class="feedback-admin-table">

<thead>

<tr>

<th>Name</th>
<th>E-Mail</th>
<th>Antwort</th>
<th>Kommentar</th>
<th>Aktualisiert</th>

</tr>

</thead>

<tbody>
  ${rows}
</tbody>

</table>

</div>

`;

}

function buildFeedbackCsv(
  module,
  answers
) {

  const header = [
    'Name',
    'E-Mail',
    'Antwort',
    'Kommentar',
    'Aktualisiert'
  ];

  const lines =
    answers.map((row) => [

      formatFeedbackMemberName(row),
      row.members?.email || '',
      formatFeedbackAnswerLabel(
        module,
        row.answer
      ),
      row.comment || '',
      formatFeedbackDateTime(row.updated_at)

    ]);

  return [header, ...lines]
    .map((line) =>

      line
        .map((cell) =>
          `"${String(cell).replace(/"/g, '""')}"`
        )
        .join(';')

    )
    .join('\n');

}

function downloadFeedbackCsv(
  module,
  answers
) {

  const entityTitle =
    window.__feedbackResultsEntity?.title
    || 'feedback';

  const safeName =
    entityTitle
      .replace(/[^\w\-]+/g, '-')
      .slice(0, 40);

  const blob =
    new Blob(
      [
        `\uFEFF${buildFeedbackCsv(
          module,
          answers
        )}`
      ],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;
  link.download =
    `feedback-${safeName}.csv`;

  link.click();

  URL.revokeObjectURL(url);

}

async function loadFeedbackResults() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const moduleId =
    parseInt(
      params.get('module_id'),
      10
    );

  const container =
    document.getElementById(
      'feedback-results-content'
    );

  if (
    !moduleId
    || !container
  ) {

    if (container) {
      container.innerHTML =
        '<p class="admin-hint">Kein Modul angegeben.</p>';
    }

    return;

  }

  const module =
    await fetchFeedbackModuleById(
      moduleId
    );

  if (!module) {

    container.innerHTML =
      '<p class="admin-hint">Feedback-Modul nicht gefunden.</p>';

    return;

  }

  const entity =
    await fetchFeedbackEntityTitle(
      module.entity_type,
      module.entity_id
    );

  window.__feedbackResultsEntity =
    entity;

  const answers =
    await fetchFeedbackAnswersForModule(
      module.id
    );

  const summary =
    buildFeedbackSummary(
      module,
      answers
    );

  document
    .getElementById('feedback-results-title')
    .textContent =
      module.question;

  document
    .getElementById('feedback-results-meta')
    .innerHTML = `

${escapeAdminHtml(
  getFeedbackTypeLabel(module.type)
)}

·

${escapeAdminHtml(
  getFeedbackEntityTypeLabel(
    module.entity_type
  )
)}:

<a href="${getFeedbackEntityEditUrl(
  module.entity_type,
  module.entity_id
)}">

${escapeAdminHtml(
  entity?.title
    || `ID ${module.entity_id}`
)}

</a>

`;

  container.innerHTML = `

${renderFeedbackSummaryHtml(
  module,
  summary
)}

<div class="feedback-admin-results-actions">

<button
  id="feedback-export-csv"
  type="button"
  class="new-button">

  CSV exportieren

</button>

</div>

<h2>
  Einzelantworten
</h2>

${renderFeedbackAnswersTable(
  module,
  answers
)}

`;

  document
    .getElementById('feedback-export-csv')
    ?.addEventListener('click', () => {

      downloadFeedbackCsv(
        module,
        answers
      );

    });

}

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
