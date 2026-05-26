async function unsubscribeUserFromPush() {

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await fetch(
    `${window.siteConfig.functionsUrl}/delete-push-subscription`,
    {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${window.pushConfig.supabaseKey}`

      },

      body: JSON.stringify({
        endpoint: subscription.endpoint
      })

    }
  );

  await subscription.unsubscribe();

}