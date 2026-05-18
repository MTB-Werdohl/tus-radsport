async function saveSubscription(subscription) {

  const response = await fetch(
    'https://eazizesytrnknbgrnggj.supabase.co/functions/v1/save-push-subscription',
    {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${window.pushConfig.supabaseKey}`

      },

      body: JSON.stringify(subscription)

    }
  );

  const result = await response.json();

  console.log(result);

  return result;

}