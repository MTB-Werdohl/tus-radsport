async function subscribeUserToPush(options = {}) {

  const memberId =
    options.memberId;

  if (!memberId) {

    return {
      ok: false,
      reason: 'not_authenticated'
    };

  }

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
    await ensurePushServiceWorker()
      .then(() => navigator.serviceWorker.ready);

  const permission =
    await Notification.requestPermission();

  if (permission !== 'granted') {

    return {
      ok: false,
      reason: 'permission_denied'
    };

  }

  let subscription =
    await registration
      .pushManager
      .getSubscription();

  if (!subscription) {

    subscription =
      await registration.pushManager.subscribe({

        userVisibleOnly: true,

        applicationServerKey:
          urlBase64ToUint8Array(
            window.siteConfig.vapidPublicKey
          )

      });

  }

  await saveSubscription(
    subscription,
    {
      memberId,
      deviceName: getDeviceName(),
      userAgent: navigator.userAgent
    }
  );

  return {
    ok: true
  };

}
