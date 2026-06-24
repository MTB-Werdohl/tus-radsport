function canViewerAccessVisibility(
  visibility,
  member
) {

  const normalized =
    normalizeContentVisibility(
      visibility
    );

  if (
    normalized === CONTENT_VISIBILITY.public
  ) {
    return true;
  }

  if (
    normalized === CONTENT_VISIBILITY.members
  ) {

    return (
      viewerIncludesDrafts(member)
      || (
        typeof isClubMember === 'function'
        && isClubMember(member)
      )
    );

  }

  if (
    normalized === CONTENT_VISIBILITY.draft
  ) {
    return viewerIncludesDrafts(member);
  }

  return true;

}

function buildMembersOnlyAccessTexts(
  member
) {

  const loggedIn =
    !!member?.id;

  const clubMember =
    typeof isClubMember === 'function'
    && isClubMember(member);

  let hint =
    'Bitte melde dich als Vereinsmitglied an — Login oben rechts unter „Mitglieder“.';

  if (
    loggedIn
    && !clubMember
  ) {

    hint =
      'Dein Konto hat keinen Zugriff auf interne Inhalte. Vereinsmitglieder melden sich mit der hinterlegten Vereins-E-Mail an.';

  }

  return {
    title:
      '🔒 Nur für Mitglieder',
    message:
      'Du bist hier richtig, aber aufgrund fehlender Berechtigung wird der Inhalt nicht angezeigt.',
    hint
  };

}

async function resolveContentSlug(
  kind,
  slug
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'resolve_content_slug',
      {
        p_kind: kind,
        p_slug: slug
      }
    );

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}

function getContentAccessTexts(
  kind,
  visibility,
  member,
  options = {}
) {

  const normalized =
    normalizeContentVisibility(
      visibility
    );

  const kindLabels = {
    event: 'Termin',
    news: 'Beitrag',
    intern: 'Beitrag'
  };

  const kindLabel =
    kindLabels[kind]
    || 'Inhalt';

  const clubMember =
    typeof isClubMember === 'function'
    && isClubMember(member);

  if (
    normalized === CONTENT_VISIBILITY.draft
  ) {

    if (clubMember) {

      return {
        title:
          '📝 Noch nicht freigegeben',
        message:
          'Bitte habe Geduld auf die Freigabe.',
        hint:
          `Der ${kindLabel} wird vom Vorstand geprüft. Sobald er freigegeben ist, siehst du hier alle Details.`
      };

    }

    return buildMembersOnlyAccessTexts(
      member
    );

  }

  if (
    normalized === CONTENT_VISIBILITY.members
    || options.fallback
  ) {

    return buildMembersOnlyAccessTexts(
      member
    );

  }

  return {
    title:
      `${kindLabel} nicht verfügbar`,
    message:
      'Dieser Inhalt kann derzeit nicht angezeigt werden.',
    hint: ''
  };

}

function renderContentAccessDenied(
  options
) {

  const {
    containerId,
    kind,
    visibility,
    member,
    backUrl,
    backLabel,
    fallback
  } = options;

  const wrapper =
    document.getElementById(
      containerId
    );

  if (!wrapper) {
    return;
  }

  const texts =
    getContentAccessTexts(
      kind,
      visibility,
      member,
      { fallback }
    );

  document.title =
    `${texts.title} · MTB Werdohl`;

  wrapper.innerHTML = `

<div class="event-page content-access-message">

<h1>${texts.title}</h1>

<p class="content-access-lead">
${texts.message}
</p>

${
  texts.hint
    ? `
<p class="content-access-hint">
${texts.hint}
</p>
`
    : ''
}

<div class="event-back">

<a href="${backUrl}">

${backLabel}

</a>

</div>

</div>

`;

}

function renderContentNotFound(
  options
) {

  const {
    containerId,
    kind,
    backUrl,
    backLabel
  } = options;

  const wrapper =
    document.getElementById(
      containerId
    );

  if (!wrapper) {
    return;
  }

  const kindLabels = {
    event: 'Termin',
    news: 'Beitrag',
    intern: 'Beitrag'
  };

  const kindLabel =
    kindLabels[kind]
    || 'Inhalt';

  const message =
    `Dieser ${kindLabel} wurde nicht gefunden.`;

  document.title =
    `Nicht gefunden · MTB Werdohl`;

  wrapper.innerHTML = `

<div class="event-page content-access-message">

<h1>Nicht gefunden</h1>

<p class="content-access-lead">
${message}
</p>

<div class="event-back">

<a href="${backUrl}">

${backLabel}

</a>

</div>

</div>

`;

}

async function handleContentUnavailable(
  options
) {

  const {
    kind,
    slug,
    member,
    containerId,
    backUrl,
    backLabel
  } = options;

  const meta =
    await resolveContentSlug(
      kind,
      slug
    );

  if (meta?.found) {

    const visibility =
      meta.sichtbarkeit;

    if (
      !canViewerAccessVisibility(
        visibility,
        member
      )
    ) {

      renderContentAccessDenied({
        containerId,
        kind,
        visibility,
        member,
        backUrl,
        backLabel
      });

      return;

    }

  }

  if (
    meta
    && !meta.found
  ) {

    if (
      kind === 'news'
      || kind === 'intern'
    ) {

      renderContentAccessDenied({
        containerId,
        kind,
        visibility:
          CONTENT_VISIBILITY.members,
        member,
        backUrl,
        backLabel,
        fallback: true
      });

      return;

    }

    renderContentNotFound({
      containerId,
      kind,
      backUrl,
      backLabel
    });

    return;

  }

  renderContentAccessDenied({
    containerId,
    kind,
    visibility:
      CONTENT_VISIBILITY.members,
    member,
    backUrl,
    backLabel,
    fallback: true
  });

}
