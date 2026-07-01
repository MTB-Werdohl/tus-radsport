async function reloadInternAfterVorstandChange() {

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
