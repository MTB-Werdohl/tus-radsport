async function fetchNewsForViewer(
  member,
  options = {}
) {

  let query =
    window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

  const includeDrafts =
    options.includeDrafts === true
    && viewerIncludesDrafts(member);

  if (!includeDrafts) {

    query =
      query.neq(
        'sichtbarkeit',
        window.siteConfig.visibility.draft
      );

  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return enrichContentRowsWithCreators(
    data || []
  );

}

async function fetchNewsList() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .neq(
        'sichtbarkeit',
        window.siteConfig.visibility.draft
      )
      .order(
        'created_at',
        { ascending: false }
      );

  if (error) {
    throw error;
  }

  return enrichContentRowsWithCreators(
    data || []
  );

}

async function fetchPublishedNews() {

  const current =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  const member =
    typeof getViewerMember === 'function'
      ? getViewerMember(current)
      : current;

  return fetchNewsForViewer(member);

}

async function fetchNewsBySlug(
  slug,
  member
) {

  let query =
    window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('slug', slug);

  if (
    !viewerIncludesDrafts(member)
  ) {

    query =
      query.neq(
        'sichtbarkeit',
        window.siteConfig.visibility.draft
      );

  }

  const { data, error } =
    await query.maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return enrichContentRowWithCreator(data);

}

async function fetchNews(slug) {

  const current =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  const member =
    typeof getViewerMember === 'function'
      ? getViewerMember(current)
      : current;

  return fetchNewsBySlug(
    slug,
    member
  );

}
