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

    await loadAllUpcomingTerminCards();

  }
);
