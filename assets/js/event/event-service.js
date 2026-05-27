async function getEvent(slug) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('slug', slug)
      .neq(
        'sichtbarkeit',
        window.siteConfig.visibility.draft
      )
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}
