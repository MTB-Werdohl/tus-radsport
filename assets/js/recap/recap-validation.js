const RECAP_MIN_BODY_LENGTH = 100;

const RECAP_MIN_IMAGE_COUNT = 1;

function trimRecapBody(body) {

  return String(body || '').trim();

}

function getRecapBodyLength(body) {

  return trimRecapBody(body).length;

}

function validateRecapForPublish(
  recap,
  imageCount
) {

  const errors = [];

  const bodyLength =
    getRecapBodyLength(recap?.body);

  if (
    bodyLength
    < RECAP_MIN_BODY_LENGTH
  ) {

    errors.push(
      `Der Bericht braucht mindestens `
      + `${RECAP_MIN_BODY_LENGTH} Zeichen `
      + `(aktuell: ${bodyLength}).`
    );

  }

  const count =
    Number(imageCount) || 0;

  if (
    count
    < RECAP_MIN_IMAGE_COUNT
  ) {

    errors.push(
      `Mindestens ${RECAP_MIN_IMAGE_COUNT} `
      + `Bild erforderlich.`
    );

  }

  return {
    valid: errors.length === 0,
    errors
  };

}

function formatRecapValidationErrors(
  result
) {

  if (!result?.errors?.length) {
    return '';
  }

  return result.errors.join('\n');

}

function terminAllowsRecapClient(termin) {

  if (!termin) {
    return false;
  }

  if (termin.recurring) {
    return false;
  }

  const draft =
    window.siteConfig?.visibility?.draft
    || 'draft';

  if (termin.sichtbarkeit === draft) {
    return false;
  }

  if (
    typeof isTerminStillUpcoming
      === 'function'
    && isTerminStillUpcoming(termin)
  ) {
    return false;
  }

  return true;

}

function buildRecapTeaser(
  body,
  maxLength
) {

  const limit =
    maxLength ?? 160;

  const text =
    String(body || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/[#*_>~-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  if (!text) {
    return '';
  }

  if (text.length <= limit) {
    return text;
  }

  return (
    `${text.slice(0, limit - 1).trim()}…`
  );

}

window.RECAP_MIN_BODY_LENGTH =
  RECAP_MIN_BODY_LENGTH;

window.RECAP_MIN_IMAGE_COUNT =
  RECAP_MIN_IMAGE_COUNT;

window.trimRecapBody =
  trimRecapBody;

window.getRecapBodyLength =
  getRecapBodyLength;

window.validateRecapForPublish =
  validateRecapForPublish;

window.formatRecapValidationErrors =
  formatRecapValidationErrors;

window.terminAllowsRecapClient =
  terminAllowsRecapClient;

window.buildRecapTeaser =
  buildRecapTeaser;
