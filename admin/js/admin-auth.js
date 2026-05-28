async function ensureVorstandSession(
  options = {}
) {

  const session =
    await waitForAuthSession(
      options.timeoutMs
    );

  if (!session?.user?.email) {
    return null;
  }

  const member =
    await fetchMemberByEmail(
      session.user.email
    );

  if (!member || !isVorstand(member)) {
    return null;
  }

  return member;

}
