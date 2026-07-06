let activeFeedbackModuleOptions =
  null;

async function initFeedbackModule(options) {

  const entityType =
    options?.entityType;

  const entityId =
    normalizeFeedbackEntityId(
      options?.entityId
    );

  const container =
    typeof options?.container === 'string'
      ? document.getElementById(options.container)
      : options?.container;

  if (
    !entityType
    || entityId == null
    || !container
  ) {
    return;
  }

  activeFeedbackModuleOptions =
    {
      entityType,
      entityId,
      entityNewsItem:
        options?.entityNewsItem ?? null,
      entityVisibility:
        options?.entityVisibility ?? null,
      member:
        options?.member ?? null,
      container:
        typeof options?.container === 'string'
          ? options.container
          : container.id
    };

  const isNewsEntity =
    entityType
    === window.siteConfig.feedback.entityTypes.news;

  let module =
    isNewsEntity
    && options?.entityNewsItem
    && typeof fetchFeedbackModuleForNews
      === 'function'
      ? await fetchFeedbackModuleForNews(
        options.entityNewsItem
      )
      : await fetchFeedbackModule(
        entityType,
        entityId
      );

  if (!module) {
    container.innerHTML = '';
    return;
  }

  if (isNewsEntity) {

    let member =
      options?.member ?? null;

    if (
      !member
      && typeof getCurrentMember === 'function'
    ) {
      member = getCurrentMember();
    }

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
      resolveFeedbackModuleType(module)
      !== window.siteConfig.feedback.types.poll
    ) {

      module = {
        ...module,
        type:
          window.siteConfig.feedback.types.poll
      };

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
      false
    );

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
    options?.member ?? null;

  if (
    !member
    && typeof getCurrentMember === 'function'
  ) {
    member = getCurrentMember();
  }

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

    let yesCount = 0;

    if (
      typeof fetchFeedbackModuleSummary
        === 'function'
    ) {

      const summary =
        await fetchFeedbackModuleSummary(
          module.id
        );

      const yesKey =
        window.siteConfig.feedback.answers.yes;

      yesCount =
        Number(summary?.counts?.[yesKey])
        || 0;

    }

    const message =
      typeof formatPastEventParticipationMessage
        === 'function'
        ? formatPastEventParticipationMessage(
          yesCount
        )
        : 'Die Tour hat stattgefunden.';

    container.innerHTML = `
<p class="feedback-hint">
  ${message}
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

window.addEventListener(
  'feedback-module-refresh',
  () => {

    if (
      activeFeedbackModuleOptions
    ) {
      void initFeedbackModule(
        activeFeedbackModuleOptions
      );
    }

  }
);
