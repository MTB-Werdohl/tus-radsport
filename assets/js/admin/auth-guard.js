const VORSTAND_LOGIN_URL =
  '/?login=vorstand';

function isVorstandProtectedPath(
  path
) {

  return (
    path.startsWith('/mitglied-bearbeiten')
    || path.startsWith('/protokoll')
    || path.startsWith('/termin-bearbeiten')
    || path.startsWith('/intern-bearbeiten')
  );

}

window.requireVorstandSession =
  async function (callback) {

    const member =
      await ensureVorstandSession();

    if (!member) {

      sessionStorage.setItem(
        'vorstandReturnUrl',
        window.location.pathname
        + window.location.search
      );

      window.location.href =
        VORSTAND_LOGIN_URL;

      return;

    }

    if (typeof callback === 'function') {

      const shell =
        document.getElementById('vorstand-page')
        || document.getElementById('admin');

      if (shell) {
        shell.dataset.sessionReady = 'true';
      }

      return await callback();

    }

  };

window.requireAdminSession =
  window.requireVorstandSession;
