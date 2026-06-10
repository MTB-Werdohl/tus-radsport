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

function isFeedbackEntityPublic(
  entityVisibility
) {

  return (
    entityVisibility === 'public'
    || entityVisibility
      === window.siteConfig.visibility.public
  );

}

function shouldShowFeedbackToViewer(
  module,
  member
) {

  if (
    !module
    || module.enabled === false
  ) {
    return false;
  }

  return true;

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

function renderFeedbackPublicGate() {

  return `
<div class="feedback-public-gate">

  <p class="feedback-hint feedback-hint--public">
    Auch als Nichtmitglied kannst du Teilnehmen. Wir bitten um kurze Registrierung,
    damit wir wissen wer du bist und wie wir dich erreichen können.
    Du erhältst einen Bestätigungs-Link per E-Mail - danach kannst du deine Teilnahme anmelden.
  </p>

  <button
    type="button"
    class="feedback-public-gate__register feedback-save">

    Als externer Teilnehmer teilnehmen

  </button>

</div>
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

function renderFeedbackPoll(
  module,
  ownAnswer
) {

  const config =
    normalizeFeedbackPollConfig(
      module.config
    );

  const selected =
    parseFeedbackPollAnswer(
      ownAnswer?.answer
    );

  const freeTextSelected =
    selected.includes(
      FEEDBACK_POLL_FREETEXT_OPTION_ID
    );

  const inputType =
    config.multiple
      ? 'checkbox'
      : 'radio';

  const inputName =
    config.multiple
      ? 'feedback-poll-option'
      : 'feedback-poll';

  const options =
    getFeedbackPollAllOptions(
      module.config
    );

  const optionsHtml =
    options
      .map((option) => {

        const isFreeText =
          option.id
          === FEEDBACK_POLL_FREETEXT_OPTION_ID;

        const isSelected =
          selected.includes(option.id);

        const freeTextInput =
          isFreeText
            ? `
<div
  class="feedback-freetext-wrap${
    freeTextSelected ? '' : ' is-hidden'
  }"
  data-feedback-freetext-input>

  <input
    type="text"
    class="feedback-freetext"
    maxlength="500"
    placeholder="Deine Antwort …"
    value="${escapeFeedbackHtml(
      ownAnswer?.comment || ''
    )}">

</div>
`
            : '';

        return `
<div class="feedback-poll-option-block${
  isFreeText
    ? ' feedback-poll-option-block--freetext'
    : ''
}">

<label class="feedback-poll-option">

<input
  type="${inputType}"
  name="${inputName}"
  value="${escapeFeedbackHtml(option.id)}"
  ${isSelected ? 'checked' : ''}
  ${isFreeText ? 'data-feedback-freetext-option' : ''}
>

<span>${escapeFeedbackHtml(option.label)}</span>

</label>

${freeTextInput}

</div>
`;

      })
      .join('');

  return `
<div class="feedback-poll">

${optionsHtml}

</div>

<button
  type="button"
  class="feedback-poll-save">

Speichern

</button>
`;

}

function syncFeedbackFreeTextInputVisibility(
  container
) {

  const freeTextSelected =
    !!container.querySelector(
      '[data-feedback-freetext-option]:checked'
    );

  const wrap =
    container.querySelector(
      '[data-feedback-freetext-input]'
    );

  if (!wrap) {
    return;
  }

  wrap.classList.toggle(
    'is-hidden',
    !freeTextSelected
  );

  if (!freeTextSelected) {

    const input =
      wrap.querySelector('.feedback-freetext');

    if (input) {
      input.value = '';
    }

  }

}

function canVoteOnFeedbackModule(
  module,
  member
) {

  if (
    module?.public_voting === true
  ) {

    return (
      isClubMember(member)
      || isPublicParticipant(member)
    );

  }

  return isClubMember(member);

}

function shouldShowPublicGate(
  module,
  member,
  entityVisibility
) {

  return (
    isFeedbackEntityPublic(entityVisibility)
    && module?.public_voting === true
    && !canVoteOnFeedbackModule(
      module,
      member
    )
  );

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

function renderFeedbackModule(
  container,
  module,
  ownAnswer,
  member,
  entityVisibility
) {

  if (!container || !module) {
    return;
  }

  if (
    !shouldShowFeedbackToViewer(
      module,
      member
    )
  ) {
    container.innerHTML = '';
    return;
  }

  ensurePublicFeedbackModal();

  const canVote =
    canVoteOnFeedbackModule(
      module,
      member
    );

  const showPublicGate =
    shouldShowPublicGate(
      module,
      member,
      entityVisibility
    );

  const type =
    resolveFeedbackModuleType(module);

  const pollConfig =
    type
    === window.siteConfig.feedback.types.poll
      ? normalizeFeedbackPollConfig(
        module.config
      )
      : null;

  const multipleHint =
    canVote
    && pollConfig?.multiple
      ? `
<p class="feedback-question-hint">
  Mehrfachauswahl möglich
</p>
`
      : '';

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

${multipleHint}

${
  canVote
    ? body
    : (
      showPublicGate
        ? renderFeedbackPublicGate()
        : renderFeedbackMembersOnlyHint()
    )
}

<div id="feedback-status"></div>

</section>

`;

  if (canVote) {
    bindFeedbackModuleEvents(
      container,
      module,
      member,
      entityVisibility
    );
  } else if (showPublicGate) {
    bindFeedbackPublicGateEvents(container);
  }

}

