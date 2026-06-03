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

  const newsResult =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select(
        'id, title, slug, sichtbarkeit, published, updated_at, created_at'
      )
      .order('updated_at', {
        ascending: false,
        nullsFirst: false
      });

  const termineResult =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select(
        'id, title, slug, date, sichtbarkeit'
      )
      .order('date', {
        ascending: false,
        nullsFirst: false
      });

  const errors = [];

  if (newsResult.error) {
    errors.push(newsResult.error);
    console.error(newsResult.error);
  }

  if (termineResult.error) {
    errors.push(termineResult.error);
    console.error(termineResult.error);
  }

  if (
    errors.length === 2
  ) {
    throw errors[0];
  }

  const newsItems =
    (newsResult.data || [])
      .filter(isAdminDraftRow)
      .map((item) => ({
        type: 'news',
        id: item.id,
        title: item.title || 'Ohne Titel',
        slug: item.slug || '',
        sortAt:
          getAdminDraftSortAt(
            item,
            'news'
          )
      }));

  const eventItems =
    (termineResult.data || [])
      .filter(isAdminDraftRow)
      .map((item) => ({
        type: 'event',
        id: item.id,
        title: item.title || 'Ohne Titel',
        slug: item.slug || '',
        sortAt:
          getAdminDraftSortAt(
            item,
            'event'
          )
      }));

  return [...newsItems, ...eventItems]
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

  return type === 'event'
    ? 'Termin'
    : 'News';

}

function getDraftEditUrl(draft) {

  if (draft.type === 'event') {
    return `/admin/termine_edit.html?id=${draft.id}`;
  }

  return `/admin/news_edit.html?id=${draft.id}`;

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

              <div>

                <strong>
                  ${escapeAdminHtml(draft.title)}
                </strong>

                <div class="event-meta">

                  ${escapeAdminHtml(getDraftTypeLabel(draft.type))}

                  ·

                  ${escapeAdminHtml(formatDraftListDate(draft.sortAt))}

                  ·

                  Entwurf

                </div>

              </div>

              <div class="actions">

                <a
                  class="admin-draft-preview-link"
                  href="${escapeAdminHtml(getDraftPreviewUrl(draft))}"
                  title="Vorschau"
                >
                  👁
                </a>

                <a
                  class="admin-draft-edit-link"
                  href="${escapeAdminHtml(getDraftEditUrl(draft))}"
                  title="Bearbeiten"
                >
                  ✏
                </a>

              </div>

            </div>

          </div>

        `)
        .join('');

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

async function fetchAdminDraftByParams(
  type,
  id,
  slug
) {

  const table =
    type === 'event'
      ? window.siteConfig.tables.termine
      : window.siteConfig.tables.news;

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

function renderAdminDraftPreviewNews(data) {

  const imageHtml =
    data.image
      ? `
        <img
          class="admin-draft-preview__image"
          src="${escapeAdminHtml(data.image)}"
          alt="${escapeAdminHtml(data.title || '')}"
        >
      `
      : '';

  return `
    <p class="admin-draft-preview__kind">
      News · Entwurf
    </p>

    <h1 class="admin-draft-preview__title">
      ${escapeAdminHtml(data.title || 'Ohne Titel')}
    </h1>

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

function renderAdminDraftPreviewEvent(event) {

  const imageHtml =
    event.image
      ? `
        <img
          class="admin-draft-preview__image"
          src="${escapeAdminHtml(event.image)}"
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

  if (
    type !== 'news'
    && type !== 'event'
  ) {

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

  container.innerHTML =
    type === 'event'
      ? renderAdminDraftPreviewEvent(data)
      : renderAdminDraftPreviewNews(data);

}
