function escapeFeedbackHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function renderFeedbackMembersOnlyHint() {

  return `
<p class="feedback-hint">
  Zur Abstimmung berechtigt sind nur
  <strong>Vereinsmitglieder</strong>.
  <a href="/profil/">Als Mitglied anmelden</a>
</p>
`;

}

function renderFeedbackPublicHint() {

  return `
<p class="feedback-hint feedback-hint--public">
  Öffentliche Abstimmung — ohne Anmeldung.
</p>
`;

}

function renderFeedbackStatus(message, isError) {

  return `
<p class="feedback-status${
  isError ? ' feedback-status--error' : ''
}">

${escapeFeedbackHtml(message)}

</p>
`;

}

function renderFeedbackYesMaybe(
  module,
  ownAnswer
) {

  const selected =
    ownAnswer?.answer || '';

  const yes =
    window.siteConfig.feedback.answers.yes;

  const maybe =
    window.siteConfig.feedback.answers.maybe;

  return `
<div class="feedback-actions">

<button
  type="button"
  class="feedback-btn${
    selected === yes ? ' is-active' : ''
  }"
  data-feedback-answer="${yes}">

Ja

</button>

<button
  type="button"
  class="feedback-btn${
    selected === maybe ? ' is-active' : ''
  }"
  data-feedback-answer="${maybe}">

Vielleicht

</button>

</div>
`;

}

function renderFeedbackYesNoComment(
  module,
  ownAnswer
) {

  const selected =
    ownAnswer?.answer || '';

  const yes =
    window.siteConfig.feedback.answers.yes;

  const no =
    window.siteConfig.feedback.answers.no;

  const comment =
    ownAnswer?.comment || '';

  return `
<div class="feedback-actions">

<button
  type="button"
  class="feedback-btn${
    selected === yes ? ' is-active' : ''
  }"
  data-feedback-answer="${yes}">

Ja

</button>

<button
  type="button"
  class="feedback-btn${
    selected === no ? ' is-active' : ''
  }"
  data-feedback-answer="${no}">

Nein

</button>

</div>

<label class="feedback-comment-label">

Kommentar (optional)

<textarea
  class="feedback-comment"
  rows="3"
  maxlength="500"
  placeholder="Optionaler Kommentar">${escapeFeedbackHtml(comment)}</textarea>

</label>

<button
  type="button"
  class="feedback-save">

Speichern

</button>
`;

}

function renderFeedbackPoll(
  module,
  ownAnswer
) {

  const config =
    normalizeFeedbackPollConfig(
      module.config
    );

  const selected =
    ownAnswer?.answer || '';

  const optionsHtml =
    config.options
      .map((option) => `

<label class="feedback-poll-option">

<input
  type="radio"
  name="feedback-poll"
  value="${escapeFeedbackHtml(option.id)}"
  ${selected === option.id ? 'checked' : ''}
>

<span>${escapeFeedbackHtml(option.label)}</span>

</label>

`)
      .join('');

  return `
<div class="feedback-poll">

${optionsHtml}

</div>

<button
  type="button"
  class="feedback-save">

Speichern

</button>
`;

}

function canVoteOnFeedbackModule(
  module,
  member
) {

  if (member?.id) {
    return true;
  }

  return module?.public_voting === true;

}

function renderFeedbackModule(
  container,
  module,
  ownAnswer,
  member
) {

  if (!container || !module) {
    return;
  }

  const canVote =
    canVoteOnFeedbackModule(
      module,
      member
    );

  const type =
    module.type;

  let body = '';

  if (canVote) {

    if (
      type
      === window.siteConfig.feedback.types.yesMaybe
    ) {

      body =
        renderFeedbackYesMaybe(
          module,
          ownAnswer
        );

    } else if (
      type
      === window.siteConfig.feedback.types.yesNoComment
    ) {

      body =
        renderFeedbackYesNoComment(
          module,
          ownAnswer
        );

    } else if (
      type
      === window.siteConfig.feedback.types.poll
    ) {

      body =
        renderFeedbackPoll(
          module,
          ownAnswer
        );

    }

  }

  container.innerHTML = `

<section class="feedback-module">

<h2 class="feedback-question">

${escapeFeedbackHtml(module.question)}

</h2>

${
  canVote
    ? (
      member
        ? ''
        : renderFeedbackPublicHint()
    )
    + body
    : renderFeedbackMembersOnlyHint()
}

<div id="feedback-status"></div>

</section>

`;

  if (canVote) {
    bindFeedbackModuleEvents(
      container,
      module,
      member
    );
  }

}

function bindFeedbackModuleEvents(
  container,
  module,
  member
) {

  const statusEl =
    container.querySelector('#feedback-status');

  const identity =
    member?.id
      ? { memberId: member.id }
      : {
          clientToken:
            getFeedbackClientToken(module.id)
        };

  async function persistAnswer(
    answer,
    comment
  ) {

    const validationError =
      validateFeedbackAnswer(
        module,
        answer,
        comment
      );

    if (validationError) {

      statusEl.innerHTML =
        renderFeedbackStatus(
          validationError,
          true
        );

      return;

    }

    const result =
      await saveFeedbackAnswer(
        module.id,
        identity,
        answer,
        comment
      );

    if (result?.error) {

      statusEl.innerHTML =
        renderFeedbackStatus(
          result.error.message
            || 'Speichern fehlgeschlagen.',
          true
        );

      return;

    }

    if (identity.clientToken) {

      setFeedbackClientAnswerCache(
        module.id,
        answer,
        comment
      );

    }

    statusEl.innerHTML =
      renderFeedbackStatus(
        'Antwort gespeichert.',
        false
      );

  }

  container
    .querySelectorAll('[data-feedback-answer]')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        const answer =
          button.dataset.feedbackAnswer;

        container
          .querySelectorAll('[data-feedback-answer]')
          .forEach((item) => {
            item.classList.remove('is-active');
          });

        button.classList.add('is-active');

        if (
          module.type
          === window.siteConfig.feedback.types.yesMaybe
        ) {
          await persistAnswer(answer, null);
        }

      });

    });

  container
    .querySelector('.feedback-save')
    ?.addEventListener('click', async () => {

      let answer = null;
      let comment = null;

      if (
        module.type
        === window.siteConfig.feedback.types.yesNoComment
      ) {

        answer =
          container
            .querySelector('[data-feedback-answer].is-active')
            ?.dataset.feedbackAnswer
          || null;

        comment =
          container
            .querySelector('.feedback-comment')
            ?.value
          || null;

      }

      if (
        module.type
        === window.siteConfig.feedback.types.poll
      ) {

        answer =
          container
            .querySelector('input[name="feedback-poll"]:checked')
            ?.value
          || null;

      }

      await persistAnswer(
        answer,
        comment
      );

    });

}
