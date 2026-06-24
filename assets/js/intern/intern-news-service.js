function getInternNewsSlugVisibilityRank(
  value
) {

  const normalized =
    normalizeContentVisibility(value);

  if (
    normalized
    === CONTENT_VISIBILITY.members
  ) {
    return 0;
  }

  if (
    normalized
    === CONTENT_VISIBILITY.draft
  ) {
    return 1;
  }

  return 2;

}

function pickBestInternNewsForSlug(
  rows
) {

  if (!rows?.length) {
    return null;
  }

  if (rows.length === 1) {
    return rows[0];
  }

  return [...rows].sort(
    (left, right) => {

      const rankDiff =
        getInternNewsSlugVisibilityRank(
          left.sichtbarkeit
        )
        - getInternNewsSlugVisibilityRank(
          right.sichtbarkeit
        );

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return (
        (right.id || 0)
        - (left.id || 0)
      );

    }
  )[0];

}

async function getInternNewsItem(
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
    await query;

  if (error) {

    console.error(error);

    return null;

  }

  const picked =
    pickBestInternNewsForSlug(
      data || []
    );

  if (!picked) {
    return null;
  }

  if (
    !isInternNewsVisibility(
      picked.sichtbarkeit
    )
  ) {
    return null;
  }

  if (
    !newsRowVisibleToViewer(
      picked,
      member
    )
  ) {
    return null;
  }

  return enrichContentRowWithCreator(
    picked
  );

}
