function isAdminDraftRow(row) {

  if (!row) {
    return false;
  }

  const draft =
    window.siteConfig.visibility.draft;

  if (row.sichtbarkeit === draft) {
    return true;
  }

  if (
    row.published === false
    && (
      row.sichtbarkeit == null
      || row.sichtbarkeit === ''
    )
  ) {
    return true;
  }

  return false;

}

function getAdminDraftSortAt(row, type) {

  if (type === 'event') {
    return row.date || null;
  }

  return row.updated_at
    || row.created_at
    || null;

}

async function fetchAdminDrafts() {

  const termineResult =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select(
        'id, title, slug, date, sichtbarkeit, created_at, updated_at, created_by'
      )
      .order('date', {
        ascending: false,
        nullsFirst: false
      });

  if (termineResult.error) {
    throw termineResult.error;
  }

  const eventItems =
    (termineResult.data || [])
      .filter(isAdminDraftRow);

  const creatorMap =
    await fetchAdminMembersByIds(
      eventItems.map((item) => item.created_by)
    );

  const mappedEvents =
    eventItems.map((item) => ({
      type: 'event',
      id: item.id,
      title: item.title || 'Ohne Titel',
      slug: item.slug || '',
      createdBy: item.created_by,
      creatorLabel:
        resolveAdminContentCreatorLabel(
          item.created_by,
          creatorMap
        ),
      sortAt:
        getAdminDraftSortAt(
          item,
          'event'
        )
    }));

  return mappedEvents
    .sort((a, b) => {

      const aTime =
        a.sortAt
          ? new Date(a.sortAt).getTime()
          : 0;

      const bTime =
        b.sortAt
          ? new Date(b.sortAt).getTime()
          : 0;

      if (bTime !== aTime) {
        return bTime - aTime;
      }

      return (b.id || 0) - (a.id || 0);

    });

}

function formatDraftCreatorMeta(
  draft
) {

  if (!draft?.creatorLabel) {
    return '';
  }

  return `
                  ·

                  ${escapeAdminHtml(draft.creatorLabel)}
  `.trim();

}

function renderDraftCreatorMetaHtml(
  creatorLabel
) {

  if (!creatorLabel) {
    return '';
  }

  return `
    <p class="admin-draft-preview__meta">
      👤 ${escapeAdminHtml(creatorLabel)}
    </p>
  `;

}

async function resolveAdminDraftCreatorLabel(
  createdBy
) {

  if (!createdBy) {
    return null;
  }

  const creatorMap =
    await fetchAdminMembersByIds([
      createdBy
    ]);

  return resolveAdminContentCreatorLabel(
    createdBy,
    creatorMap
  );

}

function formatDraftListDate(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

}

function getDraftTypeLabel(type) {

  if (type === 'event') {
    return 'Termin';
  }

  return type;

}

function getDraftEditUrl(draft) {

  return `/admin/termine_edit.html?id=${draft.id}`;

}

function getDraftPreviewUrl(draft) {

  const params =
    new URLSearchParams({
      type: draft.type,
      id: String(draft.id)
    });

  if (draft.slug) {
    params.set('slug', draft.slug);
  }

  return `/admin/entwurf_vorschau.html?${params.toString()}`;

}

async function loadDraftDashboardCard() {

  const card =
    document.getElementById(
      'dashboard-drafts-card'
    );

  const meta =
    document.getElementById(
      'dashboard-drafts-meta'
    );

  if (!card || !meta) {
    return;
  }

  try {

    const drafts =
      await fetchAdminDrafts();

    const count =
      drafts.length;

    meta.textContent =
      count === 0
        ? 'Keine offenen Entwürfe'
        : `${count} offen`;

    card.classList.toggle(
      'dashboard-card--drafts-open',
      count > 0
    );

  } catch (error) {

    console.error(error);

    meta.textContent =
      'Konnte nicht geladen werden';

  }

}

async function loadDraftsList() {

  const container =
    document.getElementById('drafts-list');

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="admin-hint">Entwürfe werden geladen …</p>';

  try {

    const drafts =
      await fetchAdminDrafts();

    if (drafts.length === 0) {

      container.innerHTML =
        '<p class="admin-hint">Keine offenen Entwürfe.</p>';

      return;

    }

    container.innerHTML =
      drafts
        .map((draft) => `

          <div class="event-card admin-draft-card">

            <div class="event-header">

              <a
                class="admin-draft-card-link"
                href="${escapeAdminHtml(getDraftPreviewUrl(draft))}"
              >

                <strong>
                  ${escapeAdminHtml(draft.title)}
                </strong>

                <div class="event-meta">

                  ${escapeAdminHtml(getDraftTypeLabel(draft.type))}

                  ·

                  ${escapeAdminHtml(formatDraftListDate(draft.sortAt))}

                  ·

                  Entwurf

                  ${formatDraftCreatorMeta(draft)}

                </div>

              </a>

              <div class="actions">

                <button
                  type="button"
                  class="delete-button"
                  data-draft-type="${escapeAdminHtml(draft.type)}"
                  data-draft-id="${draft.id}"
                  title="Entwurf löschen">

                  🗑

                </button>

              </div>

            </div>

          </div>

        `)
        .join('');

    bindDraftListActions(container);

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<p class="admin-hint">Entwürfe konnten nicht geladen werden.'
      + (
        error?.message
          ? ` (${escapeAdminHtml(error.message)})`
          : ''
      )
      + '</p>';

  }

}

function bindDraftListActions(container) {

  container
    .querySelectorAll('[data-draft-id]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        (event) => {

          event.preventDefault();
          event.stopPropagation();

          void deleteAdminDraft({
            type: button.dataset.draftType,
            id: Number(button.dataset.draftId)
          });

        }
      );

    });

}

