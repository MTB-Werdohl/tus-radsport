async function saveSubscription(subscription) {

  const response = await fetch(
    getFunctionUrl('savePushSubscription'),
    {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${window.siteConfig.supabaseAnonKey}`

      },

      body: JSON.stringify(subscription)

    }
  );

  const result = await response.json();

  console.log(result);

  return result;

}
