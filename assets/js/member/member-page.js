async function loadMemberProfilePage() {

  renderMemberProfileLoading();

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (!member) {

    window.setTimeout(() => {

      window.location.href = '/';

    }, 1500);

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
