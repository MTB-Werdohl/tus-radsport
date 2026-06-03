document
  .getElementById('push-form')
  ?.addEventListener('submit', async (event) => {

    event.preventDefault();

    const title =
      document.getElementById('push-title').value.trim();

    const body =
      document.getElementById('push-body').value.trim();

    const url =
      document.getElementById('push-url').value.trim() || '/';

    const status =
      document.getElementById('push-status');

    status.innerText =
      'Tröte wird aktualisiert …';

    const {

      data: { session }

    } =
      await window.supabaseClient.auth.getSession();

    if (!session?.access_token) {

      status.innerText =
        '❌ Nicht angemeldet';

      return;

    }

    if (typeof saveLastPush !== 'function') {

      status.innerText =
        '❌ Speichern nicht verfügbar';

      return;

    }

    try {

      const ok =
        await saveLastPush(
          title,
          body,
          url
        );

      if (!ok) {

        status.innerText =
          '❌ Fehler beim Speichern';

        return;

      }

      status.innerText =
        '✅ Tröte aktualisiert';

      document
        .getElementById('push-form')
        .reset();

    } catch (error) {

      console.error(error);

      status.innerText =
        '❌ Fehler beim Speichern';

    }

  });
