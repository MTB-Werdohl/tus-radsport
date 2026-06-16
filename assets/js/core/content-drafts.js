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

  if (type === 'walkin') {
    return 'Walk-in Gast';
  }

  return type;

}

function getContentDraftEditUrl(draft) {

  return `/admin/termine_edit.html?id=${draft.id}`;

}

function getContentDraftPreviewUrl(draft) {

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

function mapGuestWalkInDraftRow(row) {

  const memberId =
    row?.member_id
    || row?.id;

  if (!memberId) {
    return null;
  }

  const guestLabel =
    [
      row.vorname,
      row.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
    || 'Walk-in Gast';

  return {
    type: 'walkin',
    id: memberId,
    memberId,
    title: guestLabel,
    sortAt:
      row.sort_at || null
  };

}

async function fetchGuestWalkInContentDrafts() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'list_guest_walkin_drafts'
    );

  if (error) {

    console.error(
      'list_guest_walkin_drafts:',
      error
    );

    return [];

  }

  const rows =
    Array.isArray(data)
      ? data
      : (data ? [data] : []);

  return rows
    .map(mapGuestWalkInDraftRow)
    .filter(Boolean);

}

async function fetchContentDrafts() {

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
      .filter(isContentDraftRow);

  const creatorIds =
    eventItems.map((item) => item.created_by);

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

  let walkinItems = [];

  try {

    walkinItems =
      await fetchGuestWalkInContentDrafts();

  } catch (walkinError) {

    console.error(walkinError);

  }

  return [
    ...mappedEvents,
    ...walkinItems
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
