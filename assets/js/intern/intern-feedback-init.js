let activeInternFeedbackOptions =
  null;

function renderInternNewsPollInactiveHint() {

  return `
<p class="feedback-hint">
  Die Umfrage ist deaktiviert.
  Zum Aktivieren im Editor
  <strong>„Poll aktiv“</strong>
  ankreuzen und speichern.
</p>
`;

}

function renderInternNewsFeedbackModule(
  container,
  module,
  ownAnswer,
  member,
  entityVisibility
) {

  if (!container || !module) {
    return;
  }

  const activeModule =
    typeof prepareNewsFeedbackModule === 'function'
      ? prepareNewsFeedbackModule(module)
      : {
        ...module,
        entity_type:
          window.siteConfig.feedback.entityTypes.news,
        type:
          window.siteConfig.feedback.types.poll
      };

  const pollActive =
    activeModule.enabled !== false;

  const canVote =
    pollActive
    && typeof canVoteOnFeedbackModule === 'function'
    && canVoteOnFeedbackModule(
      activeModule,
      member
    );

  const showPreview =
    !pollActive
    && typeof isClubMember === 'function'
    && isClubMember(member);

  const pollConfig =
    typeof normalizeFeedbackPollConfig === 'function'
      ? normalizeFeedbackPollConfig(
        activeModule.config
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

  if (
    canVote
    && typeof renderFeedbackPoll === 'function'
  ) {

    body =
      renderFeedbackPoll(
        activeModule,
        ownAnswer
      );

  } else if (
    showPreview
    && typeof renderFeedbackPoll === 'function'
  ) {

    body =
      renderInternNewsPollInactiveHint()
      + renderFeedbackPoll(
        activeModule,
        ownAnswer,
        { readOnly: true }
      );

  } else if (!pollActive) {

    body =
      renderInternNewsPollInactiveHint();

  } else if (
    typeof renderFeedbackMembersOnlyHint
      === 'function'
  ) {

    body =
      renderFeedbackMembersOnlyHint();

  }

  const question =
    typeof escapeFeedbackHtml === 'function'
      ? escapeFeedbackHtml(
        activeModule.question || ''
      )
      : String(activeModule.question || '');

  if (
    typeof ensurePublicFeedbackModal === 'function'
  ) {
    ensurePublicFeedbackModal();
  }

  container.innerHTML = `

<section class="feedback-module feedback-module--intern-news">

<h2 class="feedback-question">

${question}

</h2>

${multipleHint}

${body}

<div id="feedback-status"></div>

</section>

`;

  if (
    canVote
    && typeof bindFeedbackModuleEvents === 'function'
  ) {

    bindFeedbackModuleEvents(
      container,
      activeModule,
      member,
      entityVisibility,
      false,
      ownAnswer
    );

  }

  if (
    typeof refreshFeedbackPollResults === 'function'
  ) {

    void refreshFeedbackPollResults(
      container,
      activeModule,
      member,
      entityVisibility,
      { allowDisabled: true }
    );

  }

}

async function resolveInternNewsFeedbackMember(
  member
) {

  if (member?.id) {
    return member;
  }

  if (
    typeof getCurrentMember === 'function'
  ) {

    const current =
      getCurrentMember();

    if (current?.id) {
      return current;
    }

  }

  if (
    typeof waitForAuthSession !== 'function'
  ) {
    return null;
  }

  const session =
    await waitForAuthSession();

  if (
    !session
    || typeof validateMemberSession !== 'function'
  ) {
    return null;
  }

  return validateMemberSession(
    session,
    { strict: false }
  );

}

async function initInternNewsFeedback(
  options = {}
) {

  const newsItem =
    options?.newsItem;

  const containerId =
    options?.container || 'intern-feedback';

  const container =
    typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

  if (
    !newsItem?.id
    || !container
  ) {
    return;
  }

  activeInternFeedbackOptions =
    {
      newsItem,
      entityVisibility:
        options?.entityVisibility ?? null,
      member:
        options?.member ?? null,
      container: containerId
    };

  let module = null;

  if (
    typeof fetchFeedbackModuleForNews
      === 'function'
  ) {

    module =
      await fetchFeedbackModuleForNews(
        newsItem
      );

  }

  if (
    !module
    && typeof fetchFeedbackModule === 'function'
  ) {

    module =
      await fetchFeedbackModule(
        window.siteConfig.feedback.entityTypes.news,
        newsItem.id
      );

  }

  if (!module) {

    container.innerHTML = '';

    return;

  }

  const member =
    await resolveInternNewsFeedbackMember(
      options?.member ?? null
    );

  const viewerMember =
    typeof getViewerMember === 'function'
      ? getViewerMember(member)
      : member;

  let ownAnswer = null;

  if (
    viewerMember?.id
    && typeof fetchOwnFeedbackAnswer === 'function'
  ) {

    ownAnswer =
      await fetchOwnFeedbackAnswer(
        module.id,
        viewerMember.id
      );

  }

  renderInternNewsFeedbackModule(
    container,
    module,
    ownAnswer,
    viewerMember,
    options?.entityVisibility ?? null
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    if (activeInternFeedbackOptions) {
      void initInternNewsFeedback(
        activeInternFeedbackOptions
      );
    }

  }
);

window.addEventListener(
  'feedback-module-refresh',
  () => {

    if (activeInternFeedbackOptions) {
      void initInternNewsFeedback(
        activeInternFeedbackOptions
      );
    }

  }
);
