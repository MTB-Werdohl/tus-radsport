function formatFeedbackResultsEntityTitle(
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

function formatFeedbackMemberName(memberRow) {

  const member =
    memberRow?.members;

  if (!member) {
    return 'Mitglied';
  }

  if (member.anonymized_at) {
    return 'Anonym (Account gelöscht)';
  }

  const name =
    [
      member.vorname,
      member.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  const baseName =
    name || member.email || 'Mitglied';

  if (
    member.rolle
    && member.rolle.trim().toLowerCase() === 'public'
  ) {
    return `${baseName} (extern)`;
  }

  return baseName;

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

function renderFeedbackFreeTextResponses(
  module,
  answers
) {

  if (
    module.type
    !== window.siteConfig.feedback.types.poll
  ) {
    return '';
  }

  const texts =
    getFeedbackPollFreeTextResponses(
      module,
      answers
    );

  if (!texts.length) {
    return '';
  }

  const label =
    getFeedbackPollFreeTextOptionLabel(
      module.config
    );

  const items =
    texts
      .map((text) => `
        <li>${escapeAdminHtml(text)}</li>
      `)
      .join('');

  return `
<section class="feedback-admin-freetext-list">

<h3>
  ${escapeAdminHtml(label)} — Eingaben
</h3>

<ul class="feedback-card-freetext-items">
  ${items}
</ul>

</section>
  `;

}

function renderFeedbackSummaryHtml(
  module,
  summary,
  entityRecurring
) {

  const counts =
    summary?.counts || {};

  const isEventYesMaybe =
    module?.entity_type
    === window.siteConfig.feedback.entityTypes.event
    && (
      module?.type
      === window.siteConfig.feedback.types.yesMaybe
      || module?.type === 'yes_no_comment'
    );

  const subscriptionMode =
    isFeedbackEventSubscriptionMode(
      module,
      entityRecurring
    );

  if (subscriptionMode) {

    const count =
      countFeedbackSubscriptionAnswers(
        summary
      );

    return `

<section class="feedback-admin-summary">

<h2>
  Zusammenfassung
</h2>

<p>
  Rückmeldungen gesamt:
  <strong>${summary.total}</strong>
</p>

<ul class="feedback-admin-summary-list">
  <li>
    <strong>${escapeAdminHtml(FEEDBACK_EVENT_SUBSCRIPTION_LABEL)}</strong>:
    ${count}
  </li>
</ul>

</section>

`;

  }

  let keys = [];

  if (isEventYesMaybe) {

    keys = [
      window.siteConfig.feedback.answers.yes,
      window.siteConfig.feedback.answers.maybe
    ];

  } else if (
    module.type
    === window.siteConfig.feedback.types.poll
  ) {

    keys =
      getFeedbackPollAllOptions(
        module.config
      ).map((option) => option.id);

  } else {

    keys =
      Object.keys(counts);

  }

  const items =
    keys
      .map((key) => {

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
            : formatFeedbackEventAnswerAdminLabel(
              module,
              key,
              entityRecurring
            );

        const count =
          counts[key] || 0;

        return `
<li>
  <strong>${escapeAdminHtml(label)}</strong>:
  ${count}
</li>
`;

      })
      .join('');

  const totalLine =
    isEventYesMaybe
      ? `
<p class="admin-hint">
  Rückmeldungen gesamt:
  <strong>${summary.total}</strong>
  (Planung nur anhand verbindlicher Teilnehmer)
</p>
`
      : `
<p>
  Antworten gesamt:
  <strong>${summary.total}</strong>
</p>
`;

  return `

<section class="feedback-admin-summary">

<h2>
  Zusammenfassung
</h2>

${totalLine}

<ul class="feedback-admin-summary-list">
  ${items}
</ul>

</section>

`;

}

function renderFeedbackAnswersTable(
  module,
  answers,
  entityRecurring
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

<td class="feedback-admin-member-cell">

  ${typeof renderMemberAvatarHtml === 'function'
    ? renderMemberAvatarHtml(
      row.members || {},
      'member-avatar--sm'
    )
    : ''}

  <span>
    ${escapeAdminHtml(
      formatFeedbackMemberName(row)
    )}
  </span>

</td>

<td>
  ${escapeAdminHtml(
    row.members?.email || '—'
  )}
</td>

<td>
  ${escapeAdminHtml(
    module.type
    === window.siteConfig.feedback.types.poll
      ? formatFeedbackPollAnswerDisplay(
        module,
        row
      )
      : formatFeedbackAnswerLabel(
        module,
        row.answer,
        entityRecurring
      )
  )}
</td>

<td>
  ${escapeAdminHtml(
    module.type
    === window.siteConfig.feedback.types.poll
      ? '—'
      : (row.comment || '—')
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
  answers,
  entityRecurring
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
      module.type
      === window.siteConfig.feedback.types.poll
        ? formatFeedbackPollAnswerDisplay(
          module,
          row
        )
        : formatFeedbackAnswerLabel(
          module,
          row.answer,
          entityRecurring
        ),
      module.type
      === window.siteConfig.feedback.types.poll
        ? ''
        : (row.comment || ''),
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
  answers,
  entityRecurring
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
          answers,
          entityRecurring
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

  const entityRecurring =
    entity?.recurring === true;

  try {

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
        formatFeedbackResultsEntityTitle(
          module,
          entity
        );

    container.innerHTML = `

${renderFeedbackSummaryHtml(
  module,
  summary,
  entityRecurring
)}

${renderFeedbackFreeTextResponses(
  module,
  answers
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
  answers,
  entityRecurring
)}

`;

    document
      .getElementById('feedback-export-csv')
      ?.addEventListener('click', () => {

        downloadFeedbackCsv(
          module,
          answers,
          entityRecurring
        );

      });

  } catch (error) {

    console.error(error);

    container.innerHTML = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error?.message
    || 'Auswertung konnte nicht geladen werden.'
  )}
</p>
    `;

  }

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
