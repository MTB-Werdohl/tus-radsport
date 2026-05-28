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

  const module =
    await fetchFeedbackModule(
      entityType,
      entityId
    );

  if (!module) {
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

  let ownAnswer = null;

  if (member?.id) {

    ownAnswer =
      await fetchOwnFeedbackAnswer(
        module.id,
        member.id
      );

  } else if (module.public_voting) {

    ownAnswer =
      getFeedbackClientAnswerCache(
        module.id
      );

  }

  renderFeedbackModule(
    container,
    module,
    ownAnswer,
    member
  );

}
