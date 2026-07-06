function escapeInternVorstandHtml(
  value
) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function renderInternVorstandActionsHtml(
  item
) {

  return `
<div class="news-vorstand-actions__inner">

<button
  type="button"
  class="news-vorstand-btn"
  data-intern-vorstand-edit
  data-news-id="${item.id}">

  Bearbeiten

</button>

<button
  type="button"
  class="news-vorstand-btn"
  data-intern-vorstand-results
  data-news-id="${item.id}"
  data-news-title="${escapeInternVorstandHtml(item.title || '')}">

  Auswertung

</button>

<button
  type="button"
  class="news-vorstand-btn news-vorstand-btn--danger"
  data-intern-vorstand-delete
  data-news-id="${item.id}">

  Löschen

</button>

</div>
  `.trim();

}

function canShowInternDetailVorstandTools(
  member
) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

function renderInternDetailVorstandToolbar(
  item
) {

  const actions =
    document.getElementById(
      'intern-vorstand-actions'
    );

  if (!actions) {
    return;
  }

  if (!item?.id) {

    actions.innerHTML = '';

    return;

  }

  actions.innerHTML =
    renderInternVorstandActionsHtml(
      item
    );

  const detailRoot =
    document.getElementById(
      'intern-detail'
    );

  if (detailRoot) {
    bindInternVorstandActions(
      detailRoot
    );
  }

}

function initInternDetailVorstand(
  item,
  member
) {

  if (
    !canShowInternDetailVorstandTools(
      member
    )
  ) {
    return;
  }

  renderInternDetailVorstandToolbar(
    item
  );

}

function openMemberInternEditor(
  options = {}
) {

  openMemberInternEditorPopup(options);

}

function ensureInternVorstandModal(
  id,
  title,
  dialogClass
) {

  let modal =
    document.getElementById(id);

  if (modal) {
    return modal;
  }

  modal =
    document.createElement('div');

  modal.id = id;
  modal.className = 'member-feedback-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
<div
  class="member-feedback-modal__backdrop"
  data-close-intern-vorstand-modal="true">

</div>

<div
  class="member-feedback-modal__dialog ${dialogClass || ''}"
  role="dialog"
  aria-modal="true"
  aria-labelledby="${id}-title">

  <button
    type="button"
    class="member-feedback-modal__close"
    data-close-intern-vorstand-modal="true"
    aria-label="Schließen">

    ×

  </button>

  <h2
    id="${id}-title"
    class="member-feedback-modal__title">

    ${escapeInternVorstandHtml(title)}

  </h2>

  <div
    class="news-vorstand-modal__body"
    data-intern-vorstand-modal-body>

  </div>

</div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelectorAll(
      '[data-close-intern-vorstand-modal="true"]'
    )
    .forEach((el) => {

      el.addEventListener('click', () => {
        closeInternVorstandModal(id);
      });

    });

  return modal;

}

function openInternVorstandModal(
  id,
  title
) {

  const modal =
    ensureInternVorstandModal(
      id,
      title
    );

  const titleEl =
    modal.querySelector(
      `#${id}-title`
    );

  if (titleEl) {
    titleEl.textContent = title;
  }

  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');

  document.body.classList.add(
    'member-feedback-modal-open'
  );

}

function closeInternVorstandModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  document.body.classList.remove(
    'member-feedback-modal-open'
  );

}

async function openInternFeedbackResultsModal(
  moduleId,
  title
) {

  const modalId =
    'intern-vorstand-results-modal';

  ensureInternVorstandModal(
    modalId,
    title || 'Umfrage',
    'member-feedback-modal__dialog--results'
  );

  const modal =
    document.getElementById(modalId);

  const body =
    modal?.querySelector(
      '[data-intern-vorstand-modal-body]'
    );

  if (!body) {
    return;
  }

  body.innerHTML = `
<p class="admin-hint">
  Auswertung wird geladen …
</p>
  `;

  openInternVorstandModal(
    modalId,
    title || 'Umfrage'
  );

  if (
    typeof loadFeedbackResultsForModule
      !== 'function'
  ) {

    body.innerHTML = `
<p class="admin-hint admin-hint--error">
  Auswertung konnte nicht geladen werden.
</p>
    `;

    return;

  }

  await loadFeedbackResultsForModule(
    moduleId,
    body,
    {
      showSummary: true,
      showFreeTextList: true,
      hideEmailColumn: false,
      editable: false
    }
  );

}

