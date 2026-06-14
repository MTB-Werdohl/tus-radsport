const MEMBER_RECAPS_PAGE_SIZE = 5;

let memberRecapsCache = null;
let memberRecapsMissingPage = 1;
let memberRecapsDraftsPage = 1;
let memberRecapsPublishedPage = 1;

function normalizeMemberRecapNestedRow(
  value
) {

  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;

}

function memberRecapSortTimestamp(
  row,
  kind
) {

  if (kind === 'missing') {

    const raw =
      row.date
      || row.updated_at
      || row.created_at
      || '';

    const parsed =
      Date.parse(raw);

    return Number.isFinite(parsed)
      ? parsed
      : 0;

  }

  const termin =
    row.termin || {};

  const raw =
    row.updated_at
    || row.created_at
    || termin.date
    || '';

  const parsed =
    Date.parse(raw);

  return Number.isFinite(parsed)
    ? parsed
    : 0;

}

function memberRecapDisplayTitle(
  row,
  kind
) {

  if (kind === 'missing') {
    return row.title || 'Ohne Titel';
  }

  const termin =
    row.termin || {};

  return (
    row.headline
    || termin.title
    || 'Rückblick'
  );

}

function memberRecapDateHint(
  row,
  kind
) {

  const dateValue =
    kind === 'missing'
      ? row.date
      : row.termin?.date;

  if (!dateValue) {
    return '';
  }

  return `
<span class="member-content-item-date">
  ${escapeMemberHtml(
    formatMemberContentDate(dateValue)
  )}
</span>
  `.trim();

}

function renderMemberRecapListItem(
  row,
  kind
) {

  const terminId =
    kind === 'missing'
      ? row.id
      : row.termin_id
      || row.termin?.id;

  const editUrl =
    `/profil/recap_edit/?termin_id=${terminId}`;

  const eventUrl =
    row.termin?.slug
      ? `/kalender/${row.termin.slug}/`
      : null;

  let statusHtml = '';
  let actionHtml = '';

  if (kind === 'missing') {

    actionHtml = `
<a
  class="member-content-item-edit"
  href="${editUrl}">

  Rückblick schreiben

</a>
    `.trim();

  } else if (kind === 'draft') {

    statusHtml = `
<span class="member-content-status member-content-status--pending">
  In Bearbeitung
</span>
    `.trim();

    actionHtml = `
<a
  class="member-content-item-edit"
  href="${editUrl}">

  Bearbeiten

</a>
    `.trim();

  } else if (kind === 'published') {

    statusHtml = `
<span class="member-content-status member-content-status--approved">
  Veröffentlicht
</span>
    `.trim();

    if (eventUrl) {

      actionHtml = `
<a
  class="member-content-item-edit"
  href="${eventUrl}">

  Ansehen

</a>
      `.trim();

    }

  }

  return `
<li class="member-content-item member-content-item--recap member-content-item--recap-${kind}">

  <div class="member-content-item-main">

    <strong class="member-content-item-title">
      ${escapeMemberHtml(
        memberRecapDisplayTitle(
          row,
          kind
        )
      )}
    </strong>

    ${memberRecapDateHint(row, kind)}

  </div>

  <div class="member-content-item-meta">

    ${statusHtml}

    ${actionHtml}

  </div>

</li>
  `;

}

function renderMemberRecapsSection(
  heading,
  items,
  kind,
  page,
  paginationId,
  onPageChange
) {

  if (!items.length) {
    return '';
  }

  const paginated =
    paginateMemberContentItems(
      items,
      page,
      MEMBER_RECAPS_PAGE_SIZE
    );

  const listItems =
    paginated.items
      .map((item) =>
        renderMemberRecapListItem(
          item,
          kind
        )
      )
      .join('');

  return `
<h3 class="member-content-list-heading">
  ${escapeMemberHtml(heading)}
</h3>

<ul class="member-content-items">
  ${listItems}
</ul>

<div
  id="${paginationId}"
  class="member-votes-pagination-wrap"
  data-recaps-section="${kind}">
</div>
  `.trim();

}

function bindMemberRecapsPagination(
  container,
  overview
) {

  const sections = [
    {
      kind: 'missing',
      total: overview.missing.length,
      page: memberRecapsMissingPage,
      paginationId:
        'member-recaps-missing-pagination',
      setPage(value) {
        memberRecapsMissingPage = value;
      }
    },
    {
      kind: 'draft',
      total: overview.drafts.length,
      page: memberRecapsDraftsPage,
      paginationId:
        'member-recaps-drafts-pagination',
      setPage(value) {
        memberRecapsDraftsPage = value;
      }
    },
    {
      kind: 'published',
      total: overview.published.length,
      page: memberRecapsPublishedPage,
      paginationId:
        'member-recaps-published-pagination',
      setPage(value) {
        memberRecapsPublishedPage = value;
      }
    }
  ];

  sections.forEach((section) => {

    renderMemberContentPagination(
      document.getElementById(
        section.paginationId
      ),
      section.total,
      section.page,
      (page) => {

        section.setPage(page);

        renderMemberRecapsList(
          container,
          memberRecapsCache
        );

      }
    );

  });

}

