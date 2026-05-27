async function unsubscribeUserFromPush() {

  if (!('serviceWorker' in navigator)) {

    return {
      ok: false,
      reason: 'unsupported'
    };

  }

  if (!('PushManager' in window)) {

    return {
      ok: false,
      reason: 'unsupported'
    };

  }

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {

    return {
      ok: false,
      reason: 'not_subscribed'
    };

  }

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  const token =
    session?.access_token
    || window.siteConfig.supabaseAnonKey;

  const response = await fetch(
    getFunctionUrl('deletePushSubscription'),
    {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${token}`

      },

      body: JSON.stringify({
        endpoint: subscription.endpoint
      })

    }
  );

  const result = await response.json();

  if (!response.ok) {

    throw new Error(
      result.error
      || result.message
      || 'Push-Subscription konnte nicht entfernt werden.'
    );

  }

  await subscription.unsubscribe();

  return {
    ok: true
  };

}
