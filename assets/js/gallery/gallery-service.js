async function fetchGalleries() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleries)
      .select(`
        *,
        gallery_images(count)
      `)
      .order('event_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];

}

async function fetchGalleryBySlug(slug) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleries)
      .select('*')
      .eq('slug', slug)
      .single();

  if (error) {
    return null;
  }

  return data;

}

async function fetchGalleryImages(galleryId) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleryImages)
      .select('*')
      .eq('gallery_id', galleryId)
      .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];

}
