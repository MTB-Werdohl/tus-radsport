document
  .getElementById('push-form')
  ?.addEventListener('submit', async (event) => {

    event.preventDefault();

    const title =
      document.getElementById('push-title').value;

    const body =
      document.getElementById('push-body').value;

    const url =
      document.getElementById('push-url').value || '/';

    const status =
      document.getElementById('push-status');

    status.innerText =
      'Push wird gesendet...';

    try {

      const response = await fetch(
        getFunctionUrl('sendPush'),
        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

            'Authorization':
              `Bearer ${window.siteConfig.supabaseAnonKey}`

          },

          body: JSON.stringify({

            title,
            body,
            url

          })

        }
      );

      const result =
        await response.json();

      console.log(result);

      await saveLastPush(

        title,

        body,

        url

      );

      status.innerText =
        '✅ Push erfolgreich gesendet';

      document
        .getElementById('push-form')
        .reset();

    } catch (error) {

      console.error(error);

      status.innerText =
        '❌ Fehler beim Senden';

    }

  });
