async function reloadInternAfterVorstandChange(
  savedMeta
) {

  if (
    savedMeta?.slug
    && typeof getInternNewsUrl === 'function'
    && document.getElementById('intern-detail')
  ) {

    window.location.href =
      getInternNewsUrl(savedMeta.slug);

    return;

  }

  if (
    typeof invalidateInternNewsCache
      === 'function'
  ) {
    invalidateInternNewsCache();
  }

  if (
    typeof loadInternNewsCards
      !== 'function'
  ) {
    window.location.reload();
    return;
  }

  const member =
    typeof resolveContentListingViewer
      === 'function'
      ? resolveContentListingViewer()
      : null;

  await loadInternNewsCards();

}

window.reloadAfterInternNewsSave =
  reloadInternAfterVorstandChange;

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    if (
      typeof ensureContentViewerMember
        === 'function'
    ) {

      window.contentViewerMember =
        await ensureContentViewerMember();

    }

    const member =
      window.contentViewerMember;

    await loadInternNewsCards();

  }
);
