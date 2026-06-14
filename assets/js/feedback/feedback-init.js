let activeFeedbackModuleOptions =
  null;

async function initFeedbackModule(options) {

  const entityType =
    options?.entityType;

  const entityId =
    options?.entityId;

  const container =
    typeof options?.container === 'string'
      ? document.getElementById(options.container)
      : options?.container;

  if (
    !entityType
    || !entityId
    || !container
  ) {
    return;
  }

  activeFeedbackModuleOptions =
    {
      entityType,
      entityId,
      entityVisibility:
        options?.entityVisibility ?? null,
      container:
        typeof options?.container === 'string'
          ? options.container
          : container.id
    };

  const module =
    await fetchFeedbackModule(
      entityType,
      entityId
    );

  if (!module) {
    container.innerHTML = '';
    return;
  }

  const answerCount =
    typeof countFeedbackAnswers === 'function'
      ? await countFeedbackAnswers(
        module.id
      )
      : 0;

  const pollActive =
    module.enabled !== false;

  if (
    !pollActive
    && answerCount === 0
  ) {
    container.innerHTML = '';
    return;
  }

  let member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  if (
    !member
    && typeof waitForAuthSession === 'function'
  ) {

    const session =
      await waitForAuthSession();

    if (
      session
      && typeof validateMemberSession === 'function'
    ) {

      member =
        await validateMemberSession(
          session,
          { strict: false }
        );

    }

  }

  const viewerMember =
    typeof getViewerMember === 'function'
      ? getViewerMember(member)
      : member;

  if (
    !pollActive
    && answerCount > 0
  ) {

    await renderFeedbackPollResultsOnly(
      container,
      module,
      viewerMember,
      options?.entityVisibility ?? null
    );

    return;

  }

  if (
    entityType
    === window.siteConfig.feedback.entityTypes.event
    && options?.entityTermin
    && typeof isTerminStillUpcoming === 'function'
    && !isTerminStillUpcoming(options.entityTermin)
  ) {

    container.innerHTML = `
<p class="feedback-hint">
  Die Abstimmung für diesen Termin ist beendet.
</p>
    `.trim();

    return;

  }

  if (
    !shouldShowFeedbackToViewer(
      module,
      viewerMember
    )
  ) {
    container.innerHTML = '';
    return;
  }

  let ownAnswer = null;

  if (viewerMember?.id) {

    ownAnswer =
      await fetchOwnFeedbackAnswer(
        module.id,
        viewerMember.id
      );

  }

  renderFeedbackModule(
    container,
    module,
    ownAnswer,
    viewerMember,
    options?.entityVisibility ?? null,
    options?.entityRecurring === true
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    if (
      activeFeedbackModuleOptions
    ) {
      initFeedbackModule(
        activeFeedbackModuleOptions
      );
    }

  }
);
