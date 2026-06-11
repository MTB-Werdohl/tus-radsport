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

  if (!module || module.enabled === false) {
    container.innerHTML = '';
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
