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

    if (greetingEl) {
      greetingEl.textContent = '';
    }

    return;

  }

  if (greetingEl) {

    const name =
      member.vorname || 'Mitglied';

    greetingEl.textContent =
      `Hallo ${name}`;

  }

}

function setupMemberNav() {

  const form =
    document.getElementById(
      'member-login-form'
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

    await initMemberAuth();

  }
);
