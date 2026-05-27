async function loadMemberProfilePage() {

  renderMemberProfileLoading();

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (!member) {

    renderMemberProfileError(
      MEMBER_ERROR_NOT_FOUND
    );

    window.setTimeout(() => {

      window.location.href = '/';

    }, 2500);

    return;

  }

  document.title =
    `Mein Profil · MTB Werdohl`;

  renderMemberProfile(member);

}

document.addEventListener(
  'DOMContentLoaded',
  loadMemberProfilePage
);
