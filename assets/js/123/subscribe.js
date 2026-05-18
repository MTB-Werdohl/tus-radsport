async function subscribeUserToPush() {

  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (!('PushManager' in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return;
  }

  const subscription = await registration.pushManager.subscribe({

    userVisibleOnly: true,

    applicationServerKey: urlBase64ToUint8Array(
      BK1Qb1ac1BWx72ahU6lCrqJ0SUW9gWoTiREwX3KPbRlgkjpyvsedbHwfuYUI0oEpq2A_FT2RNLPYgJ9Cu9bvJSI
    )

  });

  await saveSubscription(subscription);

}