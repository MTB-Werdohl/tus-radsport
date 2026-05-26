async function saveLastPush(
  title,
  body,
  url
) {

  const payload = {

    title,

    body,

    url,

    sent_at:
      new Date()
      .toISOString()

  };

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.siteState)
      .upsert({
        key: window.siteConfig.siteStateKeys.lastPush,
        value: payload
      });

  if (error) {

    console.error(error);

    return false;

  }

  return true;

}

async function getLastPush() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.siteState)
      .select('value')
      .eq(
        'key',
        window.siteConfig.siteStateKeys.lastPush
      )
      .single();

  if (error) {

    console.error(error);

    return null;

  }

  return data?.value;

}
