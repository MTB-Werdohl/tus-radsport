function escapeMemberDraftHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

async function refreshMemberDraftsTabIndicator() {

  const tab =
    document.getElementById(
      'member-profile-tab-btn-entwuerfe'
    );

  if (
    !tab
    || typeof fetchContentDrafts
      !== 'function'
  ) {
    return 0;
  }

  try {

    const drafts =
      await fetchContentDrafts();

    const count =
      drafts.length;

    tab.classList.toggle(
      'member-profile-tab--pending',
      count > 0
    );

    tab.setAttribute(
      'aria-label',
      count > 0
        ? `Entwürfe (${count} offen)`
        : 'Entwürfe'
    );

    return count;

  } catch (error) {

    console.error(error);

    return 0;

  }

}

function renderMemberDraftCard(draft) {

  const creatorMeta =
    draft.creatorLabel
      ? `
                  ·
                  ${escapeMemberDraftHtml(draft.creatorLabel)}
      `
      : '';

  const previewUrl =
    typeof getContentDraftPreviewUrl === 'function'
      ? getContentDraftPreviewUrl(draft)
      : '#';

  const editUrl =
    typeof getContentDraftEditUrl === 'function'
      ? getContentDraftEditUrl(draft)
      : '#';

  const typeLabel =
    typeof getContentDraftTypeLabel === 'function'
      ? getContentDraftTypeLabel(draft.type)
      : draft.type;

  const dateLabel =
    typeof formatContentDraftDate === 'function'
      ? formatContentDraftDate(draft.sortAt)
      : '';

  return `
<article class="member-draft-card">

  <div class="member-draft-card__main">

    <a
      class="member-draft-card__title"
      href="${escapeMemberDraftHtml(previewUrl)}">

      ${escapeMemberDraftHtml(draft.title)}

    </a>

    <p class="member-draft-card__meta">

      ${escapeMemberDraftHtml(typeLabel)}

      ·

      ${escapeMemberDraftHtml(dateLabel)}

      ${creatorMeta}

    </p>

  </div>

  <div class="member-draft-card__actions">

    <a
      class="member-edit-btn member-edit-btn--secondary"
      href="${escapeMemberDraftHtml(editUrl)}">

      Bearbeiten

    </a>

    <a
      class="member-edit-btn"
      href="${escapeMemberDraftHtml(previewUrl)}">

      Vorschau

    </a>

  </div>

</article>
  `.trim();

}

async function loadMemberVorstandDraftsList() {

  const container =
    document.getElementById(
      'member-drafts-list'
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="member-content-lead">Entwürfe werden geladen …</p>';

  if (
    typeof fetchContentDrafts
      !== 'function'
  ) {

    container.innerHTML =
      '<p class="member-content-lead">Entwürfe konnten nicht geladen werden.</p>';

    return;

  }

  try {

    const drafts =
      await fetchContentDrafts();

    void refreshMemberDraftsTabIndicator();

    if (!drafts.length) {

      container.innerHTML = `
<p class="member-content-lead">
  Keine offenen Entwürfe.
</p>
      `.trim();

      return;

    }

    container.innerHTML = `
<p class="member-content-lead">
  ${drafts.length} offene Entwürfe — Internes, Termine und Rückblicke warten auf Freigabe.
</p>

<div class="member-drafts-list">
  ${drafts.map(renderMemberDraftCard).join('')}
</div>
    `.trim();

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<p class="member-content-lead">Entwürfe konnten nicht geladen werden.</p>';

  }

}

async function initMemberVorstandDraftsTab(
  member
) {

  if (
    typeof isVorstand !== 'function'
    || !isVorstand(member)
  ) {
    return;
  }

  await refreshMemberDraftsTabIndicator();

}
