const ADMIN_PREVIEW_ROLE_KEY =
  'adminPreviewRole';

const ADMIN_PREVIEW_ROLE_PUBLIC =
  'public';

const ADMIN_PREVIEW_ROLE_MITGLIED =
  'Mitglied';

function getAdminPreviewRole() {

  try {

    return sessionStorage.getItem(
      ADMIN_PREVIEW_ROLE_KEY
    ) || null;

  } catch (error) {

    return null;

  }

}

function setAdminPreviewRole(role) {

  sessionStorage.setItem(
    ADMIN_PREVIEW_ROLE_KEY,
    role
  );

}

function clearAdminPreviewRole() {

  sessionStorage.removeItem(
    ADMIN_PREVIEW_ROLE_KEY
  );

}

function isAdminPreviewActive() {

  const role =
    getAdminPreviewRole();

  return (
    role === ADMIN_PREVIEW_ROLE_PUBLIC
    || role === ADMIN_PREVIEW_ROLE_MITGLIED
  );

}

function getAdminPreviewRoleLabel() {

  const role =
    getAdminPreviewRole();

  if (role === ADMIN_PREVIEW_ROLE_PUBLIC) {
    return 'Public (nicht angemeldet)';
  }

  if (role === ADMIN_PREVIEW_ROLE_MITGLIED) {
    return 'Mitglied';
  }

  return '';

}

function isRealVorstand(member) {

  if (!member?.rolle) {
    return false;
  }

  return member.rolle.trim().toLowerCase()
    === 'vorstand';

}

function canStartAdminPreview(member) {

  return isRealVorstand(member);

}

function getViewerMember(member) {

  const preview =
    getAdminPreviewRole();

  if (preview === ADMIN_PREVIEW_ROLE_PUBLIC) {
    return null;
  }

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

function dispatchAdminPreviewChanged() {

  window.dispatchEvent(
    new CustomEvent('admin-preview-changed')
  );

}
