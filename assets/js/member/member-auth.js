const MEMBER_ERROR_NOT_FOUND =
  'Kein Vereinsmitglied gefunden.';

let currentMember = null;

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

function showMemberMessage(
  text,
  type
) {

  const messageEl =
    document.getElementById(
      'member-auth-message'
    );

  if (!messageEl) {
    return;
  }

  messageEl.textContent = text;
  messageEl.className =
    `member-auth-message member-auth-message--${type}`;
  messageEl.hidden = !text;

}

async function rejectInvalidMemberSession() {

  currentMember = null;

  await window.supabaseClient.auth.signOut();

  showMemberMessage(
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

async function ensureMemberSession(
  options
) {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  return validateMemberSession(
    session,
    options
  );

}

async function sendMemberMagicLink(email) {

  const normalized =
    email.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  showMemberMessage('', 'info');

  const member =
    await fetchMemberByEmail(normalized);

  if (!member) {

    showMemberMessage(
      MEMBER_ERROR_NOT_FOUND,
      'error'
    );

    return false;

  }

  const { error } =
    await window.supabaseClient.auth.signInWithOtp({

      email: normalized,

      options: {

        // Nur nach members-Check — kein OTP für Unbekannte
        shouldCreateUser: true,

        emailRedirectTo:
          `${window.siteConfig.siteUrl}/profil/`

      }

    });

  if (error) {

    console.error(error);

    showMemberMessage(
      error.message,
      'error'
    );

    return false;

  }

  showMemberMessage(
    'Login-Link wurde an deine E-Mail gesendet.',
    'success'
  );

  return true;

}

async function logoutMember() {

  await window.supabaseClient.auth.signOut();

  currentMember = null;

  showMemberMessage('', 'info');

}

function cleanAuthCallbackUrl() {

  if (
    !window.location.hash &&
    !window.location.search.includes('code=')
  ) {
    return;
  }

  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}${window.location.pathname.endsWith('/') ? '' : '/'}`
  );

}

async function initMemberAuth() {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  await validateMemberSession(
    session,
    { strict: true }
  );

  if (
    typeof updateMemberNav === 'function'
  ) {
    updateMemberNav(currentMember);
  }

  cleanAuthCallbackUrl();

  window.supabaseClient.auth.onAuthStateChange(

    async (event, session) => {

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED'
      ) {

        await validateMemberSession(
          session,
          { strict: true }
        );

        cleanAuthCallbackUrl();

      }

      if (event === 'SIGNED_OUT') {

        currentMember = null;

        showMemberMessage('', 'info');

      }

      if (
        typeof updateMemberNav === 'function'
      ) {
        updateMemberNav(currentMember);
      }

    }

  );

}
