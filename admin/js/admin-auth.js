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

    if (options.signOutOnDeny) {

      await window.supabaseClient.auth.signOut();

    }

    return null;

  }

  return member;

}

function cleanAdminAuthCallbackUrl() {

  if (!isAuthCallback()) {
    return;
  }

  const path =
    window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;

  window.history.replaceState(
    {},
    '',
    path
  );

}

async function initAdminLoginPage() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  if (
    params.get('error') === 'access_denied'
  ) {

    alert(ADMIN_ERROR_NOT_VORSTAND);

    window.history.replaceState(
      {},
      '',
      '/admin/'
    );

  }

  const member =
    await ensureVorstandSession();

  if (member) {

    cleanAdminAuthCallbackUrl();

    if (
      typeof showAdminDashboard === 'function'
    ) {
      showAdminDashboard();
    }

    return;

  }

  if (isAuthCallback()) {

    await window.supabaseClient.auth.signOut();

    window.location.href =
      '/admin/?error=access_denied';

  }

}
