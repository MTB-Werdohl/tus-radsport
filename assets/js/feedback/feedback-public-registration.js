const PUBLIC_FEEDBACK_RETURN_KEY =
  'publicFeedbackReturnUrl';

function getPublicFeedbackReturnUrl() {

  return (
    sessionStorage.getItem(
      PUBLIC_FEEDBACK_RETURN_KEY
    )
    || getPublicFeedbackRedirectUrl()
  );

}

function setPublicFeedbackReturnUrl(url) {

  const value =
    String(url || '').trim();

  if (!value) {
    return;
  }

  sessionStorage.setItem(
    PUBLIC_FEEDBACK_RETURN_KEY,
    value
  );

}

function getPublicFeedbackRedirectUrl() {

  const href =
    window.location.href.split('#')[0];

  return href;

}

function validatePublicFeedbackRegistration(
  registration
) {

  if (
    !registration?.email
    || !registration.email.includes('@')
  ) {
    return 'Bitte eine gültige E-Mail angeben.';
  }

  if (
    registration.email
    !== registration.emailConfirm
  ) {
    return 'Die E-Mail-Adressen stimmen nicht überein.';
  }

  if (
    !registration.vorname?.trim()
    && !registration.nachname?.trim()
  ) {
    return 'Bitte mindestens Vor- oder Nachname angeben.';
  }

  return null;

}

function ensurePublicFeedbackModal() {

  if (
    document.getElementById(
      'feedback-public-modal'
    )
  ) {
    return;
  }

  const modal =
    document.createElement('div');

  modal.id = 'feedback-public-modal';
  modal.className = 'feedback-public-modal';
  modal.hidden = true;

  modal.innerHTML = `

<div
  class="feedback-public-modal__backdrop"
  data-close-modal="true">

</div>

<div
  class="feedback-public-modal__dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="feedback-public-modal-title">

  <button
    type="button"
    class="feedback-public-modal__close"
    data-close-modal="true"
    aria-label="Schließen">

    ×

  </button>

  <h2
    id="feedback-public-modal-title"
    class="feedback-public-modal__title">

    Externe Teilnahme

  </h2>

  <p class="feedback-public-modal__intro">

    Deine Angaben werden erst gespeichert, wenn du den Link in der E-Mail
    bestätigst. Erst danach kannst du abstimmen.

  </p>

  <div
    id="feedback-public-modal-status"
    class="feedback-public-modal__status"
    hidden>

  </div>

  <form
    id="feedback-public-register-form"
    class="feedback-public-modal__form"
    novalidate>

    <div class="feedback-public-modal__row">

      <label>
        Vorname
        <input
          type="text"
          name="vorname"
          autocomplete="given-name"
          required>
      </label>

      <label>
        Nachname
        <input
          type="text"
          name="nachname"
          autocomplete="family-name"
          required>
      </label>

    </div>

    <label>
      E-Mail
      <input
        type="email"
        name="email"
        autocomplete="email"
        required>
    </label>

    <label>
      E-Mail bestätigen
      <input
        type="email"
        name="email_confirm"
        autocomplete="off"
        required>
    </label>

    <label>
      Telefon (optional)
      <input
        type="tel"
        name="telefon"
        autocomplete="tel">
    </label>

    <button
      type="submit"
      class="feedback-public-modal__submit">

      Registrieren &amp; Bestätigungs-Link senden

    </button>

  </form>

  <div class="feedback-public-modal__login">

    <p>
      Bereits registriert?
    </p>

    <form
      id="feedback-public-login-form"
      class="feedback-public-modal__login-form"
      novalidate>

      <label>
        E-Mail
        <input
          type="email"
          name="email"
          autocomplete="email"
          required>
      </label>

      <button
        type="submit"
        class="feedback-public-modal__login-submit secondary-button">

        Anmelde-Link senden

      </button>

    </form>

  </div>

</div>

`;

  document.body.appendChild(modal);

  bindPublicFeedbackModalEvents(modal);

}

function setPublicFeedbackModalStatus(
  message,
  isError
) {

  const statusEl =
    document.getElementById(
      'feedback-public-modal-status'
    );

  if (!statusEl) {
    return;
  }

  if (!message) {

    statusEl.hidden = true;
    statusEl.textContent = '';

    return;

  }

  statusEl.hidden = false;
  statusEl.className =
    `feedback-public-modal__status${
      isError
        ? ' feedback-public-modal__status--error'
        : ' feedback-public-modal__status--success'
    }`;

  statusEl.textContent = message;

}

function openPublicFeedbackModal() {

  ensurePublicFeedbackModal();

  setPublicFeedbackReturnUrl(
    getPublicFeedbackRedirectUrl()
  );

  setPublicFeedbackModalStatus('', false);

  const modal =
    document.getElementById(
      'feedback-public-modal'
    );

  if (!modal) {
    return;
  }

  modal.hidden = false;
  document.body.classList.add(
    'feedback-public-modal-open'
  );

  modal
    .querySelector('#feedback-public-register-form input[name="email"]')
    ?.focus();

}

function closePublicFeedbackModal() {

  const modal =
    document.getElementById(
      'feedback-public-modal'
    );

  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove(
    'feedback-public-modal-open'
  );

}

function readPublicFeedbackModalRegistration(
  form
) {

  if (!form) {
    return null;
  }

  const formData =
    new FormData(form);

  return {
    email:
      String(formData.get('email') || '')
        .trim()
        .toLowerCase(),
    emailConfirm:
      String(formData.get('email_confirm') || '')
        .trim()
        .toLowerCase(),
    vorname:
      String(formData.get('vorname') || '')
        .trim(),
    nachname:
      String(formData.get('nachname') || '')
        .trim(),
    telefon:
      String(formData.get('telefon') || '')
        .trim()
  };

}

