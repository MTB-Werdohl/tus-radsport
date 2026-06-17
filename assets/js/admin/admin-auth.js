async function ensureVorstandSession(
  options = {}
) {

  const session =
    await waitForAuthSession(
      options.timeoutMs
    );

  if (!session?.user?.email) {
    return null;
  }

  const member =
    await fetchMemberByEmail(
      session.user.email
    );

  if (!member || !isRealVorstand(member)) {
    return null;
  }

  return member;

}

let vorstandAuthSyncStarted = false;

function startVorstandAuthSync() {

  if (
    vorstandAuthSyncStarted
    || !window.supabaseClient
    || !isVorstandProtectedPath(
      window.location.pathname
    )
  ) {
    return;
  }

  vorstandAuthSyncStarted = true;

  let signOutTimer = null;

  window.addEventListener(
    'storage',
    (event) => {

      if (
        !event.key
        || !event.key.includes('auth-token')
      ) {
        return;
      }

      window.clearTimeout(signOutTimer);

      if (event.newValue) {

        window.supabaseClient.auth.getSession();

        return;

      }

      const shell =
        document.getElementById('vorstand-page')
        || document.getElementById('admin');

      if (
        shell?.dataset.sessionReady
        !== 'true'
      ) {
        return;
      }

      signOutTimer =
        window.setTimeout(async () => {

          const { data: { session } } =
            await window.supabaseClient.auth.getSession();

          if (!session?.user) {
            window.location.href = '/';
          }

        }, 500);

    }
  );

}

startVorstandAuthSync();
