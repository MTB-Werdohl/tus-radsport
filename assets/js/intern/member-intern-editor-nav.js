function getMemberInternEditorUrl(
  options = {}
) {

  const params =
    new URLSearchParams();

  if (options.id) {
    params.set(
      'id',
      String(options.id)
    );
  }

  const query =
    params.toString();

  return query
    ? `/intern-bearbeiten/?${query}`
    : '/intern-bearbeiten/';

}

function shouldUseMemberInternEditorNavigation() {

  return window.matchMedia(
    '(max-width: 900px)'
  ).matches;

}

function openMemberInternEditorPopup(
  options = {}
) {

  const url =
    getMemberInternEditorUrl(options);

  if (shouldUseMemberInternEditorNavigation()) {

    window.location.href = url;

    return null;

  }

  const features =
    'popup=yes,width=960,height=920,'
    + 'menubar=no,toolbar=no,location=no,'
    + 'status=no,scrollbars=yes,resizable=yes';

  const popup =
    window.open(
      url,
      'mtbInternEditor',
      features
    );

  if (popup) {
    popup.focus();
    return popup;
  }

  window.location.href = url;

  return null;

}
