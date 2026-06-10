const PUBLIC_FEEDBACK_RETURN_KEY =
  'publicFeedbackReturnUrl';

const PUBLIC_REGISTRATION_PENDING_KEY =
  'publicRegistrationPending';

function escapePublicRegistrationHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function getPublicFeedbackReturnUrl() {

  const canonical =
    getPublicFeedbackRedirectUrl();

  const stored =
    sessionStorage.getItem(
      PUBLIC_FEEDBACK_RETURN_KEY
    );

  if (!stored) {
    return canonical;
  }

  if (
    canonical.includes('event.html')
    || canonical.includes('news-detail.html')
  ) {
    return canonical;
  }

  return stored;

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

  const origin =
    window.location.origin;

  const path =
    window.location.pathname;

  const params =
    new URLSearchParams(
      window.location.search
    );

  let slug =
    params.get('slug');

  if (
    !slug
    && path.includes('/kalender/')
  ) {

    const parts =
      path.split('/').filter(Boolean);

    if (
      parts[0] === 'kalender'
      && parts.length >= 2
    ) {
      slug = parts[parts.length - 1];
    }

  }

  if (
    slug
    && (
      path.includes('event.html')
      || path.includes('/kalender/')
    )
  ) {

    return (
      `${origin}/event.html?slug=${encodeURIComponent(slug)}`
    );

  }

  if (
    !slug
    && path.includes('/news/')
  ) {

    const parts =
      path.split('/').filter(Boolean);

    if (
      parts[0] === 'news'
      && parts.length >= 2
    ) {
      slug = parts[parts.length - 1];
    }

  }

  if (
    slug
    && (
      path.includes('news-detail.html')
      || path.includes('/news/')
    )
  ) {

    return (
      `${origin}/news-detail.html?slug=${encodeURIComponent(slug)}`
    );

  }

  return (
    window.location.href.split('#')[0]
  );

}

const PUBLIC_REGISTRATION_CONSENT_TEXTS = {

  kontakt:
    'Ich willige ein, dass meine oben angegebenen Kontaktdaten durch die Abteilung zur '
    + 'Organisation des Ausfahrts- und Wettkampfbetriebs, zur Weitergabe von Terminen und '
    + 'Informationen sowie zur internen Abstimmung innerhalb der Abteilung genutzt werden '
    + 'dürfen. Eine Weitergabe an Dritte außerhalb des Vereins erfolgt nicht.',

  bilder:
    'Ich willige ein, dass Fotos und Videos meiner Person, die im Rahmen von Ausfahrten, '
    + 'Wettkämpfen oder Vereinsveranstaltungen entstehen, für Zwecke der '
    + 'Öffentlichkeitsarbeit der Abteilung veröffentlicht werden dürfen (insbesondere auf der '
    + 'Vereinswebsite, in sozialen Medien sowie in Presseveröffentlichungen). '
    + 'Ich wurde darauf hingewiesen, dass Inhalte im Internet weltweit abrufbar sind und eine '
    + 'Weiterverwendung durch Dritte nicht ausgeschlossen werden kann.'

};

const PUBLIC_REGISTRATION_CONSENT_REVOKE =
  'Widerruf jederzeit in Textform (z. B. per E-Mail) an den Verein — siehe Datenschutzerklärung.';

function savePublicRegistrationPending(
  registration
) {

  if (!registration?.email) {
    return;
  }

  const payload = {
    email: registration.email,
    vorname: registration.vorname || '',
    nachname: registration.nachname || '',
    telefon: registration.telefon || '',
    einwilligung_kontakt:
      registration.einwilligung_kontakt === true,
    einwilligung_bilder:
      registration.einwilligung_bilder === true,
    savedAt: Date.now()
  };

  sessionStorage.setItem(
    PUBLIC_REGISTRATION_PENDING_KEY,
    JSON.stringify(payload)
  );

  try {
    localStorage.setItem(
      PUBLIC_REGISTRATION_PENDING_KEY,
      JSON.stringify(payload)
    );
  } catch (error) {
    /* ignore */
  }

}

function clearPublicRegistrationPending() {

  sessionStorage.removeItem(
    PUBLIC_REGISTRATION_PENDING_KEY
  );

  try {
    localStorage.removeItem(
      PUBLIC_REGISTRATION_PENDING_KEY
    );
  } catch (error) {
    /* ignore */
  }

}

function readPublicRegistrationPendingStorage(
  storage,
  email
) {

  const raw =
    storage.getItem(
      PUBLIC_REGISTRATION_PENDING_KEY
    );

  if (!raw) {
    return null;
  }

  try {

    const data =
      JSON.parse(raw);

    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    if (
      !data?.email
      || data.email !== normalizedEmail
    ) {
      return null;
    }

    const maxAgeMs =
      7 * 24 * 60 * 60 * 1000;

    if (
      data.savedAt
      && Date.now() - data.savedAt > maxAgeMs
    ) {
      return null;
    }

    return data;

  } catch (error) {

    return null;

  }

}

