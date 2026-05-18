document.addEventListener('DOMContentLoaded', async () => {

  const button =
    document.getElementById('enable-push');

  if (!button) {
    return;
  }

  const registration =
    await navigator.serviceWorker.ready;

  async function updateButton() {

    const subscription =
      await registration
        .pushManager
        .getSubscription();

    if (subscription) {

      button.innerText =
        '🔕 Push abbestellen';

      button.dataset.state =
        'subscribed';

    } else {

      button.innerText =
        '🔔 Push aktivieren';

      button.dataset.state =
        'unsubscribed';

    }

  }

  await updateButton();

  button.addEventListener('click', async () => {

    try {

      if (
        button.dataset.state ===
        'subscribed'
      ) {

        await unsubscribeUserFromPush();

      } else {

        await subscribeUserToPush();

      }

      await updateButton();

    } catch(error) {

      console.error(error);

    }

  });

});