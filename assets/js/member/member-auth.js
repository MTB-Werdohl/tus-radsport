const MEMBER_ERROR_NOT_FOUND =
  'Kein Vereinsmitglied gefunden.';

let currentMember = null;
let toastTimer = null;

function getCurrentMember() {
  return currentMember;
}

function refreshMemberNav() {

  if (
    typeof updateMemberNav === 'function'
  ) {
    updateMemberNav(currentMember);
  }

}

function applyMemberUpdate(row) {

  currentMember =
    normalizeMemberRow(row);

  refreshMemberNav();

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

  await window.supabaseClient.auth.signOut({
    scope: 'local'
  });

  showMemberToast(
    MEMBER_ERROR_NOT_FOUND,
    'error'
  );

}

async function ensurePublicParticipantFromSession(
  session
) {

  if (!session?.user?.email) {
    return null;
  }

  let member =
    await fetchMemberByEmail(
      session.user.email
    );

  if (member) {
    return member;
  }

  const meta =
    session.user.user_metadata
    || {};

  const pending =
    typeof readPublicRegistrationPending
      === 'function'
      ? readPublicRegistrationPending(
          session.user.email
        )
      : null;

  const isPublicRegistration =
    meta.public_registration
    === true
    || !!pending;

  if (!isPublicRegistration) {
    return null;
  }

  const vorname =
    String(
      meta.vorname
      || pending?.vorname
      || ''
    ).trim();

  const nachname =
    String(
      meta.nachname
      || pending?.nachname
      || ''
    ).trim();

  const telefon =
    meta.telefon
      ? String(meta.telefon).trim()
      : (
          pending?.telefon
            ? String(pending.telefon).trim()
            : null
        );

  if (
    !vorname
    && !nachname
  ) {
    return null;
  }

  const { error } =
    await window.supabaseClient.rpc(
      'complete_public_participant_registration',
      {
        p_vorname: vorname,
        p_nachname: nachname,
        p_telefon: telefon
      }
    );

  if (error) {

    console.error(error);

    return null;

  }

  if (
    typeof clearPublicRegistrationPending
      === 'function'
  ) {
    clearPublicRegistrationPending();
  }

  member =
    await fetchMemberByEmail(
      session.user.email
    );

  return member;

}