async function fetchMemberRecapsOverview(
  memberId
) {

  if (!memberId) {
    return {
      missing: [],
      drafts: [],
      published: []
    };
  }

  const termineTable =
    window.siteConfig.tables.termine;

  const recapsTable =
    window.siteConfig.tables.terminRecaps
    || 'termin_recaps';

  const draftVis =
    window.siteConfig.visibility.draft;

  const [termineResult, recapsResult] =
    await Promise.all([

      window.supabaseClient
        .from(termineTable)
        .select(`
          id,
          title,
          slug,
          date,
          endDate,
          sichtbarkeit,
          recurring,
          created_at,
          updated_at,
          termin_recaps (
            id,
            status
          )
        `)
        .eq('created_by', memberId)
        .eq('recurring', false)
        .neq('sichtbarkeit', draftVis)
        .order('date', {
          ascending: false
        }),

      window.supabaseClient
        .from(recapsTable)
        .select(`
          id,
          termin_id,
          headline,
          status,
          updated_at,
          created_at,
          ${termineTable} (
            id,
            title,
            slug,
            date,
            endDate,
            sichtbarkeit,
            recurring
          )
        `)
        .eq('created_by', memberId)
        .order('updated_at', {
          ascending: false,
          nullsFirst: false
        })

    ]);

  if (termineResult.error) {
    console.error(termineResult.error);
  }

  if (recapsResult.error) {
    console.error(recapsResult.error);
  }

  const missing = [];

  for (const termin of termineResult.data || []) {

    const recapRow =
      normalizeMemberRecapNestedRow(
        termin.termin_recaps
      );

    if (recapRow) {
      continue;
    }

    if (
      typeof terminAllowsRecapClient
        === 'function'
      && !terminAllowsRecapClient(termin)
    ) {
      continue;
    }

    missing.push(termin);

  }

  missing.sort(
    (left, right) =>
      memberRecapSortTimestamp(
        right,
        'missing'
      )
      - memberRecapSortTimestamp(
        left,
        'missing'
      )
  );

  const drafts = [];
  const published = [];

  for (const recap of recapsResult.data || []) {

    const termin =
      recap[termineTable]
      || recap.Termine
      || null;

    const row = {
      ...recap,
      termin
    };

    if (recap.status === 'draft') {
      drafts.push(row);
    } else if (
      recap.status === 'published'
    ) {
      published.push(row);
    }

  }

  drafts.sort(
    (left, right) =>
      memberRecapSortTimestamp(
        right,
        'draft'
      )
      - memberRecapSortTimestamp(
        left,
        'draft'
      )
  );

  published.sort(
    (left, right) =>
      memberRecapSortTimestamp(
        right,
        'published'
      )
      - memberRecapSortTimestamp(
        left,
        'published'
      )
  );

  return {
    missing,
    drafts,
    published
  };

}

function renderMemberRecapsPanelShell() {

  return `
<section class="member-profile-section-block member-content-panel">

  <h2>Rückblicke</h2>

  <p class="member-content-lead">
    Dokumentiere vergangene Veranstaltungen, die du als Termin
    eingereicht hast. Der Vorstand prüft und veröffentlicht
    deinen Entwurf.
  </p>

  <div
    id="member-recaps-list"
    class="member-content-list">

    <p>Rückblicke werden geladen …</p>

  </div>

</section>
  `;

}

function renderMemberRecapsList(
  container,
  overview
) {

  if (!container) {
    return;
  }

  const missing =
    overview?.missing || [];

  const drafts =
    overview?.drafts || [];

  const published =
    overview?.published || [];

  memberRecapsMissingPage =
    normalizeMemberContentPage(
      memberRecapsMissingPage,
      missing.length,
      MEMBER_RECAPS_PAGE_SIZE
    ).page;

  memberRecapsDraftsPage =
    normalizeMemberContentPage(
      memberRecapsDraftsPage,
      drafts.length,
      MEMBER_RECAPS_PAGE_SIZE
    ).page;

  memberRecapsPublishedPage =
    normalizeMemberContentPage(
      memberRecapsPublishedPage,
      published.length,
      MEMBER_RECAPS_PAGE_SIZE
    ).page;

  if (
    !missing.length
    && !drafts.length
    && !published.length
  ) {

    container.innerHTML = `
<p class="member-content-empty">
  Noch keine Rückblicke — sobald einer deiner freigegebenen
  Termine vorbei ist, kannst du hier einen Bericht schreiben.
</p>
    `;

    return;

  }

  container.innerHTML = `

${renderMemberRecapsSection(
  'Rückblick fehlt',
  missing,
  'missing',
  memberRecapsMissingPage,
  'member-recaps-missing-pagination'
)}

${renderMemberRecapsSection(
  'In Bearbeitung',
  drafts,
  'draft',
  memberRecapsDraftsPage,
  'member-recaps-drafts-pagination'
)}

${renderMemberRecapsSection(
  'Veröffentlicht',
  published,
  'published',
  memberRecapsPublishedPage,
  'member-recaps-published-pagination'
)}

  `.trim();

  bindMemberRecapsPagination(
    container,
    overview
  );

}

async function loadMemberRecapsListIfNeeded(
  member,
  force
) {

  const container =
    document.getElementById(
      'member-recaps-list'
    );

  if (
    !container
    || !member?.id
  ) {
    return;
  }

  if (
    container.dataset.loaded === 'true'
    && !force
  ) {
    return;
  }

  if (force) {
    memberRecapsMissingPage = 1;
    memberRecapsDraftsPage = 1;
    memberRecapsPublishedPage = 1;
  }

  container.innerHTML =
    '<p>Rückblicke werden geladen …</p>';

  const overview =
    await fetchMemberRecapsOverview(
      member.id
    );

  memberRecapsCache = overview;

  renderMemberRecapsList(
    container,
    overview
  );

  container.dataset.loaded = 'true';

}
