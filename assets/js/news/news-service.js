async function fetchPublishedNews() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .neq(
        'sichtbarkeit',
        window.siteConfig.visibility.draft
      )
      .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];

}
