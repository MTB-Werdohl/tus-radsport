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

  if (
    typeof loadAllUpcomingTerminCards
      !== 'function'
  ) {
    return;
  }

  const cardsWrapper =
    document.getElementById('event-cards');

  if (cardsWrapper) {
    void loadAllUpcomingTerminCards();
    return;
  }

  const homeWrapper =
    document.getElementById(
      'home-termine-teaser'
    );

  if (
    homeWrapper
    && typeof loadCards === 'function'
  ) {

    const start =
      new Date();

    start.setHours(0, 0, 0, 0);

    const end =
      new Date(start);

    end.setFullYear(
      end.getFullYear() + 1
    );

    void loadCards(
      start,
      end,
      {
        wrapperId:
          'home-termine-teaser',
        limit: 3
      }
    );

  }

}

window.addEventListener(
  'member-session-ready',
  () => {

    void refreshTermineAfterMemberLogin();

  }
);
