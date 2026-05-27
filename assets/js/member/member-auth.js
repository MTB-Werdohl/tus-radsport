const MEMBER_ERROR_NOT_FOUND =
  'Kein Vereinsmitglied gefunden.';

let currentMember = null;
let toastTimer = null;

function getCurrentMember() {
  return currentMember;
}

function isAuthCallback() {

  const hash =
    window.location.hash || '';

  const search =
    window.location.search || '';

  return hash.includes('access_token')
    || hash.includes('type=magiclink')
    || search.includes('code=');

}

function showMemberToast(
  message,
  type,
  duration
) {

  if (!message) {
    return;
  }

  let container =
    document.getElementById(
      'member-toast-container'
    );

  if (!container) {

    container =
      document.createElement('div');

    container.id =
      'member-toast-container';

    container.className =
      'member-toast-container';

    document.body.appendChild(
      container
    );

  }

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  container.innerHTML = '';

  const toast =
    document.createElement('div');

  toast.className =
    `member-toast member-toast--${type || 'error'}`;

  toast.textContent = message;

  container.appendChild(toast);

  window.requestAnimationFrame(() => {

    toast.classList.add('is-visible');

  });

  toastTimer =
    window.setTimeout(() => {

      toast.classList.remove(
        'is-visible'
      );

      window.setTimeout(() => {

        toast.remove();

        if (
          !container.hasChildNodes()
        ) {
          container.remove();
        }

      }, 300);

    }, duration || 4000);

}

async function rejectInvalidMemberSession() {

  currentMember = null;

  await window.supabaseClient.auth.signOut();

  showMemberToast(
    MEMBER_ERROR_NOT_FOUND,
    'error'
  );

}

async function validateMemberSession(
  session,
  options
) {

  const strict =
    options?.strict === true;

  if (!session?.user?.email) {

    currentMember = null;

    return null;

  }

  const member =
    await fetchMemberByEmail(
      session.user.email
    );

  if (!member) {

    currentMember = null;

    if (strict) {
      await rejectInvalidMemberSession();
    }

    return null;

  }

  currentMember = member;

  return member;

}

async function waitForAuthSession(
  timeoutMs
) {

  const limit =
    timeoutMs || 12000;

  const { data: { session: initial } } =
    await window.supabaseClient.auth.getSession();

  if (initial?.user) {
    return initial;
  }

  if (!isAuthCallback()) {
    return null;
  }

  return new Promise((resolve) => {

    let settled = false;

    const finish = (session) => {

      if (settled) {
        return;
      }

      settled = true;

      window.clearTimeout(timer);

      subscription.unsubscribe();

      resolve(session);

    };

    const timer =
      window.setTimeout(() => {

        finish(null);

      }, limit);

    const { data: { subscription } } =
      window.supabaseClient.auth.onAuthStateChange(

        (event, session) => {

          if (
            !session?.user
          ) {
            return;
          }

          if (
            event === 'SIGNED_IN' ||
            event === 'INITIAL_SESSION' ||
            event === 'TOKEN_REFRESHED'
          ) {
            finish(session);
          }

        }

      );

  });

}

async function ensureMemberSession(
  options
) {

  const session =
    await waitForAuthSession();

  return validateMemberSession(
    session,
    options
  );

}

async function isMemberEmail(email) {

  const normalized =
    email.trim().toLowerCase();

  const { data, error } =
    await window.supabaseClient.rpc(
      'check_member_email',
      { check_email: normalized }
    );

  if (error) {

    console.warn(
      'check_member_email nicht verfügbar:',
      error.message
    );

    return null;

  }

  return data === true;

}

async function sendMemberMagicLink(email) {

  const normalized =
    email.trim().toLowerCase();

  if (
    !normalized ||
    !normalized.includes('@')
  ) {
    return false;
  }

  const isMember =
    await isMemberEmail(normalized);

  if (isMember === false) {

    showMemberToast(
      MEMBER_ERROR_NOT_FOUND,
      'error'
    );

    return false;

  }

  const { error } =
    await window.supabaseClient.auth.signInWithOtp({

      email: normalized,

      options: {

        shouldCreateUser: true,

        emailRedirectTo:
          `${window.siteConfig.siteUrl}/profil/`

      }

    });

  if (error) {

    console.error(error);

    showMemberToast(
      error.message,
      'error'
    );

    return false;

  }

  showMemberToast(
    'Login-Link wurde an deine E-Mail gesendet.',
    'success'
  );

  return true;

}

async function logoutMember() {

  await window.supabaseClient.auth.signOut();

  currentMember = null;

}

function cleanAuthCallbackUrl() {

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

async function initMemberAuth() {

  const session =
    await waitForAuthSession();

  if (session) {

    await validateMemberSession(
      session,
      { strict: true }
    );

    cleanAuthCallbackUrl();

  }

  if (
    typeof updateMemberNav === 'function'
  ) {
    updateMemberNav(currentMember);
  }

  window.supabaseClient.auth.onAuthStateChange(

    async (event, session) => {

      if (
        event === 'SIGNED_IN' &&
        session
      ) {

        await validateMemberSession(
          session,
          { strict: true }
        );

        cleanAuthCallbackUrl();

      }

      if (
        event === 'TOKEN_REFRESHED' &&
        session
      ) {

        await validateMemberSession(
          session,
          { strict: false }
        );

      }

      if (event === 'SIGNED_OUT') {

        currentMember = null;

      }

      if (
        typeof updateMemberNav === 'function'
      ) {
        updateMemberNav(currentMember);
      }

    }

  );

}
