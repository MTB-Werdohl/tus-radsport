function slugifyFeedbackOptionId(label) {

  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);

}

function normalizeFeedbackPollConfig(config) {

  const rawOptions =
    config?.options;

  if (!Array.isArray(rawOptions)) {
    return { options: [] };
  }

  const options =
    rawOptions
      .map((option) => {

        if (typeof option === 'string') {
          const id =
            slugifyFeedbackOptionId(option);

          return id
            ? { id, label: option }
            : null;

        }

        const id =
          String(option?.id || '')
            .trim();

        const label =
          String(option?.label || '')
            .trim();

        if (!id || !label) {
          return null;
        }

        return { id, label };

      })
      .filter(Boolean);

  return { options };

}

function getFeedbackPollOptionLabel(module, optionId) {

  const config =
    normalizeFeedbackPollConfig(
      module?.config
    );

  const match =
    config.options.find(
      (option) =>
        option.id === optionId
    );

  return match?.label || null;

}

function validateFeedbackAnswer(
  module,
  answer,
  comment
) {

  const type =
    module?.type;

  const value =
    String(answer || '')
      .trim();

  if (!value) {
    return 'Bitte eine Antwort wählen.';
  }

  if (
    type
    === window.siteConfig.feedback.types.yesMaybe
  ) {

    const allowed = [
      window.siteConfig.feedback.answers.yes,
      window.siteConfig.feedback.answers.maybe
    ];

    if (!allowed.includes(value)) {
      return 'Ungültige Antwort.';
    }

    return null;

  }

  if (
    type
    === window.siteConfig.feedback.types.yesNoComment
  ) {

    const allowed = [
      window.siteConfig.feedback.answers.yes,
      window.siteConfig.feedback.answers.no
    ];

    if (!allowed.includes(value)) {
      return 'Ungültige Antwort.';
    }

    return null;

  }

  if (
    type
    === window.siteConfig.feedback.types.poll
  ) {

    const config =
      normalizeFeedbackPollConfig(
        module.config
      );

    const valid =
      config.options.some(
        (option) =>
          option.id === value
      );

    if (!valid) {
      return 'Ungültige Auswahl.';
    }

    return null;

  }

  return 'Unbekannter Feedback-Typ.';

}

function formatFeedbackAnswerLabel(
  module,
  answerCode
) {

  const value =
    String(answerCode || '')
      .trim();

  if (!value) {
    return '—';
  }

  if (
    module?.type
    === window.siteConfig.feedback.types.poll
  ) {

    return getFeedbackPollOptionLabel(
      module,
      value
    )
      || '(Option entfernt)';

  }

  const labels = {
    [window.siteConfig.feedback.answers.yes]:
      'Ja',
    [window.siteConfig.feedback.answers.maybe]:
      'Vielleicht',
    [window.siteConfig.feedback.answers.no]:
      'Nein'
  };

  return labels[value] || value;

}

function getFeedbackTypeLabel(type) {

  const labels = {
    [window.siteConfig.feedback.types.yesMaybe]:
      'Ja / Vielleicht',
    [window.siteConfig.feedback.types.yesNoComment]:
      'Ja / Nein + Kommentar',
    [window.siteConfig.feedback.types.poll]:
      'Umfrage'
  };

  return labels[type] || type;

}

function buildFeedbackSummary(
  module,
  answers
) {

  const rows =
    answers || [];

  const summary = {
    total: rows.length,
    counts: {}
  };

  if (
    module?.type
    === window.siteConfig.feedback.types.poll
  ) {

    const config =
      normalizeFeedbackPollConfig(
        module.config
      );

    config.options.forEach((option) => {
      summary.counts[option.id] = 0;
    });

    rows.forEach((row) => {

      const key =
        row.answer;

      summary.counts[key] =
        (summary.counts[key] || 0) + 1;

    });

    return summary;

  }

  rows.forEach((row) => {

    const key =
      row.answer;

    summary.counts[key] =
      (summary.counts[key] || 0) + 1;

  });

  return summary;

}

function validateFeedbackPollConfig(config) {

  const normalized =
    normalizeFeedbackPollConfig(config);

  if (normalized.options.length < 2) {
    return 'Mindestens zwei Poll-Optionen angeben.';
  }

  const ids =
    new Set();

  for (const option of normalized.options) {

    if (
      !/^[a-z0-9_-]+$/.test(option.id)
    ) {
      return `Option-ID „${option.id}“ ungültig (nur a-z, 0-9, _, -).`;
    }

    if (ids.has(option.id)) {
      return `Option-ID „${option.id}“ doppelt.`;
    }

    ids.add(option.id);

  }

  return null;

}
