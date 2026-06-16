function memberContentStatusLabel(
  sichtbarkeit
) {

  const draft =
    window.siteConfig?.visibility?.draft
    || window.CONTENT_VISIBILITY?.draft
    || 'draft';

  if (sichtbarkeit === draft) {
    return 'Noch nicht freigegeben';
  }

  return 'Freigegeben';

}

const MEMBER_CONTENT_PAGE_SIZE = 5;

let memberContentSubmissionsCache = null;
let memberContentTerminePage = 1;

function normalizeMemberContentPage(
  page,
  totalItems,
  pageSize
) {

  const size =
    Math.max(
      1,
      Number(pageSize) || 1
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(totalItems / size)
    );

  const safePage =
    Math.min(
      Math.max(
        1,
        Number(page) || 1
      ),
      totalPages
    );

  return {
    page: safePage,
    totalPages,
    pageSize: size
  };

}

function paginateMemberContentItems(
  items,
  page,
  pageSize
) {

  const totalItems =
    items.length;

  const normalized =
    normalizeMemberContentPage(
      page,
      totalItems,
      pageSize
    );

  const startIndex =
    (normalized.page - 1)
    * normalized.pageSize;

  return {
    items:
      items.slice(
        startIndex,
        startIndex + normalized.pageSize
      ),
    ...normalized
  };

}

function renderMemberContentPagination(
  container,
  totalItems,
  currentPage,
  onPageChange
) {

  if (!container) {
    return;
  }

  const normalized =
    normalizeMemberContentPage(
      currentPage,
      totalItems,
      MEMBER_CONTENT_PAGE_SIZE
    );

  if (
    totalItems
    <= MEMBER_CONTENT_PAGE_SIZE
  ) {

    container.innerHTML = '';
    container.hidden = true;

    return;

  }

  container.hidden = false;

  container.innerHTML = `

<div class="member-votes-pagination">

  <button
    type="button"
    class="member-votes-pagination__btn member-votes-pagination__prev"
    ${normalized.page <= 1 ? 'disabled' : ''}>

    ← Zurück

  </button>

  <span class="member-votes-pagination__info">
    Seite ${normalized.page} von ${normalized.totalPages}
  </span>

  <button
    type="button"
    class="member-votes-pagination__btn member-votes-pagination__next"
    ${normalized.page >= normalized.totalPages ? 'disabled' : ''}>

    Weiter →

  </button>

</div>

  `;

  container
    .querySelector('.member-votes-pagination__prev')
    ?.addEventListener('click', () => {

      onPageChange(normalized.page - 1);

    });

  container
    .querySelector('.member-votes-pagination__next')
    ?.addEventListener('click', () => {

      onPageChange(normalized.page + 1);

    });

}

function memberContentStatusClass(
  sichtbarkeit
) {

  const draft =
    window.siteConfig?.visibility?.draft
    || window.CONTENT_VISIBILITY?.draft
    || 'draft';

  return sichtbarkeit === draft
    ? 'member-content-status--pending'
    : 'member-content-status--approved';

}

function memberContentSortTimestamp(
  row
) {

  const raw =
    row.updated_at
    || row.created_at
    || row.date
    || '';

  const parsed =
    Date.parse(raw);

  return Number.isFinite(parsed)
    ? parsed
    : 0;

}

async function fetchMemberContentSubmissions(
  memberId
) {

  if (!memberId) {
    return { termine: [] };
  }

  const termineTable =
    window.siteConfig.tables.termine;

  const termineResult =
    await window.supabaseClient
      .from(termineTable)
      .select(
        'id, title, slug, sichtbarkeit, date, endDate, created_at, updated_at'
      )
      .eq('created_by', memberId)
      .order('created_at', { ascending: false });

  if (termineResult.error) {
    console.error(termineResult.error);
  }

  return {
    termine: termineResult.data || []
  };

}

function renderMemberContentPanelShell() {

  return `
<section class="member-profile-section-block member-content-panel">

  <h2>Content</h2>

  <div class="member-content-cards">

    <a
      class="member-content-card"
      href="/profil/termin_edit/">

      <span class="member-content-card-icon">📅</span>

      <span class="member-content-card-title">
        Termin
      </span>

      <span class="member-content-card-text">
        Ausfahrt oder Veranstaltung vorschlagen
      </span>

    </a>

  </div>

  <div
    id="member-content-list"
    class="member-content-list">

    <p>Einträge werden geladen …</p>

  </div>

</section>
  `;

}

