window.CONTENT_VISIBILITY = {

  public: 'public',

  members: 'members',

  draft: 'draft'

};

window.CONTENT_VISIBILITY_LABELS = {

  public: 'Öffentlich',

  members: 'Nur Mitglieder',

  draft: 'Entwurf'

};

function formatVisibilityLabel(value) {

  return CONTENT_VISIBILITY_LABELS[value]
    || CONTENT_VISIBILITY_LABELS.public;

}

function visibilityListLabel(value) {

  if (value === CONTENT_VISIBILITY.public) {
    return '🌐 Öffentlich';
  }

  if (value === CONTENT_VISIBILITY.members) {
    return '🔒 Nur Mitglieder';
  }

  if (value === CONTENT_VISIBILITY.draft) {
    return '📝 Entwurf';
  }

  return '🌐 Öffentlich';

}

function isPublicVisibility(value) {

  return (
    value === CONTENT_VISIBILITY.public
    || !value
  );

}

function publishedFromVisibility(value) {

  return value !== CONTENT_VISIBILITY.draft;

}

function normalizeContentVisibility(value) {

  if (value === CONTENT_VISIBILITY.members) {
    return CONTENT_VISIBILITY.members;
  }

  if (value === CONTENT_VISIBILITY.draft) {
    return CONTENT_VISIBILITY.draft;
  }

  return CONTENT_VISIBILITY.public;

}

function contentVisibilityIcon(value) {

  const visibility =
    normalizeContentVisibility(value);

  if (visibility === CONTENT_VISIBILITY.members) {
    return '🔒';
  }

  if (visibility === CONTENT_VISIBILITY.draft) {
    return '📝';
  }

  return '🌐';

}

function contentVisibilityCardClass(value) {

  return (
    `calendar-card calendar-card--${
      normalizeContentVisibility(value)
    }`
  );

}

function formatContentCardTitle(
  title,
  sichtbarkeit
) {

  return (
    `${contentVisibilityIcon(sichtbarkeit)} ${
      title
    }`
  );

}

function viewerIncludesDrafts(member) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

function canAccessNewsSection(member) {

  return (
    (
      typeof isClubMember === 'function'
      && isClubMember(member)
    )
    || viewerIncludesDrafts(member)
  );

}

function newsRowVisibleToViewer(
  item,
  member
) {

  const visibility =
    item?.sichtbarkeit;

  if (
    visibility
    === CONTENT_VISIBILITY.draft
  ) {
    return viewerIncludesDrafts(member);
  }

  if (
    visibility
    === CONTENT_VISIBILITY.public
  ) {
    return canAccessNewsSection(member);
  }

  return canAccessNewsSection(member);

}

async function ensureContentViewerMember() {

  if (
    typeof getViewerMember === 'function'
  ) {

    const current =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    const viewer =
      getViewerMember(current);

    if (viewer) {
      return viewer;
    }

    if (
      typeof isAdminPreviewActive === 'function'
      && isAdminPreviewActive()
    ) {
      return null;
    }

  }

  if (
    typeof getCurrentMember === 'function'
    && getCurrentMember()
  ) {
    return getCurrentMember();
  }

  if (
    typeof waitForAuthSession
      !== 'function'
  ) {
    return null;
  }

  const session =
    await waitForAuthSession();

  if (
    session
    && typeof validateMemberSession
      === 'function'
  ) {

    return validateMemberSession(
      session,
      { strict: false }
    );

  }

  return null;

}
