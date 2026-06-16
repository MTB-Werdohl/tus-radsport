async function reloadKalenderAfterVorstandChange() {

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

  await loadAllUpcomingTerminCards({
    vorstandActions:
      typeof canShowEventVorstandTools
        === 'function'
      && canShowEventVorstandTools(member)
  });

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

    await loadAllUpcomingTerminCards({
      vorstandActions:
        typeof canShowEventVorstandTools
          === 'function'
        && canShowEventVorstandTools(member)
    });

  }
);
