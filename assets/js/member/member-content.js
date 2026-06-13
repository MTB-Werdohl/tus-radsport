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
    return { news: [], termine: [] };
  }

  const newsTable =
    window.siteConfig.tables.news;

  const termineTable =
    window.siteConfig.tables.termine;

  const [newsResult, termineResult] =
    await Promise.all([

      window.supabaseClient
        .from(newsTable)
        .select(
          'id, title, slug, sichtbarkeit, created_at, updated_at'
        )
        .eq('created_by', memberId)
        .order('created_at', { ascending: false }),

      window.supabaseClient
        .from(termineTable)
        .select(
          'id, title, slug, sichtbarkeit, date, created_at, updated_at'
        )
        .eq('created_by', memberId)
        .order('created_at', { ascending: false })

    ]);

  if (newsResult.error) {
    console.error(newsResult.error);
  }

  if (termineResult.error) {
    console.error(termineResult.error);
  }

  return {
    news: newsResult.data || [],
    termine: termineResult.data || []
  };

}

function renderMemberContentPanelShell() {

  return `
<section class="member-profile-section-block member-content-panel">

  <h2>Content</h2>

  <p class="member-content-lead">
    Reiche Termine oder News als Entwurf ein.
    Der Vorstand prüft und gibt sie frei.
  </p>

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

    <a
      class="member-content-card"
      href="/profil/news_edit/">

      <span class="member-content-card-icon">📰</span>

      <span class="member-content-card-title">
        News
      </span>

      <span class="member-content-card-text">
        Beitrag für die Startseite einreichen
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

function renderMemberContentListItem(
  item,
  kind
) {

  const editUrl =
    kind === 'news'
      ? `/profil/news_edit/?id=${item.id}`
      : `/profil/termin_edit/?id=${item.id}`;

  const canEdit =
    item.sichtbarkeit
    === (
      window.siteConfig?.visibility?.draft
      || 'draft'
    );

  const dateHint =
    kind === 'termin' && item.date
      ? `<span class="member-content-item-date">${escapeMemberHtml(formatMemberContentDate(item.date))}</span>`
      : '';

  const editLink =
    canEdit
      ? `
<a
  class="member-content-item-edit"
  href="${editUrl}">

  Bearbeiten

</a>
      `.trim()
      : '';

  return `
<li class="member-content-item member-content-item--${kind}">

  <div class="member-content-item-main">

    <span class="member-content-item-kind">
      ${kind === 'news' ? 'News' : 'Termin'}
    </span>

    <strong class="member-content-item-title">
      ${escapeMemberHtml(item.title || 'Ohne Titel')}
    </strong>

    ${dateHint}

  </div>

  <div class="member-content-item-meta">

    <span class="member-content-status ${memberContentStatusClass(item.sichtbarkeit)}">
      ${escapeMemberHtml(memberContentStatusLabel(item.sichtbarkeit))}
    </span>

    ${editLink}

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

  const news =
    [...(submissions?.news || [])]
      .sort(
        (left, right) =>
          memberContentSortTimestamp(right)
          - memberContentSortTimestamp(left)
      );

  const termine =
    [...(submissions?.termine || [])]
      .sort(
        (left, right) =>
          memberContentSortTimestamp(right)
          - memberContentSortTimestamp(left)
      );

  if (
    !news.length
    && !termine.length
  ) {

    container.innerHTML = `
<p class="member-content-empty">
  Noch keine Einreichungen.
</p>
    `;

    return;

  }

  const newsItems =
    news.map((item) =>
      renderMemberContentListItem(
        item,
        'news'
      )
    ).join('');

  const terminItems =
    termine.map((item) =>
      renderMemberContentListItem(
        item,
        'termin'
      )
    ).join('');

  container.innerHTML = `

${
  news.length
    ? `
<h3 class="member-content-list-heading">
  News
</h3>

<ul class="member-content-items">
  ${newsItems}
</ul>
    `.trim()
    : ''
}

${
  termine.length
    ? `
<h3 class="member-content-list-heading">
  Termine
</h3>

<ul class="member-content-items">
  ${terminItems}
</ul>
    `.trim()
    : ''
}

  `.trim();

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

  container.innerHTML =
    '<p>Einträge werden geladen …</p>';

  const submissions =
    await fetchMemberContentSubmissions(
      member.id
    );

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
