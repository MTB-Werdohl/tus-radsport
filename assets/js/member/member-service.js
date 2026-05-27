async function fetchMemberByEmail(email) {

  const normalized =
    email.trim().toLowerCase();

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .select('*')
      .ilike('email', normalized)
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return data;

}

async function fetchMemberProfile() {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  if (!session?.user?.email) {
    return null;
  }

  return fetchMemberByEmail(session.user.email);

}
