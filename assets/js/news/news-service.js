async function fetchPublishedNews() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];

}
