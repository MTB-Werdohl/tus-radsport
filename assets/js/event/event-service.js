async function getEvent(slug) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('slug', slug)
      .single();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}
