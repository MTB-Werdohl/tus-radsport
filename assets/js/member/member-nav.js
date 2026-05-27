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

  guestEl.classList.toggle(
    'is-active',
    !member
  );

  memberEl.classList.toggle(
    'is-active',
    !!member
  );

  if (!member) {

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

  const logoutBtn =
    document.getElementById(
      'member-logout'
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

  if (logoutBtn) {

    logoutBtn.addEventListener(
      'click',
      async () => {

        await logoutMember();

        updateMemberNav(null);

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