function renderMemberTerminContentListItem(
  item
) {

  const editUrl =
    `/profil/termin_edit/?id=${item.id}`;

  const canEditTermin =
    memberTerminIsDraft(item);

  const dateHint =
    item.date
      ? `<span class="member-content-item-date">${escapeMemberHtml(formatMemberContentDate(item.date))}</span>`
      : '';

  const terminEditLink =
    canEditTermin
      ? `
<a
  class="member-content-item-edit"
  href="${editUrl}">

  Bearbeiten

</a>
      `.trim()
      : '';

  const terminStatusHtml =
    canEditTermin
      ? `
<span class="member-content-status ${memberContentStatusClass(item.sichtbarkeit)}">
  ${escapeMemberHtml(memberContentStatusLabel(item.sichtbarkeit))}
</span>
      `.trim()
      : `
<span class="member-content-status member-content-status--approved">
  Freigegeben
</span>
      `.trim();

  return `
<li class="member-content-item member-content-item--termin">

  <div class="member-content-item-main">

    <strong class="member-content-item-title">
      ${escapeMemberHtml(item.title || 'Ohne Titel')}
    </strong>

    ${dateHint}

  </div>

  <div class="member-content-item-meta member-content-item-meta--stacked">

    ${terminStatusHtml}

    ${terminEditLink}

  </div>

</li>
  `;

}

function formatMemberContentDate(
  value
) {

  if (
    typeof formatTerminDateLabel === 'function'
  ) {
    return formatTerminDateLabel(value);
  }

  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

}

function renderMemberContentList(
  container,
  submissions
) {

  if (!container) {
    return;
  }

  const termine =
    [...(submissions?.termine || [])]
      .sort(
        (left, right) =>
          memberContentSortTimestamp(right)
          - memberContentSortTimestamp(left)
      );

  memberContentTerminePage =
    normalizeMemberContentPage(
      memberContentTerminePage,
      termine.length,
      MEMBER_CONTENT_PAGE_SIZE
    ).page;

  if (!termine.length) {

    container.innerHTML = `
<p class="member-content-empty">
  Noch keine Termine eingereicht.
</p>
    `;

    return;

  }

  const paginatedTermine =
    paginateMemberContentItems(
      termine,
      memberContentTerminePage,
      MEMBER_CONTENT_PAGE_SIZE
    );

  const terminItems =
    paginatedTermine.items
      .map((item) =>
        renderMemberTerminContentListItem(item)
      )
      .join('');

  container.innerHTML = `

<h3 class="member-content-list-heading">
  Termine
</h3>

<ul class="member-content-items">
  ${terminItems}
</ul>

<div
  id="member-content-termine-pagination"
  class="member-votes-pagination-wrap">
</div>

  `.trim();

  renderMemberContentPagination(
    document.getElementById(
      'member-content-termine-pagination'
    ),
    termine.length,
    memberContentTerminePage,
    (page) => {

      memberContentTerminePage = page;

      renderMemberContentList(
        container,
        memberContentSubmissionsCache
      );

    }
  );

}

async function loadMemberContentListIfNeeded(
  member,
  force
) {

  const container =
    document.getElementById(
      'member-content-list'
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
    memberContentTerminePage = 1;
  }

  container.innerHTML =
    '<p>Einträge werden geladen …</p>';

  const submissions =
    await fetchMemberContentSubmissions(
      member.id
    );

  memberContentSubmissionsCache =
    submissions;

  renderMemberContentList(
    container,
    submissions
  );

  container.dataset.loaded = 'true';

}

function initMemberEditUnsavedGuard() {

  let dirty = false;

  const root =
    document.querySelector(
      '.member-content-edit-form'
    );

  if (!root) {
    return { markClean() {} };
  }

  function markDirty() {
    dirty = true;
  }

  root.addEventListener('input', markDirty);
  root.addEventListener('change', markDirty);

  window.addEventListener('beforeunload', (event) => {

    if (!dirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';

  });

  root
    .querySelectorAll('a.back-link')
    .forEach((link) => {

      link.addEventListener('click', (event) => {

        if (!dirty) {
          return;
        }

        if (
          !window.confirm(
            'Ohne Speichern verlassen?'
          )
        ) {
          event.preventDefault();
        }

      });

    });

  return {
    markClean() {
      dirty = false;
    }
  };

}
