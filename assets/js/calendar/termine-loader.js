let termineCache = null;
let terminePromise = null;

function invalidateTermineCache() {

  termineCache = null;
  terminePromise = null;

}

async function fetchTermine() {

  if (termineCache) {
    return termineCache;
  }

  if (terminePromise) {
    return terminePromise;
  }

  terminePromise = (async () => {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select('*');

    if (error) {
      throw error;
    }

    termineCache =
      await enrichContentRowsWithCreators(
        data || []
      );

    return termineCache;

  })();

  return terminePromise;

}

async function refreshTermineAfterMemberLogin() {

  invalidateTermineCache();

  if (
    typeof getCurrentMember === 'function'
  ) {

    window.contentViewerMember =
      typeof getViewerMember === 'function'
        ? getViewerMember(
          getCurrentMember()
        )
        : getCurrentMember();

  } else if (
    typeof ensureContentViewerMember
      === 'function'
  ) {

    window.contentViewerMember =
      await ensureContentViewerMember();

  }

  const calendar =
    window.__siteCalendar;

  if (
    calendar
    && typeof calendar.refetchEvents
      === 'function'
  ) {

    calendar.refetchEvents();

    const view =
      calendar.view;

    if (
      view
      && typeof loadCards === 'function'
    ) {

      const start =
        new Date(
          view.currentStart.getFullYear(),
          view.currentStart.getMonth(),
          1
        );

      const end =
        new Date(
          view.currentStart.getFullYear(),
          view.currentStart.getMonth() + 1,
          1
        );

      loadCards(
        start,
        end
      );

    }

    return;

  }

  if (
    typeof loadCards !== 'function'
  ) {
    return;
  }

  const cardsWrapper =
    document.getElementById('event-cards');

  if (!cardsWrapper) {
    return;
  }

  const now =
    new Date();

  loadCards(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ),
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    )
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    void refreshTermineAfterMemberLogin();

  }
);

window.addEventListener(
  'admin-preview-changed',
  () => {

    if (
      typeof syncContentViewerMember
        === 'function'
    ) {
      syncContentViewerMember();
    }

    void refreshTermineAfterMemberLogin();

  }
);