async function deleteAdminDraft(draft) {

  if (
    !draft?.id
    || draft.type !== 'event'
  ) {
    return;
  }

  const typeLabel =
    getDraftTypeLabel(draft.type);

  const confirmDelete =
    confirm(
      `${typeLabel}-Entwurf wirklich löschen?`
    );

  if (!confirmDelete) {
    return;
  }

  const entityType =
    window.siteConfig.feedback.entityTypes.event;

  if (
    typeof deleteFeedbackForEntity === 'function'
  ) {

    const feedbackResult =
      await deleteFeedbackForEntity(
        entityType,
        draft.id
      );

    if (feedbackResult?.error) {

      alert(
        'Entwurf konnte nicht gelöscht werden: '
        + 'Das zugehörige Feedback-Modul konnte nicht entfernt werden.'
      );

      return;

    }

  }

  const table =
    window.siteConfig.tables.termine;

  const { error } =
    await window.supabaseClient
      .from(table)
      .delete()
      .eq('id', draft.id);

  if (error) {

    console.error(error);

    alert(
      error.message
      || 'Löschen fehlgeschlagen.'
    );

    return;

  }

  await loadDraftsList();

  if (
    typeof loadDraftDashboardCard === 'function'
  ) {
    void loadDraftDashboardCard();
  }

}

async function fetchAdminDraftByParams(
  type,
  id,
  slug
) {

  if (type !== 'event') {
    return null;
  }

  const table =
    window.siteConfig.tables.termine;

  let query =
    window.supabaseClient
      .from(table)
      .select('*');

  if (id) {
    query = query.eq('id', id);
  } else if (slug) {
    query = query.eq('slug', slug);
  } else {
    return null;
  }

  const { data, error } =
    await query.maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  if (!isAdminDraftRow(data)) {
    return null;
  }

  return data;

}

function renderAdminDraftPreviewNews(
  data,
  creatorLabel
) {

  const imageUrl =
    typeof resolveNewsImage === 'function'
      ? resolveNewsImage(data)
      : data.image;

  const imageHtml =
    imageUrl
      ? `
        <img
          class="admin-draft-preview__image"
          src="${safeMediaUrl(imageUrl)}"
          alt="${escapeAdminHtml(data.title || '')}"
        >
      `
      : '';

  return `
    <p class="admin-draft-preview__kind">
      Internes · Entwurf
    </p>

    <h1 class="admin-draft-preview__title">
      ${escapeAdminHtml(data.title || 'Ohne Titel')}
    </h1>

    ${renderDraftCreatorMetaHtml(creatorLabel)}

    ${imageHtml}

    <div class="admin-draft-preview__body">
      ${
        typeof marked !== 'undefined'
          ? marked.parse(data.content || '')
          : escapeAdminHtml(data.content || '')
      }
    </div>
  `;

}

function renderAdminDraftPreviewEvent(
  event,
  creatorLabel
) {

  const imageUrl =
    typeof resolveTerminImage === 'function'
      ? resolveTerminImage(event)
      : event.image;

  const imageHtml =
    imageUrl
      ? `
        <img
          class="admin-draft-preview__image"
          src="${safeMediaUrl(imageUrl)}"
          alt="${escapeAdminHtml(event.title || '')}"
        >
      `
      : '';

  const timeHtml =
    typeof formatEventTime === 'function'
    && formatEventTime(event)
      ? `
        <p class="admin-draft-preview__meta">
          🕒 ${escapeAdminHtml(formatEventTime(event))} Uhr
        </p>
      `
      : '';

  const locationHtml =
    event.location
      ? `
        <p class="admin-draft-preview__meta">
          📍 ${escapeAdminHtml(event.location)}
        </p>
      `
      : '';

  const linksHtml =
    typeof renderLinks === 'function'
      ? renderLinks(event)
      : '';

  return `
    <p class="admin-draft-preview__kind">
      Termin · Entwurf
    </p>

    <h1 class="admin-draft-preview__title">
      ${escapeAdminHtml(event.title || 'Ohne Titel')}
    </h1>

    ${renderDraftCreatorMetaHtml(creatorLabel)}

    <p class="admin-draft-preview__meta">
      📅 ${
        typeof formatEventDate === 'function'
          ? escapeAdminHtml(formatEventDate(event))
          : '—'
      }
    </p>

    ${timeHtml}
    ${locationHtml}
    ${imageHtml}
    ${linksHtml}

    <div class="admin-draft-preview__body">
      ${
        typeof marked !== 'undefined'
          ? marked.parse(event.content || '')
          : escapeAdminHtml(event.content || '')
      }
    </div>
  `;

}

async function initDraftPreview() {

  const container =
    document.getElementById(
      'draft-preview-content'
    );

  if (!container) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const type =
    params.get('type');

  const id =
    Number(params.get('id'));

  const slug =
    params.get('slug') || '';

  if (type !== 'event') {

    container.innerHTML =
      '<p class="admin-hint">Ungültiger Entwurf.</p>';

    return;

  }

  const data =
    await fetchAdminDraftByParams(
      type,
      Number.isFinite(id)
        ? id
        : null,
      slug
    );

  if (!data) {

    container.innerHTML =
      '<p class="admin-hint">Entwurf nicht gefunden.</p>';

    return;

  }

  document.title =
    `${data.title || 'Entwurf'} · Vorschau · Admin`;

  const editLink =
    document.getElementById(
      'draft-preview-edit'
    );

  if (editLink) {

    editLink.href =
      getDraftEditUrl({
        type,
        id: data.id
      });

  }

  const creatorLabel =
    await resolveAdminDraftCreatorLabel(
      data.created_by
    );

  container.innerHTML =
    renderAdminDraftPreviewEvent(
      data,
      creatorLabel
    );

}
