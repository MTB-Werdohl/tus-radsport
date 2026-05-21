async function loadNews(){

  const {
    data,
    error
  } =
    await supabaseClient
      .from('News')
      .select('*')
      .eq(
        'published',
        true
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      );

  if(error){

    console.error(
      'News Fehler:',
      error
    );

    return;

  }

  renderNewsCards(
    data
  );

}

loadNews();