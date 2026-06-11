const PARTICIPATION_CHANGES_PAGE_SIZE = 25;

let participationChangesPage = 1;
let participationChangesModuleId = null;
let participationChangesModules = [];

function formatParticipationMemberName(row) {

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

function formatParticipationChangeReason(row) {

  if (
    !row.cancellation_reason_code
  ) {
    return '—';
  }

  const label =
    formatFeedbackCancellationReasonLabel(
      row.cancellation_reason_code
    );

  const comment =
    String(row.comment || '')
      .trim();

  if (
    row.cancellation_reason_code === 'sonstiges'
    && comment
  ) {
    return `${label}: ${comment}`;
  }

  return label;

}

function formatParticipationDateTime(value) {

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

function renderParticipationChangeRow(row) {

  const fromLabel =
    formatFeedbackParticipationAnswerLabel(
      row.from_answer
    );

  const toLabel =
    formatFeedbackParticipationAnswerLabel(
      row.to_answer
    );

  const eventTitle =
    row.event_title
    || `Termin #${row.event_id || '?'}`;

  const eventLink =
    row.event_slug
      ? getEventUrl(row.event_slug)
      : (
        row.event_id
          ? `/admin/termine_edit.html?id=${row.event_id}`
          : '#'
      );

  return `
<article class="participation-change-card">

  <div class="participation-change-card__meta">

    <time datetime="${escapeAdminHtml(row.created_at || '')}">
      ${escapeAdminHtml(
        formatParticipationDateTime(
          row.created_at
        )
      )}
    </time>

  </div>

  <h2 class="participation-change-card__title">

    <a href="${escapeAdminHtml(eventLink)}">
      ${escapeAdminHtml(eventTitle)}
    </a>

  </h2>

  <dl class="participation-change-card__details">

    <div>
      <dt>Person</dt>
      <dd>${escapeAdminHtml(
        formatParticipationMemberName(row)
      )}</dd>
    </div>

    <div>
      <dt>Änderung</dt>
      <dd>${escapeAdminHtml(fromLabel)}
        → ${escapeAdminHtml(toLabel)}</dd>
    </div>

    <div>
      <dt>Grund</dt>
      <dd>${escapeAdminHtml(
        formatParticipationChangeReason(row)
      )}</dd>
    </div>

  </dl>

</article>
`;

}

async function loadParticipationChangeModules() {

  const modules =
    await fetchAllFeedbackModules();

  const entityMap =
    await fetchFeedbackEntityRecordsForModules(
      modules
    );

  participationChangesModules =
    (modules || [])
      .filter((module) => {

        if (
          module.entity_type
          !== window.siteConfig.feedback.entityTypes.event
        ) {
          return false;
        }

        if (
          module.type
          !== window.siteConfig.feedback.types.yesMaybe
          && module.type !== 'yes_no_comment'
        ) {
          return false;
        }

        const entity =
          getFeedbackEntityRecordFromMap(
            entityMap,
            module
          );

        return entity?.recurring !== true;

      })
      .sort((left, right) => {

        const leftEntity =
          getFeedbackEntityRecordFromMap(
            entityMap,
            left
          );

        const rightEntity =
          getFeedbackEntityRecordFromMap(
            entityMap,
            right
          );

        return String(
          leftEntity?.title || ''
        ).localeCompare(
          String(rightEntity?.title || ''),
          'de'
        );

      });

  const select =
    document.getElementById(
      'participation-changes-filter'
    );

  if (!select) {
    return;
  }

  const options =
    participationChangesModules
      .map((module) => {

        const entity =
          getFeedbackEntityRecordFromMap(
            entityMap,
            module
          );

        const title =
          entity?.title
          || `Termin #${module.entity_id}`;

        return `
<option value="${module.id}">
  ${escapeAdminHtml(title)}
</option>
`;

      })
      .join('');

  select.innerHTML =
    '<option value="">Alle Einzeltermine</option>'
    + options;

}

async function renderParticipationChanges() {

  const container =
    document.getElementById(
      'participation-changes-list'
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="admin-hint">Änderungen werden geladen …</p>';

  const offset =
    (participationChangesPage - 1)
    * PARTICIPATION_CHANGES_PAGE_SIZE;

  const result =
    await listFeedbackParticipationChanges({
      moduleId:
        participationChangesModuleId,
      limit:
        PARTICIPATION_CHANGES_PAGE_SIZE,
      offset
    });

  if (result?.error) {

    container.innerHTML =
      `<p class="admin-hint admin-hint--error">${escapeAdminHtml(
        result.error.message
          || 'Laden fehlgeschlagen.'
      )}</p>`;

    return;

  }

  const rows =
    result.rows || [];

  if (!rows.length) {

    container.innerHTML =
      '<p class="admin-hint">Noch keine Teilnahmeänderungen für Einzeltermine.</p>';

    renderAdminPagination({
      containerId: 'participation-changes-pagination',
      currentPage: participationChangesPage,
      pageSize: PARTICIPATION_CHANGES_PAGE_SIZE,
      totalItems: 0,
      onPageChange: (page) => {

        participationChangesPage = page;

        void renderParticipationChanges();

      }
    });

    return;

  }

  container.innerHTML =
    rows
      .map(renderParticipationChangeRow)
      .join('');

  const hasMore =
    rows.length === PARTICIPATION_CHANGES_PAGE_SIZE;

  const estimatedTotal =
    hasMore
      ? (
        participationChangesPage
        * PARTICIPATION_CHANGES_PAGE_SIZE
        + 1
      )
      : (
        (participationChangesPage - 1)
        * PARTICIPATION_CHANGES_PAGE_SIZE
        + rows.length
      );

  renderAdminPagination({
    containerId: 'participation-changes-pagination',
    currentPage: participationChangesPage,
    pageSize: PARTICIPATION_CHANGES_PAGE_SIZE,
    totalItems: estimatedTotal,
    onPageChange: (page) => {

      participationChangesPage = page;

      void renderParticipationChanges();

    }
  });

}

async function loadParticipationChanges() {

  await loadParticipationChangeModules();

  const select =
    document.getElementById(
      'participation-changes-filter'
    );

  if (
    select
    && !select.dataset.bound
  ) {

    select.dataset.bound = 'true';

    select.addEventListener('change', () => {

      const value =
        parseInt(select.value, 10);

      participationChangesModuleId =
        Number.isFinite(value)
          ? value
          : null;

      participationChangesPage = 1;

      void renderParticipationChanges();

    });

  }

  await renderParticipationChanges();

}