async function sendPublicParticipantRegistrationMagicLink(
  registration,
  redirectTo
) {

  const normalized =
    registration.email
      .trim()
      .toLowerCase();

  const checkResult =
    await canRegisterPublicParticipant(
      normalized
    );

  if (checkResult?.error) {
    return { error: checkResult.error };
  }

  if (
    checkResult.status
    === 'club_member'
  ) {

    return {
      error: new Error(
        'Bitte als Vereinsmitglied anmelden.'
      )
    };

  }

  if (
    checkResult.status
    === 'already_public'
  ) {

    return {
      error: new Error(
        'Diese E-Mail ist bereits registriert. Bitte unten „Anmelde-Link senden“ nutzen.'
      )
    };

  }

  const returnUrl =
    redirectTo
    || getPublicFeedbackReturnUrl()
    || getPublicFeedbackRedirectUrl();

  const { error } =
    await window.supabaseClient.auth.signInWithOtp({

      email: normalized,

      options: {
        shouldCreateUser: true,
        emailRedirectTo: returnUrl,
        data: {
          public_registration: true,
          vorname: registration.vorname,
          nachname: registration.nachname,
          telefon:
            registration.telefon
            || null
        }
      }

    });

  if (error) {
    return { error };
  }

  return { ok: true };

}

async function sendPublicParticipantMagicLink(
  email,
  redirectTo
) {

  const normalized =
    email.trim().toLowerCase();

  if (
    !normalized
    || !normalized.includes('@')
  ) {
    return {
      error: new Error(
        'Bitte eine gültige E-Mail angeben.'
      )
    };
  }

  const { data: isPublic, error: checkError } =
    await window.supabaseClient.rpc(
      'check_public_participant_email',
      { check_email: normalized }
    );

  if (checkError) {

    console.error(checkError);

    return { error: checkError };

  }

  if (isPublic !== true) {

    return {
      error: new Error(
        'Diese E-Mail ist noch nicht registriert. Bitte zuerst das Registrierungsformular ausfüllen.'
      )
    };

  }

  const returnUrl =
    redirectTo
    || getPublicFeedbackReturnUrl()
    || getPublicFeedbackRedirectUrl();

  const { error } =
    await window.supabaseClient.auth.signInWithOtp({

      email: normalized,

      options: {
        shouldCreateUser: true,
        emailRedirectTo: returnUrl
      }

    });

  if (error) {
    return { error };
  }

  return { ok: true };

}

function bindPublicFeedbackModalEvents(modal) {

  modal.querySelectorAll('[data-close-modal="true"]').forEach((element) => {

    element.addEventListener('click', () => {

      closePublicFeedbackModal();

    });

  });

  document.addEventListener('keydown', (event) => {

    if (
      event.key === 'Escape'
      && !modal.hidden
    ) {
      closePublicFeedbackModal();
    }

  });

  modal
    .querySelector('#feedback-public-register-form')
    ?.addEventListener('submit', async (event) => {

      event.preventDefault();

      const form =
        event.currentTarget;

      const submitBtn =
        form.querySelector(
          '[type="submit"]'
        );

      const registration =
        readPublicFeedbackModalRegistration(
          form
        );

      const validationError =
        validatePublicFeedbackRegistration(
          registration
        );

      if (validationError) {

        setPublicFeedbackModalStatus(
          validationError,
          true
        );

        return;

      }

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      setPublicFeedbackModalStatus('', false);

      const registerResult =
        await sendPublicParticipantRegistrationMagicLink(
          registration,
          getPublicFeedbackReturnUrl()
        );

      if (registerResult?.error) {

        setPublicFeedbackModalStatus(
          registerResult.error.message
            || 'E-Mail konnte nicht gesendet werden.',
          true
        );

        if (submitBtn) {
          submitBtn.disabled = false;
        }

        return;

      }

      setPublicFeedbackModalStatus(
        'Bestätigungs-Link gesendet. Bitte E-Mail öffnen und Link klicken — erst dann wirst du registriert und kannst abstimmen.',
        false
      );

      if (submitBtn) {
        submitBtn.disabled = false;
      }

    });

  modal
    .querySelector('#feedback-public-login-form')
    ?.addEventListener('submit', async (event) => {

      event.preventDefault();

      const form =
        event.currentTarget;

      const submitBtn =
        form.querySelector(
          '[type="submit"]'
        );

      const email =
        String(
          new FormData(form).get('email') || ''
        )
          .trim()
          .toLowerCase();

      if (
        !email
        || !email.includes('@')
      ) {

        setPublicFeedbackModalStatus(
          'Bitte eine gültige E-Mail angeben.',
          true
        );

        return;

      }

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      setPublicFeedbackModalStatus('', false);

      const loginResult =
        await sendPublicParticipantMagicLink(
          email,
          getPublicFeedbackReturnUrl()
        );

      if (loginResult?.error) {

        setPublicFeedbackModalStatus(
          loginResult.error.message
            || 'E-Mail konnte nicht gesendet werden.',
          true
        );

        if (submitBtn) {
          submitBtn.disabled = false;
        }

        return;

      }

      setPublicFeedbackModalStatus(
        'Anmelde-Link gesendet. Bitte E-Mail öffnen und danach hier abstimmen.',
        false
      );

      if (submitBtn) {
        submitBtn.disabled = false;
      }

    });

}
