async function unsubscribeUserFromPush() {

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await fetch(
    getFunctionUrl('deletePushSubscription'),
    {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${window.siteConfig.supabaseAnonKey}`

      },

      body: JSON.stringify({
        endpoint: subscription.endpoint
      })

    }
  );

  await subscription.unsubscribe();

}
