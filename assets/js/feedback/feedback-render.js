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
<div class="feedback-actions feedback-actions--public-gate">

  <button
    type="button"
    class="feedback-btn feedback-public-gate__register">

    <span class="feedback-btn__label">
      Teilnehmen
    </span>

    <span class="feedback-btn__sublabel">
      Als Gast registrieren
    </span>

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

function renderFeedbackSubscription(
  ownAnswer
) {

  const subscribed =
    isFeedbackSubscriptionAnswer(
      ownAnswer?.answer
    );

  return `
<div class="feedback-actions feedback-actions--subscription">

<button
  type="button"
  class="feedback-btn feedback-btn--subscription${
    subscribed ? ' is-active' : ''
  }"
  data-feedback-subscription-toggle>

<span class="feedback-btn__label">
  ${
    subscribed
      ? 'Infos bestellt'
      : 'Keine Infos bestellt'
  }
</span>

</button>

</div>
`;

}

function renderFeedbackYesMaybe(
  module,
  ownAnswer,
  commitmentEnabled
) {

  const selected =
    ownAnswer?.answer || '';

  const yes =
    window.siteConfig.feedback.answers.yes;

  const maybe =
    window.siteConfig.feedback.answers.maybe;

  const showWithdrawAsSecondButton =
    commitmentEnabled
    && selected === yes;

  const secondButtonLabel =
    showWithdrawAsSecondButton
      ? 'Absagen'
      : 'Vielleicht';

  return `
<div class="feedback-actions">

<button
  type="button"
  class="feedback-btn${
    selected === yes ? ' is-active' : ''
  }"
  data-feedback-answer="${yes}">

<span class="feedback-btn__label">Ja</span>
${
  commitmentEnabled
    ? '<span class="feedback-btn__sublabel">Verbindlich</span>'
    : ''
}

</button>

<button
  type="button"
  class="feedback-btn${
    showWithdrawAsSecondButton
      ? ' feedback-btn--withdraw'
      : selected === maybe
        ? ' is-active'
        : ''
  }"
  data-feedback-answer="${maybe}">

<span class="feedback-btn__label">
  ${secondButtonLabel}
</span>
${
  commitmentEnabled
  && !showWithdrawAsSecondButton
    ? '<span class="feedback-btn__sublabel">Interesse</span>'
    : ''
}

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

function ensureFeedbackCancellationModal() {

  if (
    document.getElementById(
      'feedback-cancellation-modal'
    )
  ) {
    return;
  }

  const reasonsHtml =
    FEEDBACK_CANCELLATION_REASONS
      .map((reason, index) => `
<label class="feedback-cancellation-option">

<input
  type="radio"
  name="feedback-cancellation-reason"
  value="${escapeFeedbackHtml(reason.code)}"
  ${index === 0 ? 'checked' : ''}
>

<span>${escapeFeedbackHtml(reason.label)}</span>

</label>
`)
      .join('');

  document.body.insertAdjacentHTML(
    'beforeend',
    `
<div
  id="feedback-cancellation-modal"
  class="feedback-cancellation-modal"
  hidden>

  <div
    class="feedback-cancellation-modal__backdrop"
    data-feedback-cancellation-close>

  </div>

  <div
    class="feedback-cancellation-modal__dialog"
    role="dialog"
    aria-labelledby="feedback-cancellation-title"
    aria-modal="true">

    <h3 id="feedback-cancellation-title">
      Verbindliche Zusage absagen
    </h3>

    <p class="feedback-cancellation-modal__intro">
      Du hattest bereits verbindlich zugesagt.
      Warum möchtest du absagen?
    </p>

    <fieldset class="feedback-cancellation-modal__reasons">
      ${reasonsHtml}
    </fieldset>

    <div
      class="feedback-cancellation-modal__freetext-wrap is-hidden"
      data-feedback-cancellation-freetext-wrap>

      <label for="feedback-cancellation-freetext">
        Optional: kurze Ergänzung
      </label>

      <textarea
        id="feedback-cancellation-freetext"
        class="feedback-cancellation-modal__freetext"
        maxlength="500"
        rows="3"
        placeholder="Optional …">

      </textarea>

    </div>

    <p
      id="feedback-cancellation-error"
      class="feedback-cancellation-modal__error"
      hidden>

    </p>

    <div class="feedback-cancellation-modal__actions">

      <button
        type="button"
        class="feedback-cancellation-modal__cancel"
        data-feedback-cancellation-close>

        Abbrechen

      </button>

      <button
        type="button"
        class="feedback-cancellation-modal__confirm"
        data-feedback-cancellation-confirm>

        Absage speichern

      </button>

    </div>

  </div>

</div>
`
  );

  const modal =
    document.getElementById(
      'feedback-cancellation-modal'
    );

  const freeTextWrap =
    modal.querySelector(
      '[data-feedback-cancellation-freetext-wrap]'
    );

  modal
    .querySelectorAll(
      'input[name="feedback-cancellation-reason"]'
    )
    .forEach((input) => {

      input.addEventListener('change', () => {

        const isSonstiges =
          modal.querySelector(
            'input[name="feedback-cancellation-reason"]:checked'
          )?.value === 'sonstiges';

        freeTextWrap.classList.toggle(
          'is-hidden',
          !isSonstiges
        );

        if (!isSonstiges) {

          const freeText =
            modal.querySelector(
              '#feedback-cancellation-freetext'
            );

          if (freeText) {
            freeText.value = '';
          }

        }

      });

    });

}

function openFeedbackCancellationDialog() {

  ensureFeedbackCancellationModal();

  const modal =
    document.getElementById(
      'feedback-cancellation-modal'
    );

  const errorEl =
    document.getElementById(
      'feedback-cancellation-error'
    );

  const freeText =
    document.getElementById(
      'feedback-cancellation-freetext'
    );

  if (freeText) {
    freeText.value = '';
  }

  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  const firstReason =
    modal.querySelector(
      'input[name="feedback-cancellation-reason"]'
    );

  if (firstReason) {
    firstReason.checked = true;
  }

  modal.querySelector(
    '[data-feedback-cancellation-freetext-wrap]'
  ).classList.add('is-hidden');

  modal.hidden = false;

  return new Promise((resolve) => {

    function cleanup(result) {

      modal.hidden = true;

      modal
        .querySelector('[data-feedback-cancellation-confirm]')
        ?.removeEventListener('click', onConfirm);

      modal
        .querySelectorAll('[data-feedback-cancellation-close]')
        .forEach((el) => {
          el.removeEventListener('click', onCancel);
        });

      resolve(result);

    }

    function onCancel() {
      cleanup(null);
    }

    function onConfirm() {

      const selected =
        modal.querySelector(
          'input[name="feedback-cancellation-reason"]:checked'
        )?.value;

      if (!selected) {

        if (errorEl) {
          errorEl.textContent =
            'Bitte einen Grund wählen.';
          errorEl.hidden = false;
        }

        return;

      }

      const comment =
        selected === 'sonstiges'
          ? freeText?.value?.trim() || null
          : null;

      cleanup({
        cancellationReasonCode: selected,
        comment
      });

    }

    modal
      .querySelector('[data-feedback-cancellation-confirm]')
      ?.addEventListener('click', onConfirm);

    modal
      .querySelectorAll('[data-feedback-cancellation-close]')
      .forEach((el) => {
        el.addEventListener('click', onCancel);
      });

  });

}

function confirmFeedbackYesCommitment() {

  return window.confirm(
    'Du sagst verbindlich zu. Der Organisator darf mit deiner Teilnahme planen.\n\nJetzt verbindlich zusagen?'
  );

}

function shouldShowFeedbackPollResults(
  module,
  member,
  entityVisibility
) {

  if (
    !module
    || module.enabled === false
  ) {
    return false;
  }

  if (
    resolveFeedbackModuleType(module)
    !== window.siteConfig.feedback.types.poll
  ) {
    return false;
  }

  if (
    !shouldShowFeedbackToViewer(
      module,
      member
    )
  ) {
    return false;
  }

  if (
    typeof isClubMember === 'function'
    && isClubMember(member)
  ) {
    return true;
  }

  if (
    typeof isVorstand === 'function'
    && isVorstand(member)
  ) {
    return true;
  }

  return (
    isFeedbackEntityPublic(entityVisibility)
    && module?.public_voting === true
  );

}

function normalizeFeedbackSummaryCounts(
  module,
  summary
) {

  const counts =
    summary?.counts || {};

  if (
    module?.type
    === window.siteConfig.feedback.types.poll
  ) {

    const normalized = {};

    getFeedbackPollAllOptions(
      module.config
    ).forEach((option) => {
      normalized[option.id] =
        Number(counts[option.id]) || 0;
    });

    return normalized;

  }

  return counts;

}

function renderFeedbackPollResultsSummary(
  module,
  summary
) {

  const total =
    Number(summary?.total) || 0;

  if (total <= 0) {
    return '';
  }

  const counts =
    normalizeFeedbackSummaryCounts(
      module,
      summary
    );

  const options =
    getFeedbackPollAllOptions(
      module.config
    );

  const items =
    options
      .map((option) => {

        const count =
          Number(counts[option.id]) || 0;

        const percent =
          total > 0
            ? Math.round(
              (count / total) * 100
            )
            : 0;

        return `
<li class="feedback-poll-results__item">

<span class="feedback-poll-results__label">
  ${escapeFeedbackHtml(option.label)}
</span>

<div
  class="feedback-poll-results__bar"
  role="presentation">

  <span
    class="feedback-poll-results__bar-fill"
    style="width: ${percent}%;">
  </span>

</div>

<span class="feedback-poll-results__meta">
  <strong>${percent}%</strong>
  (${count})
</span>

</li>
`;

      })
      .join('');

  const voteLabel =
    total === 1
      ? '1 Stimme'
      : `${total} Stimmen`;

  return `
<div
  class="feedback-poll-results"
  data-feedback-poll-results>

<p class="feedback-poll-results__total">
  ${escapeFeedbackHtml(voteLabel)}
</p>

<ul class="feedback-poll-results__list">
  ${items}
</ul>

</div>
`;

}

async function refreshFeedbackPollResults(
  container,
  module,
  member,
  entityVisibility
) {

  if (
    !shouldShowFeedbackPollResults(
      module,
      member,
      entityVisibility
    )
  ) {
    return;
  }

  const summary =
    await fetchFeedbackModuleSummary(
      module.id
    );

  const existing =
    container.querySelector(
      '[data-feedback-poll-results]'
    );

  const html =
    renderFeedbackPollResultsSummary(
      module,
      summary
    );

  if (!html) {

    if (existing) {
      existing.remove();
    }

    return;

  }

  if (existing) {
    existing.outerHTML = html;
    return;
  }

  const statusEl =
    container.querySelector(
      '#feedback-status'
    );

  if (statusEl) {
    statusEl.insertAdjacentHTML(
      'afterend',
      html
    );
    return;
  }

  container
    .querySelector('.feedback-module')
    ?.insertAdjacentHTML(
      'beforeend',
      html
    );

}

function renderFeedbackModule(
  container,
  module,
  ownAnswer,
  member,
  entityVisibility,
  entityRecurring
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

  const commitmentEnabled =
    isFeedbackEventCommitmentEnabled(
      module,
      entityRecurring
    );

  const subscriptionMode =
    isFeedbackEventSubscriptionMode(
      module,
      entityRecurring
    );

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
        subscriptionMode
          ? renderFeedbackSubscription(
            ownAnswer
          )
          : renderFeedbackYesMaybe(
            module,
            ownAnswer,
            commitmentEnabled
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
      entityVisibility,
      entityRecurring,
      ownAnswer
    );
  } else if (showPublicGate) {
    bindFeedbackPublicGateEvents(container);
  }

  void refreshFeedbackPollResults(
    container,
    module,
    member,
    entityVisibility
  );

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
  entityVisibility,
  entityRecurring,
  ownAnswer
) {

  const identity =
    member?.id
      ? { memberId: member.id }
      : null;

  const type =
    resolveFeedbackModuleType(module);

  const commitmentEnabled =
    isFeedbackEventCommitmentEnabled(
      module,
      entityRecurring
    );

  const subscriptionMode =
    isFeedbackEventSubscriptionMode(
      module,
      entityRecurring
    );

  const yes =
    window.siteConfig.feedback.answers.yes;

  const maybe =
    window.siteConfig.feedback.answers.maybe;

  function rerenderFeedback(
    nextAnswer,
    message,
    isError
  ) {

    renderFeedbackModule(
      container,
      module,
      nextAnswer,
      member,
      entityVisibility,
      entityRecurring
    );

    if (message) {
      showFeedbackStatus(
        container,
        message,
        isError
      );
    }

  }

  async function applyEventAnswer(
    nextAnswer,
    cancellation
  ) {

    if (!identity?.memberId) {

      showFeedbackStatus(
        container,
        'Bitte zuerst per E-Mail-Link anmelden.',
        true
      );

      return false;

    }

    const saveOptions =
      commitmentEnabled
        ? {
          eventCommitment: true,
          cancellationReasonCode:
            cancellation?.cancellationReasonCode
            || null,
          comment:
            cancellation?.comment
            || null
        }
        : {};

    let result;

    if (nextAnswer == null) {

      result =
        await deleteFeedbackAnswer(
          module.id,
          identity.memberId,
          saveOptions
        );

    } else {

      const validationError =
        validateFeedbackAnswer(
          module,
          nextAnswer,
          cancellation?.comment
        );

      if (validationError) {

        showFeedbackStatus(
          container,
          validationError,
          true
        );

        return false;

      }

      result =
        await saveFeedbackAnswer(
          module.id,
          identity,
          nextAnswer,
          cancellation?.comment || null,
          saveOptions
        );

    }

    if (result?.error) {

      showFeedbackStatus(
        container,
        result.error.message
          || 'Speichern fehlgeschlagen.',
        true
      );

      return false;

    }

    rerenderFeedback(
      result.data ?? null,
      nextAnswer == null
        ? 'Abstimmung zurückgezogen.'
        : 'Antwort gespeichert.',
      false
    );

    return true;

  }

  async function withdrawAnswer(
    cancellation
  ) {

    return applyEventAnswer(
      null,
      cancellation
    );

  }

  async function persistAnswer(
    answer,
    comment,
    cancellationReasonCode
  ) {

    try {

      if (
        isFeedbackAnswerWithdrawal(
          module,
          answer,
          comment
        )
      ) {

        await withdrawAnswer(
          cancellationReasonCode
            ? {
              cancellationReasonCode,
              comment
            }
            : null
        );

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

      const saveOptions =
        commitmentEnabled
          ? {
            eventCommitment: true,
            cancellationReasonCode:
              cancellationReasonCode || null
          }
          : {};

      const result =
        await saveFeedbackAnswer(
          module.id,
          identity,
          answer,
          comment,
          saveOptions
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

      rerenderFeedback(
        result.data,
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

  async function handleYesMaybeClick(
    answer,
    wasActive
  ) {

    const currentAnswer =
      String(ownAnswer?.answer || '')
        .trim();

    if (commitmentEnabled) {

      if (wasActive && answer === yes) {
        return;
      }

      if (wasActive && answer === maybe) {

        await applyEventAnswer(null, null);

        return;

      }

      if (answer === yes) {

        if (
          currentAnswer !== yes
          && !confirmFeedbackYesCommitment()
        ) {
          rerenderFeedback(ownAnswer, null, false);
          return;
        }

        await applyEventAnswer(yes, null);

        return;

      }

      if (answer === maybe) {

        if (currentAnswer === yes) {

          const cancellation =
            await openFeedbackCancellationDialog();

          if (!cancellation) {
            rerenderFeedback(ownAnswer, null, false);
            return;
          }

          await applyEventAnswer(
            null,
            cancellation
          );

          return;

        }

        await applyEventAnswer(maybe, null);

      }

      return;

    }

    if (wasActive) {

      container
        .querySelectorAll('[data-feedback-answer]')
        .forEach((item) => {
          item.classList.remove('is-active');
        });

      await withdrawAnswer(null);

      return;

    }

    container
      .querySelectorAll('[data-feedback-answer]')
      .forEach((item) => {
        item.classList.remove('is-active');
      });

    buttonHighlight(answer);

    await persistAnswer(answer, null);

  }

  function buttonHighlight(answer) {

    container
      .querySelectorAll('[data-feedback-answer]')
      .forEach((item) => {

        item.classList.toggle(
          'is-active',
          item.dataset.feedbackAnswer === answer
        );

      });

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

  if (
    subscriptionMode
    && type
    === window.siteConfig.feedback.types.yesMaybe
  ) {

    container
      .querySelector('[data-feedback-subscription-toggle]')
      ?.addEventListener('click', async () => {

        if (
          isFeedbackSubscriptionAnswer(
            ownAnswer?.answer
          )
        ) {
          await applyEventAnswer(null, null);
          return;
        }

        await applyEventAnswer(maybe, null);

      });

  } else {

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
        ) {

          await handleYesMaybeClick(
            answer,
            wasActive
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

  }

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
