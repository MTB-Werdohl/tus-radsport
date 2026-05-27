async function saveSubscription(
  subscription,
  metadata = {}
) {

  const subscriptionJson =
    typeof subscription.toJSON === 'function'
      ? subscription.toJSON()
      : subscription;

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  const token =
    session?.access_token
    || window.siteConfig.supabaseAnonKey;

  const response = await fetch(
    getFunctionUrl('savePushSubscription'),
    {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${token}`

      },

      body: JSON.stringify({

        subscription: subscriptionJson,

        member_id: metadata.memberId,

        device_name: metadata.deviceName,

        user_agent: metadata.userAgent

      })

    }
  );

  const result = await response.json();

  if (!response.ok) {

    throw new Error(
      result.error
      || result.message
      || 'Push-Subscription konnte nicht gespeichert werden.'
    );

  }

  return result;

}
