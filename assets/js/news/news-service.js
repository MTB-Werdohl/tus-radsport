async function fetchNewsForViewer(
  member
) {

  let query =
    window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

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
    await query;

  if (error) {
    throw error;
  }

  return data || [];

}

async function fetchPublishedNews() {

  const member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

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

  return data;

}

async function fetchNews(slug) {

  const member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  return fetchNewsBySlug(
    slug,
    member
  );

}
