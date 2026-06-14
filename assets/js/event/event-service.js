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
    await query.maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return enrichContentRowWithCreator(data);

}

async function getEventRecap(
  terminId
) {

  if (
    typeof loadPublishedRecapByTerminId
      !== 'function'
  ) {
    return null;
  }

  return loadPublishedRecapByTerminId(
    terminId
  );

}
