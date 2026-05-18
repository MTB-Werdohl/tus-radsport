document.addEventListener('DOMContentLoaded', () => {

  const button =
    document.getElementById('enable-push');

  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {

    try {

      await subscribeUserToPush();

      button.innerText =
        '✅ Push aktiviert';

      button.disabled = true;

    } catch(error) {

      console.error(error);

    }

  });

});