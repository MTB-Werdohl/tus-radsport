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

  if (
    member.rolle
    && member.rolle.trim().toLowerCase() === 'guest'
  ) {
    return `${baseName} (Gast)`;
  }

  return baseName;

}

function formatFeedbackResultsMemberNameFromEvent(
  row
) {

  if (row.member_anonymized_at) {
    return 'Anonym (Account gelöscht)';
  }

  const name =
    [
      row.member_vorname,
      row.member_nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  const baseName =
    name
    || row.member_email
    || 'Mitglied';

  if (
    String(row.member_rolle || '')
      .trim()
      .toLowerCase() === 'public'
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

function formatFeedbackCancellationDisplay(
  reasonCode,
  comment
) {

  if (!reasonCode) {
    return '—';
  }

  const label =
    formatFeedbackCancellationReasonLabel(
      reasonCode
    );

  const freeText =
    String(comment || '')
      .trim();

  if (
    reasonCode === 'sonstiges'
    && freeText
  ) {
    return `${label}: ${freeText}`;
  }

  return label;

}

function compareFeedbackResultsRows(
  left,
  right
) {

  const leftTime =
    new Date(left.updatedAt || 0).getTime();

  const rightTime =
    new Date(right.updatedAt || 0).getTime();

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.name.localeCompare(
    right.name,
    'de'
  );

}

function buildFeedbackResultsDisplayRows(
  module,
  answers,
  participationEvents,
  entityRecurring
) {

  const historyMode =
    isFeedbackEventResultsHistoryMode(
      module,
      entityRecurring
    );

  if (!historyMode) {

    return (answers || [])
      .map((row) => {

        let answerLabel;

        if (
          module.type
          === window.siteConfig.feedback.types.poll
        ) {
          answerLabel =
            formatFeedbackPollAnswerDisplay(
              module,
              row
            );
        } else if (
          isFeedbackEventSubscriptionMode(
            module,
            entityRecurring
          )
        ) {
          answerLabel =
            isFeedbackSubscriptionAnswer(
              row.answer
            )
              ? 'Ja'
              : 'Nein';
        } else {
          answerLabel =
            formatFeedbackAnswerLabel(
              module,
              row.answer,
              entityRecurring
            );
        }

        return {
          name:
            formatFeedbackMemberName(row),
          email:
            row.members?.email || '—',
          answerLabel,
          firstAnswerAt:
            row.created_at,
          updatedAt:
            row.updated_at,
          reasonLabel: null
        };

      })
      .sort(compareFeedbackResultsRows);

  }

  const yes =
    window.siteConfig.feedback.answers.yes;

  const maybe =
    window.siteConfig.feedback.answers.maybe;

  const byMember =
    new Map();

  (participationEvents || [])
    .slice()
    .sort((left, right) => {

      const leftTime =
        new Date(left.created_at || 0).getTime();

      const rightTime =
        new Date(right.created_at || 0).getTime();

      return leftTime - rightTime;

    })
    .forEach((event) => {

      const memberId =
        event.member_id;

      if (!memberId) {
        return;
      }

      let row =
        byMember.get(memberId);

      if (!row) {

        row = {
          memberId,
          name:
            formatFeedbackResultsMemberNameFromEvent(
              event
            ),
          email:
            event.member_email || '—',
          firstAnswerAt:
            event.created_at,
          updatedAt:
            event.created_at,
          currentAnswer: null,
          withdrawn: false,
          withdrawReason: null,
          withdrawComment: null
        };

        byMember.set(
          memberId,
          row
        );

      }

      const eventTime =
        new Date(event.created_at).getTime();

      const firstTime =
        new Date(row.firstAnswerAt).getTime();

      if (
        Number.isFinite(eventTime)
        && eventTime < firstTime
      ) {
        row.firstAnswerAt =
          event.created_at;
      }

      if (
        Number.isFinite(eventTime)
        && eventTime
          >= new Date(row.updatedAt).getTime()
      ) {
        row.updatedAt =
          event.created_at;
      }

      const toAnswer =
        event.to_answer == null
          ? null
          : String(event.to_answer)
            .trim()
            .toLowerCase();

      if (toAnswer == null) {

        row.withdrawn = true;
        row.currentAnswer = null;
        row.withdrawReason =
          event.cancellation_reason_code
          || null;
        row.withdrawComment =
          event.comment || null;

      } else if (
        toAnswer === yes
        || toAnswer === maybe
      ) {

        row.withdrawn = false;
        row.currentAnswer = toAnswer;
        row.withdrawReason = null;
        row.withdrawComment = null;

      }

    });

  (answers || []).forEach((answerRow) => {

    const memberId =
      answerRow.member_id;

    if (!memberId) {
      return;
    }

    let row =
      byMember.get(memberId);

    if (!row) {

      row = {
        memberId,
        name:
          formatFeedbackMemberName(
            answerRow
          ),
        email:
          answerRow.members?.email
          || '—',
        firstAnswerAt:
          answerRow.created_at,
        updatedAt:
          answerRow.updated_at,
        currentAnswer: null,
        withdrawn: false,
        withdrawReason: null,
        withdrawComment: null
      };

      byMember.set(
        memberId,
        row
      );

    } else {

      row.name =
        formatFeedbackMemberName(
          answerRow
        );
      row.email =
        answerRow.members?.email
        || row.email;

    }

    const answerCode =
      String(answerRow.answer || '')
        .trim()
        .toLowerCase();

    row.currentAnswer =
      answerCode || null;
    row.withdrawn = false;
    row.withdrawReason = null;
    row.withdrawComment = null;

    if (answerRow.created_at) {

      const createdTime =
        new Date(
          answerRow.created_at
        ).getTime();

      const firstTime =
        new Date(
          row.firstAnswerAt || 0
        ).getTime();

      if (
        !row.firstAnswerAt
        || createdTime < firstTime
      ) {
        row.firstAnswerAt =
          answerRow.created_at;
      }

    }

    if (answerRow.updated_at) {
      row.updatedAt =
        answerRow.updated_at;
    }

  });

  return [...byMember.values()]
    .map((row) => {

      if (row.withdrawn) {

        return {
          name: row.name,
          email: row.email,
          answerLabel: 'Nein',
          firstAnswerAt:
            row.firstAnswerAt,
          updatedAt:
            row.updatedAt,
          reasonLabel:
            formatFeedbackCancellationDisplay(
              row.withdrawReason,
              row.withdrawComment
            )
        };

      }

      if (
        row.currentAnswer === yes
        || row.currentAnswer === maybe
      ) {

        return {
          name: row.name,
          email: row.email,
          answerLabel:
            formatFeedbackResultsAnswerShort(
              row.currentAnswer
            ),
          firstAnswerAt:
            row.firstAnswerAt,
          updatedAt:
            row.updatedAt,
          reasonLabel: '—'
        };

      }

      return null;

    })
    .filter(Boolean)
    .sort(compareFeedbackResultsRows);

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
  displayRows,
  entityRecurring,
  options = {}
) {

  if (!displayRows.length) {

    return `
<p class="admin-hint">
  Noch keine Antworten.
</p>
`;

  }

  const compactTable =
    options.compactTable === true;

  const hideEmailColumn =
    options.hideEmailColumn === true;

  const historyMode =
    !compactTable
    && isFeedbackEventResultsHistoryMode(
      module,
      entityRecurring
    );

  const rows =
    displayRows
      .map((row) => {

        if (compactTable) {

          return `
<tr>

<td>
  ${escapeAdminHtml(row.name)}
</td>

<td class="feedback-admin-answer-cell">
  ${escapeAdminHtml(row.answerLabel)}
</td>

</tr>
`;

        }

        if (historyMode) {

          return `
<tr>

<td>
  ${escapeAdminHtml(row.name)}
</td>

${
  hideEmailColumn
    ? ''
    : `
<td>
  ${escapeAdminHtml(row.email)}
</td>
`
}

<td class="feedback-admin-answer-cell">
  ${escapeAdminHtml(row.answerLabel)}
</td>

<td>
  ${escapeAdminHtml(
    formatFeedbackDateTime(
      row.firstAnswerAt
    )
  )}
</td>

<td>
  ${escapeAdminHtml(
    formatFeedbackDateTime(
      row.updatedAt
    )
  )}
</td>

<td>
  ${escapeAdminHtml(
    row.reasonLabel || '—'
  )}
</td>

</tr>
`;

        }

        return `
<tr>

<td>
  ${escapeAdminHtml(row.name)}
</td>

${
  hideEmailColumn
    ? ''
    : `
<td>
  ${escapeAdminHtml(row.email)}
</td>
`
}

<td class="feedback-admin-answer-cell">
  ${escapeAdminHtml(row.answerLabel)}
</td>

<td>
  ${escapeAdminHtml(
    formatFeedbackDateTime(
      row.firstAnswerAt
    )
  )}
</td>

<td>
  ${escapeAdminHtml(
    formatFeedbackDateTime(
      row.updatedAt
    )
  )}
</td>

</tr>
`;

      })
      .join('');

  const head =
    compactTable
      ? `
<th>Name</th>
<th>Antwort</th>
`
      : historyMode
        ? `
<th>Name</th>
${hideEmailColumn ? '' : '<th>E-Mail</th>'}
<th>Antwort</th>
<th>Erstantwort</th>
<th>Aktualisiert</th>
<th>Absagegrund</th>
`
        : `
<th>Name</th>
${hideEmailColumn ? '' : '<th>E-Mail</th>'}
<th>Antwort</th>
<th>Erstantwort</th>
<th>Aktualisiert</th>
`;

  const tableClass =
    compactTable
      ? 'feedback-admin-table feedback-admin-table--results feedback-admin-table--compact'
      : 'feedback-admin-table feedback-admin-table--results';

  return `

<div class="feedback-admin-table-wrap${
  compactTable
    ? ' feedback-admin-table-wrap--compact'
    : ''
}">

<table class="${tableClass}">

<thead>

<tr>
  ${head}
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
  displayRows,
  entityRecurring
) {

  const historyMode =
    isFeedbackEventResultsHistoryMode(
      module,
      entityRecurring
    );

  const header =
    historyMode
      ? [
        'Name',
        'E-Mail',
        'Antwort',
        'Erstantwort',
        'Aktualisiert',
        'Absagegrund'
      ]
      : [
        'Name',
        'E-Mail',
        'Antwort',
        'Erstantwort',
        'Aktualisiert'
      ];

  const lines =
    displayRows.map((row) => {

      const base = [
        row.name,
        row.email,
        row.answerLabel,
        formatFeedbackDateTime(
          row.firstAnswerAt
        ),
        formatFeedbackDateTime(
          row.updatedAt
        )
      ];

      if (historyMode) {
        base.push(
          row.reasonLabel || '—'
        );
      }

      return base;

    });

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
  displayRows,
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
          displayRows,
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

async function loadFeedbackResultsForModule(
  moduleId,
  container,
  options = {}
) {

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

  const historyMode =
    isFeedbackEventResultsHistoryMode(
      module,
      entityRecurring
    );

  const titleEl =
    options.titleElement || null;

  if (titleEl) {
    titleEl.textContent =
      formatFeedbackResultsEntityTitle(
        module,
        entity
      );
  }

  container.innerHTML = `
<p class="admin-hint">
  Auswertung wird geladen …
</p>
  `;

  try {

    const answers =
      await fetchFeedbackAnswersForModule(
        module.id
      );

    const editable =
      options.editable === true
      && !entityRecurring
      && module.type
        === window.siteConfig.feedback.types.yesMaybe
      && historyMode;

    if (
      editable
      && typeof renderEditableEventParticipants
        === 'function'
    ) {

      const reload = () =>
        loadFeedbackResultsForModule(
          moduleId,
          container,
          options
        );

      await renderEditableEventParticipants(
        module,
        answers,
        container,
        {
          reload,
          onParticipantsChanged:
            options.onParticipantsChanged
        }
      );

      return;

    }

    let participationEvents =
      [];

    if (historyMode) {

      const changeResult =
        await listFeedbackParticipationChanges({
          moduleId: module.id,
          limit: 500,
          offset: 0
        });

      if (changeResult?.error) {
        throw changeResult.error;
      }

      participationEvents =
        changeResult.rows || [];

    }

    const displayRows =
      buildFeedbackResultsDisplayRows(
        module,
        answers,
        participationEvents,
        entityRecurring
      );

    const showSummary =
      options.showSummary !== false;

    const showFreeTextList =
      options.showFreeTextList !== false;

    const showExport =
      options.showExport !== false;

    const compactTable =
      options.compactTable === true;

    const hideEmailColumn =
      options.hideEmailColumn === true;

    const summaryHtml =
      showSummary
        ? renderFeedbackSummaryHtml(
          module,
          buildFeedbackSummary(
            module,
            answers
          ),
          entityRecurring
        )
        : '';

    const freeTextHtml =
      showFreeTextList
        ? renderFeedbackFreeTextResponses(
          module,
          answers
        )
        : '';

    container.innerHTML = `

${summaryHtml}

${freeTextHtml}

${
  showExport
    ? `
<div class="feedback-admin-results-actions">

<button
  type="button"
  class="new-button"
  data-feedback-export-csv>

  CSV exportieren

</button>

</div>
`
    : ''
}

${compactTable ? '' : `
<h2>
  Rückmeldungen
</h2>
`}

${renderFeedbackAnswersTable(
  module,
  displayRows,
  entityRecurring,
  {
    compactTable,
    hideEmailColumn
  }
)}

`;

    if (showExport) {

      container
        .querySelector('[data-feedback-export-csv]')
        ?.addEventListener('click', () => {

          downloadFeedbackCsv(
            module,
            displayRows,
            entityRecurring
          );

        });

    }

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

  const titleEl =
    document.getElementById(
      'feedback-results-title'
    );

  await loadFeedbackResultsForModule(
    moduleId,
    container,
    {
      titleElement: titleEl
    }
  );

}

function getFeedbackEntityTypeLabel(entityType) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {
    return 'Termin';
  }

  return entityType;

}
