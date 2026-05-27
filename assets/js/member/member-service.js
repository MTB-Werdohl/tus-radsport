async function fetchMemberByEmail(email) {

  const normalized =
    email.trim().toLowerCase();

  const trimmed =
    email.trim();

  const table =
    window.siteConfig.tables.members;

  const attempts = [

    () =>
      window.supabaseClient
        .from(table)
        .select('*')
        .eq('email', normalized)
        .maybeSingle(),

    () =>
      window.supabaseClient
        .from(table)
        .select('*')
        .eq('email', trimmed)
        .maybeSingle(),

    () =>
      window.supabaseClient
        .from(table)
        .select('*')
        .filter('email', 'ilike', trimmed)
        .maybeSingle()

  ];

  for (const attempt of attempts) {

    const { data, error } =
      await attempt();

    if (error) {

      console.error(
        'Member lookup:',
        error
      );

      continue;

    }

    if (data) {

      return normalizeMemberRow(data);

    }

  }

  return null;

}

function normalizeMemberRow(row) {

  if (!row) {
    return null;
  }

  return {

    email:
      row.email ||
      row.Email ||
      '',

    vorname:
      row.vorname ||
      row.Vorname ||
      '',

    nachname:
      row.nachname ||
      row.Nachname ||
      '',

    mitgliedsnummer:
      row.mitgliedsnummer ||
      row.Mitgliedsnummer ||
      row.mitglieds_nr ||
      '',

    abteilung:
      row.abteilung ||
      row.Abteilung ||
      '',

    wohnort:
      row.wohnort ||
      row.Wohnort ||
      '',

    geburtsdatum:
      row.geburtsdatum ||
      row.Geburtsdatum ||
      ''

  };

}

async function fetchMemberProfile() {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  if (!session?.user?.email) {
    return null;
  }

  return fetchMemberByEmail(
    session.user.email
  );

}
