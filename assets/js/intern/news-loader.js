let internNewsCache = null;
let internNewsPromise = null;

function invalidateInternNewsCache() {

  internNewsCache = null;
  internNewsPromise = null;

}

function sortInternNewsRows(rows) {

  return [...(rows || [])].sort(
    (left, right) => {

      const leftTime =
        new Date(
          left.created_at
          || left.updated_at
          || 0
        ).getTime();

      const rightTime =
        new Date(
          right.created_at
          || right.updated_at
          || 0
        ).getTime();

      return rightTime - leftTime;

    }
  );

}

async function fetchInternNews() {

  if (internNewsCache) {
    return internNewsCache;
  }

  if (internNewsPromise) {
    return internNewsPromise;
  }

  internNewsPromise = (async () => {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select('*')
        .order('created_at', {
          ascending: false
        });

    if (error) {
      throw error;
    }

    internNewsCache =
      sortInternNewsRows(
        await enrichContentRowsWithCreators(
          data || []
        )
      );

    return internNewsCache;

  })();

  return internNewsPromise;

}

async function refreshInternNewsAfterMemberLogin() {

  invalidateInternNewsCache();

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
    typeof loadInternNewsCards
      !== 'function'
  ) {
    return;
  }

  const wrapper =
    document.getElementById('intern-cards');

  if (wrapper) {
    void loadInternNewsCards();
  }

}

window.addEventListener(
  'member-session-ready',
  () => {

    void refreshInternNewsAfterMemberLogin();

  }
);
