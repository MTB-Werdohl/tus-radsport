const PUBLIC_FEEDBACK_EMAIL_KEY =
  'publicFeedbackEmail';

function getPublicFeedbackEmail() {

  return localStorage.getItem(
    PUBLIC_FEEDBACK_EMAIL_KEY
  ) || '';

}

function setPublicFeedbackEmail(email) {

  const normalized =
    String(email || '')
      .trim()
      .toLowerCase();

  if (!normalized) {
    return;
  }

  localStorage.setItem(
    PUBLIC_FEEDBACK_EMAIL_KEY,
    normalized
  );

}

function readPublicFeedbackRegistration(
  container
) {

  if (!container) {
    return null;
  }

  const email =
    container
      .querySelector('.feedback-public-email')
      ?.value
      ?.trim()
      .toLowerCase()
    || '';

  const vorname =
    container
      .querySelector('.feedback-public-vorname')
      ?.value
      ?.trim()
    || '';

  const nachname =
    container
      .querySelector('.feedback-public-nachname')
      ?.value
      ?.trim()
    || '';

  const telefon =
    container
      .querySelector('.feedback-public-telefon')
      ?.value
      ?.trim()
    || '';

  return {
    email,
    vorname,
    nachname,
    telefon
  };

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
    !registration.vorname?.trim()
    && !registration.nachname?.trim()
  ) {
    return 'Bitte mindestens Vor- oder Nachname angeben.';
  }

  return null;

}
