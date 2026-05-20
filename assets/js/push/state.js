async function saveLastPush(
  title,
  body,
  url
){

  const payload = {

    title,

    body,

    url,

    sent_at:
      new Date()
      .toISOString()

  };

  const { error } =

    await window
      .supabaseClient

      .from('site_state')

      .upsert({

        key:'last_push',

        value:payload

      });

  if(error){

    console.error(
      error
    );

    return false;

  }

  return true;

}


async function getLastPush(){

  const {

    data,

    error

  } =

  await window
    .supabaseClient

    .from('site_state')

    .select('value')

    .eq(
      'key',
      'last_push'
    )

    .single();

  if(error){

    console.error(
      error
    );

    return null;

  }

  return data?.value;

}