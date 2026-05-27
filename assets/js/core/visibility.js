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
