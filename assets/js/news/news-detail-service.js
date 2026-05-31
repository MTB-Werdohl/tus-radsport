async function fetchNews(slug) {

  const member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  if (
    typeof fetchNewsBySlug === 'function'
  ) {

    return fetchNewsBySlug(
      slug,
      member
    );

  }

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
