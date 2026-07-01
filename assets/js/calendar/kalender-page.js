async function reloadKalenderAfterVorstandChange(
  savedMeta
) {

  if (
    savedMeta?.slug
    && typeof getEventUrl === 'function'
    && document.getElementById('event')
  ) {

    window.location.href =
      getEventUrl(savedMeta.slug);

    return;

  }

  if (
    typeof invalidateTermineCache
      === 'function'
  ) {
    invalidateTermineCache();
  }

  if (
    typeof loadAllUpcomingTerminCards
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

  await loadAllUpcomingTerminCards();

}

window.reloadAfterVorstandContentSave =
  reloadKalenderAfterVorstandChange;

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

    await loadAllUpcomingTerminCards();

  }
);
