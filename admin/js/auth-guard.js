const ADMIN_HOME_URL = '/';

window.requireAdminSession = async function (callback) {

  const member =
    await ensureVorstandSession();

  if (!member) {

    window.location.href =
      ADMIN_HOME_URL;

    return;

  }

  if (typeof callback === 'function') {

    const adminRoot =
      document.getElementById('admin');

    if (adminRoot) {
      adminRoot.dataset.sessionReady = 'true';
    }

    return await callback();

  }

};