function bindFeedbackPublicGateEvents(container) {

  container
    .querySelector('.feedback-public-gate__register')
    ?.addEventListener('click', () => {

      openPublicFeedbackModal();

    });

}

function showFeedbackStatus(
  container,
  message,
  isError
) {

  const statusEl =
    container.querySelector(
      '#feedback-status'
    );

  if (!statusEl) {
    return;
  }

  statusEl.innerHTML =
    renderFeedbackStatus(
      message,
      isError
    );

}

function bindFeedbackModuleEvents(
  container,
  module,
  member,
  entityVisibility
) {

  const identity =
    member?.id
      ? { memberId: member.id }
      : null;

  const type =
    resolveFeedbackModuleType(module);

  async function withdrawAnswer() {

    if (!identity?.memberId) {

      showFeedbackStatus(
        container,
        'Bitte zuerst per E-Mail-Link anmelden.',
        true
      );

      return;

    }

    const result =
      await deleteFeedbackAnswer(
        module.id,
        identity.memberId
      );

    if (result?.error) {

      showFeedbackStatus(
        container,
        result.error.message
          || 'Zurückziehen fehlgeschlagen.',
        true
      );

      return;

    }

    renderFeedbackModule(
      container,
      module,
      null,
      member,
      entityVisibility
    );

    showFeedbackStatus(
      container,
      'Abstimmung zurückgezogen.',
      false
    );

  }

  async function persistAnswer(
    answer,
    comment
  ) {

    try {

      if (
        isFeedbackAnswerWithdrawal(
          module,
          answer,
          comment
        )
      ) {

        await withdrawAnswer();

        return;

      }

      const validationError =
        validateFeedbackAnswer(
          module,
          answer,
          comment
        );

      if (validationError) {

        showFeedbackStatus(
          container,
          validationError,
          true
        );

        return;

      }

      if (!identity?.memberId) {

        showFeedbackStatus(
          container,
          'Bitte zuerst per E-Mail-Link anmelden.',
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

        showFeedbackStatus(
          container,
          result.error.message
            || 'Speichern fehlgeschlagen.',
          true
        );

        return;

      }

      renderFeedbackModule(
        container,
        module,
        result.data,
        member,
        entityVisibility
      );

      showFeedbackStatus(
        container,
        'Antwort gespeichert.',
        false
      );

    } catch (error) {

      console.error(error);

      showFeedbackStatus(
        container,
        'Speichern fehlgeschlagen.',
        true
      );

    }

  }

  async function handlePollSaveClick() {

    const saveButton =
      container.querySelector(
        '.feedback-poll-save'
      );

    if (saveButton?.disabled) {
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
    }

    try {

      const config =
        normalizeFeedbackPollConfig(
          module.config
        );

      const selected =
        [
          ...container.querySelectorAll(
            '.feedback-poll input:checked'
          )
        ].map((input) => input.value);

      const freeTextSelected =
        selected.includes(
          FEEDBACK_POLL_FREETEXT_OPTION_ID
        );

      const comment =
        freeTextSelected
          ? container
            .querySelector('.feedback-freetext')
            ?.value
            ?.trim()
          || null
          : null;

      const answer =
        serializeFeedbackPollAnswer(
          selected,
          config.multiple
        );

      await persistAnswer(
        answer,
        comment
      );

    } finally {

      if (saveButton) {
        saveButton.disabled = false;
      }

    }

  }

  container
    .querySelectorAll('[data-feedback-answer]')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        const answer =
          button.dataset.feedbackAnswer;

        const wasActive =
          button.classList.contains(
            'is-active'
          );

        if (
          type
          === window.siteConfig.feedback.types.yesMaybe
          && wasActive
        ) {

          container
            .querySelectorAll(
              '[data-feedback-answer]'
            )
            .forEach((item) => {
              item.classList.remove(
                'is-active'
              );
            });

          await withdrawAnswer();

          return;

        }

        container
          .querySelectorAll('[data-feedback-answer]')
          .forEach((item) => {
            item.classList.remove('is-active');
          });

        button.classList.add('is-active');

        if (
          type
          === window.siteConfig.feedback.types.yesMaybe
        ) {
          await persistAnswer(answer, null);
        }

      });

    });

  container
    .querySelector('.feedback-poll-save')
    ?.addEventListener('click', () => {

      void handlePollSaveClick();

    });

  if (
    type
    === window.siteConfig.feedback.types.poll
  ) {

    const pollConfig =
      normalizeFeedbackPollConfig(
        module.config
      );

    syncFeedbackFreeTextInputVisibility(
      container
    );

    container
      .querySelectorAll(
        `[name="${
          pollConfig.multiple
            ? 'feedback-poll-option'
            : 'feedback-poll'
        }"]`
      )
      .forEach((input) => {

        input.addEventListener('change', () => {

          if (
            pollConfig.multiple
            && input.checked
          ) {

            const isFreeText =
              input.hasAttribute(
                'data-feedback-freetext-option'
              );

            if (isFreeText) {

              container
                .querySelectorAll(
                  '.feedback-poll input:not([data-feedback-freetext-option])'
                )
                .forEach((other) => {
                  other.checked = false;
                });

            } else {

              const freeTextOption =
                container.querySelector(
                  '[data-feedback-freetext-option]'
                );

              if (freeTextOption) {
                freeTextOption.checked = false;
              }

            }

          }

          syncFeedbackFreeTextInputVisibility(
            container
          );

        });

      });

  }

}
