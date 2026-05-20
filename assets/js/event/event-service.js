async function getEvent(slug) {

  const { data, error } =
    await supabaseClient

      .from('Termine')

      .select('*')

      .eq('slug', slug)

      .single();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}