function readPublicRegistrationPending(
  email
) {

  return (
    readPublicRegistrationPendingStorage(
      sessionStorage,
      email
    )
    || readPublicRegistrationPendingStorage(
      localStorage,
      email
    )
  );

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

  if (registration.einwilligung_kontakt !== true) {
    return 'Bitte der Einwilligung Kontakt zustimmen.';
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

    Bestätigungs-Link per E-Mail — erst danach kannst du abstimmen.

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

    <fieldset class="feedback-public-modal__consents">

      <legend>
        Einwilligungen
      </legend>

      <p class="feedback-public-modal__consent-hint">
        Kontakt-Einwilligung ist Pflicht. Bilder optional.
        ${escapePublicRegistrationHtml(PUBLIC_REGISTRATION_CONSENT_REVOKE)}
        <a href="/datenschutz/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung
        </a>
      </p>

      <label class="feedback-public-modal__consent">
        <input
          type="checkbox"
          name="einwilligung_kontakt"
          value="1"
          required>
        <span class="feedback-public-modal__consent-copy">
          <strong>
            Einwilligung Kontakt (erforderlich)
          </strong>
          <span class="feedback-public-modal__consent-text">
            ${escapePublicRegistrationHtml(PUBLIC_REGISTRATION_CONSENT_TEXTS.kontakt)}
          </span>
        </span>
      </label>

      <label class="feedback-public-modal__consent feedback-public-modal__consent--optional">
        <input
          type="checkbox"
          name="einwilligung_bilder"
          value="1">
        <span class="feedback-public-modal__consent-copy">
          <strong>
            Einwilligung Bilder (optional)
          </strong>
          <span class="feedback-public-modal__consent-text">
            ${escapePublicRegistrationHtml(PUBLIC_REGISTRATION_CONSENT_TEXTS.bilder)}
          </span>
        </span>
      </label>

    </fieldset>

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

  <div
    id="feedback-public-email-sent"
    class="feedback-public-modal__email-sent"
    hidden>

    <p class="feedback-public-modal__email-sent-text">

      Vielen Dank für dein Interesse, wir haben dir eben eine E-Mail gesendet.

      <button
        type="button"
        id="feedback-public-close-tab"
        class="feedback-public-modal__close-tab">

        Klick hier

      </button>

      und der Tab wird geschlossen. Mit dem Klick in der E-Mail gelangst du
      hier wieder zurück.

    </p>

  </div>

</div>

`;

  document.body.appendChild(modal);

  bindPublicFeedbackModalEvents(modal);

  modal
    .querySelector('#feedback-public-close-tab')
    ?.addEventListener('click', () => {

      closePublicFeedbackTab();

    });

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

function ensurePublicFeedbackEmailSentPanel() {

  if (
    document.getElementById(
      'feedback-public-email-sent'
    )
  ) {
    return;
  }

  const dialog =
    document.querySelector(
      '.feedback-public-modal__dialog'
    );

  if (!dialog) {
    return;
  }

  dialog.insertAdjacentHTML(
    'beforeend',
    `

    <div
      id="feedback-public-email-sent"
      class="feedback-public-modal__email-sent"
      hidden>

      <p class="feedback-public-modal__email-sent-text">

        Vielen Dank für dein Interesse, wir haben dir eben eine E-Mail gesendet.

        <button
          type="button"
          id="feedback-public-close-tab"
          class="feedback-public-modal__close-tab">

          Klick hier

        </button>

        und der Tab wird geschlossen. Mit dem Klick in der E-Mail gelangst du
        hier wieder zurück.

      </p>

    </div>

    `
  );

  document
    .getElementById('feedback-public-close-tab')
    ?.addEventListener('click', () => {

      closePublicFeedbackTab();

    });

}

function resetPublicFeedbackModalView() {

  ensurePublicFeedbackEmailSentPanel();

  const title =
    document.getElementById(
      'feedback-public-modal-title'
    );

  if (title) {
    title.textContent = 'Externe Teilnahme';
  }

  document
    .querySelector('.feedback-public-modal__intro')
    ?.removeAttribute('hidden');

  document
    .getElementById('feedback-public-register-form')
    ?.removeAttribute('hidden');

  document
    .querySelector('.feedback-public-modal__login')
    ?.removeAttribute('hidden');

  document
    .getElementById('feedback-public-email-sent')
    ?.setAttribute('hidden', '');

  setPublicFeedbackModalStatus('', false);

}

function showPublicFeedbackEmailSentView() {

  ensurePublicFeedbackEmailSentPanel();

  const title =
    document.getElementById(
      'feedback-public-modal-title'
    );

  if (title) {
    title.textContent = 'E-Mail gesendet';
  }

  document
    .querySelector('.feedback-public-modal__intro')
    ?.setAttribute('hidden', '');

  document
    .getElementById('feedback-public-register-form')
    ?.setAttribute('hidden', '');

  document
    .querySelector('.feedback-public-modal__login')
    ?.setAttribute('hidden', '');

  setPublicFeedbackModalStatus('', false);

  document
    .getElementById('feedback-public-email-sent')
    ?.removeAttribute('hidden');

}

function closePublicFeedbackTab() {

  closePublicFeedbackModal();

  window.close();

}

function openPublicFeedbackModal() {

  ensurePublicFeedbackModal();

  resetPublicFeedbackModalView();

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
        .trim(),
    einwilligung_kontakt:
      formData.get('einwilligung_kontakt') === '1',
    einwilligung_bilder:
      formData.get('einwilligung_bilder') === '1'
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
            || null,
          einwilligung_kontakt:
            registration.einwilligung_kontakt === true,
          einwilligung_bilder:
            registration.einwilligung_bilder === true
        }
      }

    });

  if (error) {
    return { error };
  }

  savePublicRegistrationPending(
    registration
  );

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

      showPublicFeedbackEmailSentView();

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

      showPublicFeedbackEmailSentView();

      if (submitBtn) {
        submitBtn.disabled = false;
      }

    });

}
