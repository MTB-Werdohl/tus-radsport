window.requireAdminSession = async function (callback) {

  const { data } =
    await window.supabaseClient.auth.getSession();

  if (!data.session) {

    window.location.href = '/admin/';

    return;

  }

  if (typeof callback === 'function') {

    return callback();

  }

};