function notifyMemberSessionReady() {

  window.dispatchEvent(
    new CustomEvent(
      'member-session-ready',
      {
        detail: {
          member: currentMember
        }
      }
    )
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

  let member =
    await fetchMemberByEmail(
      session.user.email
    );

  if (
    member
    && isAnonymizedMember(member)
  ) {
    member = null;
  }

  if (!member) {

    member =
      await ensurePublicParticipantFromSession(
        session
      );

  }

  if (!member) {

    currentMember = null;

    if (strict) {

      const meta =
        session.user.user_metadata
        || {};

      const pending =
        typeof readPublicRegistrationPending
          === 'function'
          ? readPublicRegistrationPending(
              session.user.email
            )
          : null;

      if (
        meta.public_registration
        === true
        || pending
      ) {

        showMemberToast(
          'Registrierung konnte nicht abgeschlossen werden. Bitte Formular erneut ausfüllen.',
          'error'
        );

        await window.supabaseClient.auth.signOut({
          scope: 'local'
        });

      } else {

        await rejectInvalidMemberSession();

      }

    }

    return null;

  }

  const previousMember =
    currentMember;

  currentMember = member;

  refreshMemberNav();

  if (
    !previousMember?.id
    && member?.id
  ) {
    notifyMemberSessionReady();
  }

  return member;

}

async function recoverAuthSessionFromUrl() {

  if (!isAuthCallback()) {
    return null;
  }

  const { data: existing } =
    await window.supabaseClient.auth.getSession();

  if (existing.session?.user) {
    return existing.session;
  }

  const searchParams =
    new URLSearchParams(
      window.location.search
    );

  const code =
    searchParams.get('code');

  if (code) {

    const { data, error } =
      await window.supabaseClient.auth.exchangeCodeForSession(
        code
      );

    if (
      !error
      && data?.session?.user
    ) {
      return data.session;
    }

    if (error) {
      console.error(
        'Auth code exchange:',
        error
      );
    }

  }

  const hash =
    window.location.hash.replace(
      /^#/,
      ''
    );

  if (
    hash.includes('access_token=')
  ) {

    const hashParams =
      new URLSearchParams(hash);

    const accessToken =
      hashParams.get('access_token');

    const refreshToken =
      hashParams.get('refresh_token');

    if (
      accessToken
      && refreshToken
    ) {

      const { data, error } =
        await window.supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

      if (
        !error
        && data?.session?.user
      ) {
        return data.session;
      }

      if (error) {
        console.error(
          'Auth hash session:',
          error
        );
      }

    }

  }

  return null;

}

async function waitForAuthSession(
  timeoutMs
) {

  if (isAuthCallback()) {

    const recovered =
      await recoverAuthSessionFromUrl();

    if (recovered?.user) {
      return recovered;
    }

  }

  const callbackTimeout =
    timeoutMs || 12000;

  const hydrateTimeout =
    3000;

  const waitMs =
    isAuthCallback()
      ? callbackTimeout
      : hydrateTimeout;

  return new Promise((resolve) => {

    let settled = false;

    let subscription = null;

    const finish = (session) => {

      if (settled) {
        return;
      }

      settled = true;

      window.clearTimeout(timer);

      subscription?.unsubscribe();

      resolve(
        session?.user
          ? session
          : null
      );

    };

    const timer =
      window.setTimeout(() => {

        finish(null);

      }, waitMs);

    const { data } =
      window.supabaseClient.auth.onAuthStateChange(

        (event, session) => {

          if (
            event === 'INITIAL_SESSION'
          ) {

            if (
              session?.user
              || !isAuthCallback()
            ) {
              finish(session);
            }

            return;

          }

          if (
            !isAuthCallback()
          ) {
            return;
          }

          if (
            !session?.user
          ) {
            return;
          }

          if (
            event === 'SIGNED_IN'
            || event === 'TOKEN_REFRESHED'
          ) {
            finish(session);
          }

        }

      );

    subscription =
      data.subscription;

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

  if (isMember !== true) {

    showMemberToast(
      isMember === false
        ? MEMBER_ERROR_NOT_FOUND
        : 'Mitgliedsprüfung fehlgeschlagen. Bitte später erneut versuchen.',
      'error'
    );

    return false;

  }

  const adminReturn =
    sessionStorage.getItem('adminReturnUrl');

  let emailRedirectTo =
    `${window.siteConfig.siteUrl}/profil/`;

  if (
    adminReturn
    && adminReturn.startsWith('/admin')
  ) {

    emailRedirectTo +=
      `?next=${encodeURIComponent(adminReturn)}`;

  }

  const { error } =
    await window.supabaseClient.auth.signInWithOtp({

      email: normalized,

      options: {

        shouldCreateUser: true,

        emailRedirectTo

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
    'Login-Link wurde an deine E-Mail gesendet. Den Link im gleichen Browser öffnen — ein zweiter Tab ist normal und kann danach geschlossen werden.',
    'success',
    7000
  );

  return true;

}

async function logoutMember() {

  await window.supabaseClient.auth.signOut({
    scope: 'local'
  });

  currentMember = null;

  refreshMemberNav();

}

function cleanAuthCallbackUrl() {

  if (!isAuthCallback()) {
    return;
  }

  sessionStorage.setItem(
    'memberLoginCallback',
    '1'
  );

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
    refreshMemberNav();
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

      refreshMemberNav();

      if (
        typeof handleAdminLoginIntent
          === 'function'
      ) {
        handleAdminLoginIntent();
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

      const { data: { session } } =
        await window.supabaseClient.auth.getSession();

      if (session?.user) {

        await validateMemberSession(
          session,
          { strict: false }
        );

      } else {

        currentMember = null;

      }

      refreshMemberNav();

      if (
        typeof handleAdminLoginIntent
          === 'function'
      ) {
        handleAdminLoginIntent();
      }

    }

  );

}
