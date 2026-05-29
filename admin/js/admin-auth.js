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

  if (!member || !isVorstand(member)) {
    return null;
  }

  return member;

}

let adminAuthSyncStarted = false;

function startAdminAuthSync() {

  if (
    adminAuthSyncStarted
    || !window.supabaseClient
    || !window.location.pathname.startsWith('/admin')
  ) {
    return;
  }

  adminAuthSyncStarted = true;

  window.supabaseClient.auth.onAuthStateChange(

    async (event, session) => {

      if (
        event === 'SIGNED_OUT'
      ) {

        window.location.href = '/';

        return;

      }

      if (
        event === 'SIGNED_IN'
        && session?.user
      ) {

        const member =
          await ensureVorstandSession({
            timeoutMs: 5000
          });

        if (
          member
          && document.getElementById('admin')
            ?.dataset.sessionReady
            !== 'true'
        ) {

          window.location.reload();

        }

      }

    }

  );

  window.addEventListener(

    'storage',

    async (event) => {

      if (
        !event.key
        || !event.key.includes('auth-token')
      ) {
        return;
      }

      await window.supabaseClient.auth.getSession();

    }

  );

}

startAdminAuthSync();
