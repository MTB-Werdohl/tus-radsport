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

function reloadAfterVorstandContentSave() {

  const path =
    window.location.pathname
      .replace(/\/$/, '');

  if (path === '/profil') {

    window.location.href =
      '/profil/?tab=entwuerfe';

    return;

  }

  window.location.reload();

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
      ? ` · ${escapeMemberDraftHtml(draft.creatorLabel)}`
      : '';

  const typeLabel =
    typeof getContentDraftTypeLabel === 'function'
      ? getContentDraftTypeLabel(draft.type)
      : draft.type;

  const dateLabel =
    typeof formatContentDraftDate === 'function'
      ? formatContentDraftDate(draft.sortAt)
      : '';

  const terminIdAttr =
    draft.type === 'recap'
      ? ` data-draft-termin-id="${draft.terminId}"`
      : '';

  return `
<button
  type="button"
  class="member-draft-card"
  data-member-draft-open="true"
  data-draft-type="${escapeMemberDraftHtml(draft.type)}"
  data-draft-id="${draft.id}"${terminIdAttr}>

  <span class="member-draft-card__title">
    ${escapeMemberDraftHtml(draft.title)}
  </span>

  <span class="member-draft-card__meta">
    ${escapeMemberDraftHtml(typeLabel)}
    ·
    ${escapeMemberDraftHtml(dateLabel)}${creatorMeta}
  </span>

</button>
  `.trim();

}

async function openMemberDraftEdit(draft) {

  if (!draft?.type) {
    return;
  }

  if (
    draft.type === 'news'
    && typeof openNewsEditModal === 'function'
  ) {

    await openNewsEditModal(draft.id);
    return;

  }

  if (
    draft.type === 'event'
    && typeof openEventEditModal === 'function'
  ) {

    await openEventEditModal(draft.id);
    return;

  }

  if (
    draft.type === 'recap'
    && typeof openEventRecapEditModal === 'function'
  ) {

    await openEventRecapEditModal(
      draft.terminId,
      null
    );

  }

}

function bindMemberDraftCardEvents(
  container
) {

  if (!container) {
    return;
  }

  container
    .querySelectorAll(
      '[data-member-draft-open]'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          const draft = {
            type:
              button.dataset.draftType,
            id:
              parseInt(
                button.dataset.draftId,
                10
              ),
            terminId:
              parseInt(
                button.dataset.draftTerminId,
                10
              ) || null
          };

          void openMemberDraftEdit(draft);

        }
      );

    });

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

    bindMemberDraftCardEvents(
      container
    );

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
