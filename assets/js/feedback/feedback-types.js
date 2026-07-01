const FEEDBACK_POLL_FREETEXT_OPTION_ID =
  '__freetext__';

const FEEDBACK_CANCELLATION_REASONS = [
  { code: 'krankheit', label: 'Krankheit' },
  { code: 'familie', label: 'Familie' },
  { code: 'arbeit', label: 'Arbeit' },
  { code: 'wetter', label: 'Wetter' },
  { code: 'terminueberschneidung', label: 'Terminüberschneidung' },
  { code: 'sonstiges', label: 'Sonstiges' }
];

const FEEDBACK_EVENT_SUBSCRIPTION_LABEL =
  'Informiert bleiben';

const FEEDBACK_POLL_FREETEXT_ONLY =
  '[]';

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

  let options = [];

  if (Array.isArray(rawOptions)) {

    options =
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

          if (
            id
            === FEEDBACK_POLL_FREETEXT_OPTION_ID
          ) {
            return null;
          }

          return { id, label };

        })
        .filter(Boolean);

  }

  const freeTextLabel =
    String(config?.freeTextLabel || '')
      .trim()
      || 'Freitext';

  return {
    options,
    multiple: config?.multiple === true,
    allowFreeText: config?.allowFreeText === true,
    freeTextLabel
  };

}

function getFeedbackPollFreeTextOptionLabel(
  config
) {

  return normalizeFeedbackPollConfig(
    config
  ).freeTextLabel;

}

function getFeedbackPollAllOptions(config) {

  const normalized =
    normalizeFeedbackPollConfig(config);

  const options =
    [...normalized.options];

  if (normalized.allowFreeText) {

    options.push({
      id: FEEDBACK_POLL_FREETEXT_OPTION_ID,
      label: normalized.freeTextLabel,
      isFreeText: true
    });

  }

  return options;

}

function getFeedbackPollSelectionTotal(
  counts
) {

  if (
    !counts
    || typeof counts !== 'object'
  ) {
    return 0;
  }

  return Object.values(counts).reduce(
    (sum, value) =>
      sum
      + Math.max(
        0,
        Number(value) || 0
      ),
    0
  );

}

function getFeedbackPollOptionPercent(
  count,
  counts
) {

  const total =
    getFeedbackPollSelectionTotal(
      counts
    );

  const safeCount =
    Math.max(
      0,
      Number(count) || 0
    );

  if (
    total <= 0
    || safeCount <= 0
  ) {
    return 0;
  }

  return Math.round(
    (safeCount / total) * 100
  );

}

function feedbackPollAnswerIncludesFreeText(
  answer,
  config
) {

  if (
    !normalizeFeedbackPollConfig(config)
      .allowFreeText
  ) {
    return false;
  }

  const value =
    String(answer || '')
      .trim();

  if (
    value === FEEDBACK_POLL_FREETEXT_ONLY
  ) {
    return true;
  }

  return parseFeedbackPollAnswer(value)
    .includes(
      FEEDBACK_POLL_FREETEXT_OPTION_ID
    );

}

function parseFeedbackPollAnswer(answer) {

  const value =
    String(answer || '')
      .trim();

  if (!value) {
    return [];
  }

  if (value === FEEDBACK_POLL_FREETEXT_ONLY) {
    return [
      FEEDBACK_POLL_FREETEXT_OPTION_ID
    ];
  }

  if (value.startsWith('[')) {

    try {

      const parsed =
        JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            String(item || '').trim()
          )
          .filter(Boolean);
      }

    } catch (error) {

      /* ignore invalid JSON */

    }

  }

  return [value];

}

function serializeFeedbackPollAnswer(
  selectedIds,
  multiple
) {

  const ids =
    (selectedIds || [])
      .map((item) =>
        String(item || '').trim()
      )
      .filter(Boolean);

  if (!ids.length) {
    return '';
  }

  if (multiple) {
    return JSON.stringify(ids);
  }

  return ids[0];

}

function getFeedbackPollOptionLabel(
  module,
  optionId
) {

  if (
    optionId
    === FEEDBACK_POLL_FREETEXT_OPTION_ID
  ) {

    return getFeedbackPollFreeTextOptionLabel(
      module?.config
    );

  }

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

function formatFeedbackPollAnswerDisplay(
  module,
  answerRow
) {

  const config =
    normalizeFeedbackPollConfig(
      module?.config
    );

  const comment =
    String(answerRow?.comment || '')
      .trim();

  const value =
    String(answerRow?.answer || '')
      .trim();

  if (
    value === FEEDBACK_POLL_FREETEXT_ONLY
    && comment
  ) {

    return (
      `${config.freeTextLabel}: ${comment}`
    );

  }

  const ids =
    parseFeedbackPollAnswer(value);

  if (!ids.length) {
    return comment
      ? `${config.freeTextLabel}: ${comment}`
      : '—';
  }

  const parts =
    ids.map((id) => {

      if (
        id
        === FEEDBACK_POLL_FREETEXT_OPTION_ID
      ) {

        return comment
          ? `${config.freeTextLabel}: ${comment}`
          : config.freeTextLabel;

      }

      return (
        getFeedbackPollOptionLabel(
          module,
          id
        )
        || '(Option entfernt)'
      );

    });

  return parts.join(', ');

}

function getFeedbackEntityFeedbackType(
  entityType
) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.news
  ) {
    return window.siteConfig.feedback.types.poll;
  }

  return window.siteConfig.feedback.types.yesMaybe;

}