async function openInternFeedbackResultsForNews(
  newsId,
  title,
  newsSlug
) {

  const newsItem = {
    id: newsId,
    slug: newsSlug || ''
  };

  let feedbackModule = null;

  if (
    typeof fetchFeedbackModuleForNews === 'function'
  ) {

    feedbackModule =
      await fetchFeedbackModuleForNews(
        newsItem
      );

  }

  if (
    !feedbackModule
    && typeof fetchFeedbackModule === 'function'
  ) {

    feedbackModule =
      await fetchFeedbackModule(
        window.siteConfig.feedback.entityTypes.news,
        newsId
      );

  }

  if (!feedbackModule?.id) {

    alert(
      'Für diesen Beitrag gibt es noch keine Umfrage-Auswertung.'
    );

    return;

  }

  await openInternFeedbackResultsModal(
    feedbackModule.id,
    title
  );

}

async function deleteInternNewsFromVorstand(
  newsId
) {

  if (
    !newsId
    || !confirm(
      'Beitrag wirklich löschen?'
    )
  ) {
    return;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .delete()
      .eq('id', newsId);

  if (error) {

    console.error(error);

    alert(
      'Beitrag konnte nicht gelöscht werden.'
    );

    return;

  }

  if (
    typeof reloadAfterInternNewsSave
      === 'function'
  ) {

    reloadAfterInternNewsSave();

    return;

  }

  if (
    typeof invalidateInternNewsCache
      === 'function'
  ) {
    invalidateInternNewsCache();
  }

  const onDetail =
    document.getElementById('intern-detail');

  if (onDetail) {

    window.location.href =
      typeof getInternUrl === 'function'
        ? getInternUrl()
        : '/intern/';

    return;

  }

  if (
    typeof loadInternNewsCards
      === 'function'
  ) {
    void loadInternNewsCards();
    return;

  }

  window.location.reload();

}

function bindInternVorstandActions(
  container
) {

  if (
    !container
    || container.dataset.internVorstandBound
      === 'true'
  ) {
    return;
  }

  container.dataset.internVorstandBound =
    'true';

  container.addEventListener(
    'click',
    (clickEvent) => {

      const target =
        clickEvent.target;

      const editButton =
        target.closest(
          '[data-intern-vorstand-edit]'
        );

      if (editButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const newsId =
          parseInt(
            editButton.dataset.newsId,
            10
          );

        if (newsId) {
          openMemberInternEditor({
            id: newsId
          });
        }

        return;

      }

      const resultsButton =
        target.closest(
          '[data-intern-vorstand-results]'
        );

      if (resultsButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const newsId =
          parseInt(
            resultsButton.dataset.newsId,
            10
          );

        if (newsId) {

          const detailRoot =
            document.getElementById(
              'intern-detail'
            );

          void openInternFeedbackResultsForNews(
            newsId,
            resultsButton.dataset.newsTitle
              || '',
            detailRoot?.dataset?.newsSlug
              || ''
          );

        }

        return;

      }

      const deleteButton =
        target.closest(
          '[data-intern-vorstand-delete]'
        );

      if (deleteButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const newsId =
          parseInt(
            deleteButton.dataset.newsId,
            10
          );

        if (newsId) {
          void deleteInternNewsFromVorstand(
            newsId
          );
        }

      }

    }
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    const detailRoot =
      document.getElementById(
        'intern-detail'
      );

    if (
      !detailRoot
      || !detailRoot.dataset.newsId
    ) {
      return;
    }

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    if (
      !canShowInternDetailVorstandTools(
        member
      )
    ) {
      return;
    }

    initInternDetailVorstand(
      {
        id:
          parseInt(
            detailRoot.dataset.newsId,
            10
          ),
        title:
          detailRoot.dataset.newsTitle
          || ''
      },
      member
    );

  }
);
