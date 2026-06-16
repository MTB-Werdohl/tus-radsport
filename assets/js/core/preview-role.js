function isRealVorstand(member) {

  if (!member?.rolle) {
    return false;
  }

  return member.rolle.trim().toLowerCase()
    === 'vorstand';

}

function isAdminPreviewActive() {

  return false;

}

function getViewerMember(member) {

  if (member) {
    return member;
  }

  if (
    typeof getCurrentMember === 'function'
  ) {
    return getCurrentMember();
  }

  return null;

}

function syncContentViewerMember() {

  const member =
    typeof getCurrentMember === 'function'
      ? getCurrentMember()
      : null;

  window.contentViewerMember =
    getViewerMember(member);

  if (
    typeof updateMemberNav === 'function'
  ) {

    updateMemberNav(
      getViewerMember(member)
    );

  }

}
