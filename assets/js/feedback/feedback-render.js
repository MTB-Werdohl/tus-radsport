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

function renderFeedbackLoginHint() {

  return `
<p class="feedback-hint">
  Bitte
  <a href="/profil/">einloggen</a>,
  um abzustimmen.
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

function renderFeedbackModule(
  container,
  module,
  ownAnswer,
  member
) {

  if (!container || !module) {
    return;
  }

  const type =
    module.type;

  let body = '';

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

  container.innerHTML = `

<section class="feedback-module">

<h2 class="feedback-question">

${escapeFeedbackHtml(module.question)}

</h2>

${
  member
    ? body
    : renderFeedbackLoginHint()
}

<div id="feedback-status"></div>

</section>

`;

  if (member) {
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

  async function showResult(result, successText) {

    if (result?.error) {

      statusEl.innerHTML =
        renderFeedbackStatus(
          result.error.message
            || 'Speichern fehlgeschlagen.',
          true
        );

      return;

    }

    statusEl.innerHTML =
      renderFeedbackStatus(
        successText,
        false
      );

  }

  container
    .querySelectorAll('[data-feedback-answer]')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        const answer =
          button.dataset.feedbackAnswer;

        if (
          module.type
          === window.siteConfig.feedback.types.yesMaybe
        ) {

          container
            .querySelectorAll('[data-feedback-answer]')
            .forEach((item) => {
              item.classList.remove('is-active');
            });

          button.classList.add('is-active');

          const validationError =
            validateFeedbackAnswer(
              module,
              answer,
              null
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
              member.id,
              answer,
              null
            );

          await showResult(
            result,
            'Antwort gespeichert.'
          );

          return;

        }

        container
          .querySelectorAll('[data-feedback-answer]')
          .forEach((item) => {
            item.classList.remove('is-active');
          });

        button.classList.add('is-active');

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
          member.id,
          answer,
          comment
        );

      await showResult(
        result,
        'Antwort gespeichert.'
      );

    });

}
