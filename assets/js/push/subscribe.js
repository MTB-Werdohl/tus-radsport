async function subscribeUserToPush() {

  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (!('PushManager' in window)) {
    return;
  }

  const registration =
    await navigator.serviceWorker.ready;

  const permission =
    await Notification.requestPermission();

  if (permission !== 'granted') {
    return;
  }

  const subscription =
    await registration.pushManager.subscribe({

      userVisibleOnly: true,

      applicationServerKey:
        urlBase64ToUint8Array(
          window.siteConfig.vapidPublicKey
        )

    });

  await saveSubscription(subscription);

}
