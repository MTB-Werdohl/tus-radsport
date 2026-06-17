function updateMemberNav(member) {

  const guestEl =
    document.getElementById(
      'member-auth-guest'
    );

  const memberEl =
    document.getElementById(
      'member-auth-member'
    );

  const greetingEl =
    document.getElementById(
      'member-greeting'
    );

  const adminLinkEl =
    document.getElementById(
      'member-admin-link'
    );

  if (!guestEl || !memberEl) {
    return;
  }

  const isLoggedIn = !!member;

  guestEl.classList.toggle(
    'is-active',
    !isLoggedIn
  );

  memberEl.classList.toggle(
    'is-active',
    isLoggedIn
  );

  guestEl.hidden = isLoggedIn;
  memberEl.hidden = !isLoggedIn;

  if (!isLoggedIn) {

    closeMemberAuthPanel();

    if (greetingEl) {
      greetingEl.textContent = '';
    }

    if (adminLinkEl) {
      adminLinkEl.hidden = true;
    }

    return;

  }

  if (adminLinkEl) {

    adminLinkEl.hidden =
      !isVorstand(member);

  }

  if (greetingEl) {

    const name =
      member.vorname || 'Mitglied';

    greetingEl.textContent =
      `Hallo ${name}`;

  }

}

function closeMemberAuthPanel() {

  const dropdown =
    document.getElementById(
      'member-auth-dropdown'
    );

  const trigger =
    document.getElementById(
      'member-auth-trigger'
    );

  if (!dropdown) {
    return;
  }

  dropdown.classList.remove('is-open');

  if (trigger) {
    trigger.setAttribute(
      'aria-expanded',
      'false'
    );
  }

}

function openMemberAuthPanel() {

  const dropdown =
    document.getElementById(
      'member-auth-dropdown'
    );

  const trigger =
    document.getElementById(
      'member-auth-trigger'
    );

  if (!dropdown || !trigger) {
    return;
  }

  dropdown.classList.add('is-open');

  trigger.setAttribute(
    'aria-expanded',
    'true'
  );

  const emailInput =
    document.getElementById(
      'member-email'
    );

  if (emailInput) {
    window.setTimeout(
      () => emailInput.focus(),
      0
    );
  }

}

function handleAdminLoginIntent() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  if (params.get('login') !== 'admin') {
    return;
  }

  const member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  if (
    member
    && typeof isRealVorstand === 'function'
    && isRealVorstand(member)
  ) {

    const returnUrl =
      sessionStorage.getItem('adminReturnUrl')
      || '/profil/?tab=verwaltung';

    sessionStorage.removeItem('adminReturnUrl');

    window.location.replace(returnUrl);

    return;

  }

  openMemberAuthPanel();

  if (
    typeof showMemberToast === 'function'
  ) {

    showMemberToast(
      'Bitte anmelden, um den Admin-Bereich zu öffnen.',
      'success',
      5000
    );

  }

}

function setupMemberAuthDropdown() {

  const dropdown =
    document.getElementById(
      'member-auth-dropdown'
    );

  const trigger =
    document.getElementById(
      'member-auth-trigger'
    );

  const panel =
    document.getElementById(
      'member-auth-panel'
    );

  if (!dropdown || !trigger || !panel) {
    return;
  }

  trigger.addEventListener(
    'click',
    (event) => {

      event.stopPropagation();

      const open =
        !dropdown.classList.contains(
          'is-open'
        );

      dropdown.classList.toggle(
        'is-open',
        open
      );

      trigger.setAttribute(
        'aria-expanded',
        String(open)
      );

      if (open) {

        const emailInput =
          document.getElementById(
            'member-email'
          );

        if (emailInput) {
          window.setTimeout(
            () => emailInput.focus(),
            0
          );
        }

      }

    }
  );

  document.addEventListener(
    'click',
    (event) => {

      if (
        !dropdown.classList.contains(
          'is-open'
        )
      ) {
        return;
      }

      if (
        dropdown.contains(
          event.target
        )
      ) {
        return;
      }

      closeMemberAuthPanel();

    }
  );

  document.addEventListener(
    'keydown',
    (event) => {

      if (
        event.key === 'Escape'
      ) {
        closeMemberAuthPanel();
      }

    }
  );

}

function setupMemberNav() {

  const form =
    document.getElementById(
      'member-auth-guest-form'
    );

  if (form) {

    form.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        const emailInput =
          document.getElementById(
            'member-email'
          );

        const submitBtn =
          form.querySelector(
            'button[type="submit"]'
          );

        if (!emailInput || !submitBtn) {
          return;
        }

        submitBtn.disabled = true;

        await sendMemberMagicLink(
          emailInput.value
        );

        submitBtn.disabled = false;

      }
    );

  }

}

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    setupMemberNav();
    setupMemberAuthDropdown();

    await initMemberAuth();

    handleAdminLoginIntent();

  }
);
