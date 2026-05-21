async function fetchNews(slug){

  const {
    data,
    error
  }=
    await supabaseClient
      .from('News')
      .select('*')
      .eq(
        'slug',
        slug
      )
      .eq(
        'published',
        true
      )
      .single();

  if(error){

    console.error(
      error
    );

    return null;

  }

  return data;

}