function getTerminSlugVisibilityRank(
  value
) {

  const normalized =
    normalizeContentVisibility(value);

  if (
    normalized
    === CONTENT_VISIBILITY.public
  ) {
    return 0;
  }

  if (
    normalized
    === CONTENT_VISIBILITY.members
  ) {
    return 1;
  }

  if (
    normalized
    === CONTENT_VISIBILITY.draft
  ) {
    return 2;
  }

  return 3;

}

function pickBestTerminForSlug(
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
        getTerminSlugVisibilityRank(
          left.sichtbarkeit
        )
        - getTerminSlugVisibilityRank(
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

async function getEvent(
  slug,
  member
) {

  let query =
    window.supabaseClient
      .from(window.siteConfig.tables.termine)
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
    pickBestTerminForSlug(
      data || []
    );

  if (!picked) {
    return null;
  }

  const enriched =
    await enrichContentRowWithCreator(
      picked
    );

  if (
    !enriched
    || typeof loadTerminRouteStages
      !== 'function'
  ) {
    return enriched;
  }

  enriched.route_stages =
    await loadTerminRouteStages(
      enriched.id
    );

  if (!enriched.route_stages.length) {

    enriched.route_stages =
      buildTerminRouteStagesFromLegacy(
        enriched
      );

  }

  return enriched;

}
