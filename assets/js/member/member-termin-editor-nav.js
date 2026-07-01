function getMemberTerminEditorUrl(
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
    ? `/termin-bearbeiten/?${query}`
    : '/termin-bearbeiten/';

}

function shouldUseMemberTerminEditorNavigation() {

  return window.matchMedia(
    '(max-width: 900px)'
  ).matches;

}

function openMemberTerminEditorPopup(
  options = {}
) {

  const url =
    getMemberTerminEditorUrl(options);

  if (shouldUseMemberTerminEditorNavigation()) {

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
      'mtbTerminEditor',
      features
    );

  if (popup) {
    popup.focus();
    return popup;
  }

  window.location.href = url;

  return null;

}