function getDefaultFeedbackQuestion(
  entityType
) {

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
  ) {
    return 'Bist du dabei?';
  }

  return '';

}

function resolveFeedbackModuleType(module) {

  if (
    module?.type
    === 'yes_no_comment'
  ) {
    return window.siteConfig.feedback.types.yesMaybe;
  }

  return module?.type;

}

function validateFeedbackAnswer(
  module,
  answer,
  comment
) {

  const type =
    resolveFeedbackModuleType(module);

  const value =
    String(answer || '')
      .trim();

  if (
    type
    === window.siteConfig.feedback.types.yesMaybe
    || type === 'yes_no_comment'
  ) {

    if (!value) {
      return 'Bitte eine Antwort wählen.';
    }

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
    === window.siteConfig.feedback.types.poll
  ) {

    const config =
      normalizeFeedbackPollConfig(
        module.config
      );

    const selected =
      parseFeedbackPollAnswer(value);

    const freeText =
      String(comment || '')
        .trim();

    const allowedIds =
      getFeedbackPollAllOptions(
        module.config
      ).map((option) => option.id);

    if (!selected.length) {
      return 'Bitte mindestens eine Antwort wählen.';
    }

    const validSelections =
      selected.filter((id) =>
        allowedIds.includes(id)
      );

    if (
      validSelections.length
      !== selected.length
    ) {
      return 'Ungültige Auswahl.';
    }

    if (
      !config.multiple
      && validSelections.length > 1
    ) {
      return 'Bitte nur eine Antwort wählen.';
    }

    const hasFreeTextOption =
      validSelections.includes(
        FEEDBACK_POLL_FREETEXT_OPTION_ID
      );

    if (
      hasFreeTextOption
      && !freeText
    ) {
      return 'Bitte Freitext ausfüllen.';
    }

    if (
      !hasFreeTextOption
      && freeText
    ) {
      return 'Freitext nur mit der Freitext-Option wählbar.';
    }

    return null;

  }

  return 'Unbekannter Feedback-Typ.';

}

function isFeedbackAnswerWithdrawal(
  module,
  answer,
  comment
) {

  const type =
    resolveFeedbackModuleType(module);

  if (
    type
    !== window.siteConfig.feedback.types.poll
  ) {

    return !String(answer || '')
      .trim();

  }

  const selected =
    parseFeedbackPollAnswer(answer);

  if (!selected.length) {
    return true;
  }

  const hasFreeTextOption =
    selected.includes(
      FEEDBACK_POLL_FREETEXT_OPTION_ID
    );

  const regularCount =
    selected.filter(
      (id) =>
        id
        !== FEEDBACK_POLL_FREETEXT_OPTION_ID
    ).length;

  const freeText =
    String(comment || '')
      .trim();

  if (
    hasFreeTextOption
    && !freeText
    && regularCount === 0
  ) {
    return true;
  }

  return false;

}

function isFeedbackEventSubscriptionMode(
  module,
  entityRecurring
) {

  if (entityRecurring !== true) {
    return false;
  }

  if (
    module?.entity_type
    !== window.siteConfig.feedback.entityTypes.event
  ) {
    return false;
  }

  const type =
    resolveFeedbackModuleType(module);

  return (
    type
    === window.siteConfig.feedback.types.yesMaybe
  );

}

function isFeedbackSubscriptionAnswer(
  answer
) {

  const value =
    String(answer || '')
      .trim();

  return (
    value
    === window.siteConfig.feedback.answers.yes
    || value
    === window.siteConfig.feedback.answers.maybe
  );

}

function countFeedbackSubscriptionAnswers(
  summary
) {

  const counts =
    summary?.counts || {};

  return (
    (counts[window.siteConfig.feedback.answers.yes] || 0)
    + (counts[window.siteConfig.feedback.answers.maybe] || 0)
  );

}

function isFeedbackEventCommitmentEnabled(
  module,
  entityRecurring
) {

  if (entityRecurring === true) {
    return false;
  }

  if (
    module?.entity_type
    !== window.siteConfig.feedback.entityTypes.event
  ) {
    return false;
  }

  const type =
    resolveFeedbackModuleType(module);

  return (
    type
    === window.siteConfig.feedback.types.yesMaybe
  );

}

function formatFeedbackCancellationReasonLabel(
  reasonCode
) {

  const code =
    String(reasonCode || '')
      .trim()
      .toLowerCase();

  const match =
    FEEDBACK_CANCELLATION_REASONS.find(
      (item) => item.code === code
    );

  return match?.label || code || '—';

}

