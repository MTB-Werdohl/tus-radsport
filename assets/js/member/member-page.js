async function loadMemberProfilePage() {

  renderMemberProfileLoading();

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (!member) {

    window.setTimeout(() => {

      window.location.href = '/';

    }, 2500);

    return;

  }

  document.title =
    `Mein Profil · MTB Werdohl`;

  renderMemberProfile(member);

  if (
    typeof updateMemberNav === 'function'
  ) {
    updateMemberNav(member);
  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadMemberProfilePage
);
