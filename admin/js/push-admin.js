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

    const {

      data: { session }

    } =
      await window.supabaseClient.auth.getSession();

    if (!session?.access_token) {

      status.innerText =
        '❌ Nicht angemeldet';

      return;

    }

    try {

      const response = await fetch(
        getFunctionUrl('sendPush'),
        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

            'Authorization':
              `Bearer ${session.access_token}`

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

      if (!response.ok) {

        status.innerText =
          '❌ '
          + (result.error || 'Fehler beim Senden');

        return;

      }

      console.log(result);

      const saved =
        await savePushMessage(
          title,
          body,
          url
        );

      status.innerText =
        saved
          ? '✅ Push erfolgreich gesendet'
          : '⚠️ Push gesendet, Verlauf konnte nicht gespeichert werden';

      document
        .getElementById('push-form')
        .reset();

    } catch (error) {

      console.error(error);

      status.innerText =
        '❌ Fehler beim Senden';

    }

  });
