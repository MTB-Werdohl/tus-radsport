function renderInternVorstandActionsHtml(
  item
) {

  return `
<div class="calendar-card__vorstand-actions">

<button
  type="button"
  class="news-vorstand-btn"
  data-intern-vorstand-edit
  data-news-id="${item.id}">

  Bearbeiten

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

function openMemberInternEditor(
  options = {}
) {

  openMemberInternEditorPopup(options);

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