function formatFeedbackEventAnswerAdminLabel(
  module,
  answerCode,
  entityRecurring
) {

  const value =
    String(answerCode || '')
      .trim();

  if (
    isFeedbackEventSubscriptionMode(
      module,
      entityRecurring
    )
    && isFeedbackSubscriptionAnswer(value)
  ) {
    return FEEDBACK_EVENT_SUBSCRIPTION_LABEL;
  }

  if (
    module?.entity_type
    === window.siteConfig.feedback.entityTypes.event
    && (
      module?.type
      === window.siteConfig.feedback.types.yesMaybe
      || module?.type === 'yes_no_comment'
    )
  ) {

    if (
      value
      === window.siteConfig.feedback.answers.yes
    ) {
      return 'Verbindliche Teilnehmer';
    }

    if (
      value
      === window.siteConfig.feedback.answers.maybe
    ) {
      return 'Interessenten';
    }

  }

  return formatFeedbackAnswerLabel(
    module,
    answerCode,
    entityRecurring
  );

}

function formatFeedbackParticipationAnswerLabel(
  answerCode
) {

  const value =
    String(answerCode || '')
      .trim()
      .toLowerCase();

  if (!value) {
    return 'Nein';
  }

  if (
    value
    === window.siteConfig.feedback.answers.yes
  ) {
    return 'Ja';
  }

  if (
    value
    === window.siteConfig.feedback.answers.maybe
  ) {
    return 'Vielleicht';
  }

  return value;

}

function formatFeedbackResultsAnswerShort(
  answerCode
) {

  return formatFeedbackParticipationAnswerLabel(
    answerCode
  );

}

function isFeedbackEventResultsHistoryMode(
  module,
  entityRecurring
) {

  if (entityRecurring === true) {
    return false;
  }

  if (
    module?.entity_type
    !== window.siteConfig.feedback.entityTypes.event
  ) {
    return false;
  }

  return (
    module?.type
    === window.siteConfig.feedback.types.yesMaybe
    || module?.type === 'yes_no_comment'
  );

}

function formatFeedbackAnswerLabel(
  module,
  answerCode,
  entityRecurring
) {

  const value =
    String(answerCode || '')
      .trim();

  if (!value) {
    return '—';
  }

  if (
    isFeedbackEventSubscriptionMode(
      module,
      entityRecurring
    )
    && isFeedbackSubscriptionAnswer(value)
  ) {
    return FEEDBACK_EVENT_SUBSCRIPTION_LABEL;
  }

  if (
    module?.type
    === window.siteConfig.feedback.types.poll
  ) {

    if (
      value === FEEDBACK_POLL_FREETEXT_ONLY
    ) {
      return getFeedbackPollFreeTextOptionLabel(
        module.config
      );
    }

    const labels =
      parseFeedbackPollAnswer(value)
        .map((id) =>
          getFeedbackPollOptionLabel(
            module,
            id
          )
          || '(Option entfernt)'
        );

    if (!labels.length) {
      return '—';
    }

    return labels.join(', ');

  }

  if (module?.type === 'yes_no_comment') {

    const legacyLabels = {
      [window.siteConfig.feedback.answers.yes]:
        'Ja',
      [window.siteConfig.feedback.answers.no]:
        'Nein (veraltet)'
    };

    return legacyLabels[value] || value;

  }

  if (
    module?.entity_type
    === window.siteConfig.feedback.entityTypes.event
  ) {

    const eventLabels = {
      [window.siteConfig.feedback.answers.yes]:
        'Ja — verbindliche Teilnahme',
      [window.siteConfig.feedback.answers.maybe]:
        'Vielleicht — Interesse'
    };

    return eventLabels[value] || value;

  }

  const labels = {
    [window.siteConfig.feedback.answers.yes]:
      'Ja',
    [window.siteConfig.feedback.answers.maybe]:
      'Vielleicht'
  };

  return labels[value] || value;

}

function getFeedbackTypeLabel(type) {

  const labels = {
    [window.siteConfig.feedback.types.yesMaybe]:
      'Bist du dabei?',
    [window.siteConfig.feedback.types.poll]:
      'Umfrage',
    yes_no_comment:
      'Veraltet (Ja/Nein)'
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

    getFeedbackPollAllOptions(
      module.config
    ).forEach((option) => {
      summary.counts[option.id] = 0;
    });

    rows.forEach((row) => {

      parseFeedbackPollAnswer(
        row.answer
      ).forEach((key) => {

        summary.counts[key] =
          (summary.counts[key] || 0) + 1;

      });

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
    return 'Mindestens zwei Umfrage-Optionen angeben.';
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

function getFeedbackPollFreeTextResponses(
  module,
  answers
) {

  const config =
    normalizeFeedbackPollConfig(
      module?.config
    );

  if (!config.allowFreeText) {
    return [];
  }

  return (answers || [])
    .map((row) => {

      const text =
        String(row?.comment || '')
          .trim();

      if (!text) {
        return null;
      }

      if (
        !feedbackPollAnswerIncludesFreeText(
          row.answer,
          module.config
        )
      ) {
        return null;
      }

      return text;

    })
    .filter(Boolean);

}
