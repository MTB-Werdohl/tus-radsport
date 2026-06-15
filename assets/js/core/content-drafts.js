function isContentDraftRow(row) {

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

function getContentDraftSortAt(
  row,
  type
) {

  if (type === 'event') {
    return row.date || null;
  }

  return row.updated_at
    || row.created_at
    || null;

}

function getContentDraftTypeLabel(type) {

  if (type === 'event') {
    return 'Termin';
  }

  if (type === 'recap') {
    return 'Rückblick';
  }

  return 'Internes';

}

function getContentDraftEditUrl(draft) {

  if (draft.type === 'event') {
    return `/admin/termine_edit.html?id=${draft.id}`;
  }

  if (draft.type === 'recap') {
    return `/admin/termine_edit.html?id=${draft.terminId}`;
  }

  return `/admin/news_edit.html?id=${draft.id}`;

}

function getContentDraftPreviewUrl(draft) {

  if (draft.type === 'recap') {
    return getContentDraftEditUrl(draft);
  }

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

function formatContentDraftDate(value) {

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

async function fetchContentDrafts() {

  const newsResult =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select(
        'id, title, slug, sichtbarkeit, published, updated_at, created_at, created_by'
      )
      .order('updated_at', {
        ascending: false,
        nullsFirst: false
      });

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

  const errors = [];

  if (newsResult.error) {
    errors.push(newsResult.error);
    console.error(newsResult.error);
  }

  if (termineResult.error) {
    errors.push(termineResult.error);
    console.error(termineResult.error);
  }

  if (errors.length === 2) {
    throw errors[0];
  }

  const newsItems =
    (newsResult.data || [])
      .filter(isContentDraftRow);

  const eventItems =
    (termineResult.data || [])
      .filter(isContentDraftRow);

  let recapItems = [];

  if (
    typeof fetchRecapDraftsForAdmin
      === 'function'
  ) {

    try {

      const recapRows =
        await fetchRecapDraftsForAdmin();

      const termineTable =
        window.siteConfig.tables.termine;

      recapItems =
        recapRows.map((row) => {

          const termin =
            row[termineTable]
            || row.Termine
            || {};

          return {
            type: 'recap',
            id: row.id,
            terminId: row.termin_id,
            title:
              row.headline
              || termin.title
              || 'Rückblick',
            slug: termin.slug || '',
            createdBy: row.created_by,
            sortAt:
              row.updated_at
              || row.created_at
              || termin.date
              || null
          };

        });

    } catch (recapError) {

      console.error(recapError);

    }

  }

  const creatorIds = [
    ...newsItems.map((item) => item.created_by),
    ...eventItems.map((item) => item.created_by),
    ...recapItems.map((item) => item.createdBy)
  ];

  const creatorMap =
    typeof fetchContentCreatorLabels === 'function'
      ? await fetchContentCreatorLabels(
        creatorIds
      )
      : {};

  const resolveCreator =
    (createdBy) => {

      if (!createdBy) {
        return null;
      }

      const label =
        creatorMap[String(createdBy)];

      return label || null;

    };

  const mappedNews =
    newsItems.map((item) => ({
      type: 'news',
      id: item.id,
      title: item.title || 'Ohne Titel',
      slug: item.slug || '',
      createdBy: item.created_by,
      creatorLabel:
        resolveCreator(item.created_by),
      sortAt:
        getContentDraftSortAt(
          item,
          'news'
        )
    }));

  const mappedEvents =
    eventItems.map((item) => ({
      type: 'event',
      id: item.id,
      title: item.title || 'Ohne Titel',
      slug: item.slug || '',
      createdBy: item.created_by,
      creatorLabel:
        resolveCreator(item.created_by),
      sortAt:
        getContentDraftSortAt(
          item,
          'event'
        )
    }));

  const mappedRecaps =
    recapItems.map((item) => ({
      ...item,
      creatorLabel:
        resolveCreator(item.createdBy)
    }));

  return [
    ...mappedNews,
    ...mappedEvents,
    ...mappedRecaps
  ]
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
