let pushServiceWorkerPromise = null;

function ensurePushServiceWorker() {

  if (!('serviceWorker' in navigator)) {

    return Promise.reject(
      new Error(
        'Service Worker wird nicht unterstützt.'
      )
    );

  }

  if (!pushServiceWorkerPromise) {

    pushServiceWorkerPromise =
      navigator.serviceWorker.register('/sw.js');

  }

  return pushServiceWorkerPromise;

}
