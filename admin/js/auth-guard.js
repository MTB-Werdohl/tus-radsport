window.requireAdminSession = async function (callback) {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  if (!session) {

    window.location.href = '/admin/';

    return;

  }

  const member =
    await fetchMemberByEmail(
      session.user.email
    );

  if (!member || !isVorstand(member)) {

    await window.supabaseClient.auth.signOut();

    window.location.href =
      '/admin/?error=access_denied';

    return;

  }

  if (typeof callback === 'function') {

    return callback();

  }

};
