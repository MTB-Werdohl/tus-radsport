const MEMBER_ROLE_VORSTAND =
  'Vorstand';

const MEMBER_ROLE_MITGLIED =
  'Mitglied';

const MEMBER_ROLE_PUBLIC =
  'public';

function escapeMemberHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function isVorstand(member) {

  if (
    typeof isAdminPreviewActive === 'function'
    && isAdminPreviewActive()
  ) {
    return false;
  }

  if (
    typeof isRealVorstand === 'function'
  ) {
    return isRealVorstand(member);
  }

  if (!member?.rolle) {
    return false;
  }

  return member.rolle.trim().toLowerCase()
    === MEMBER_ROLE_VORSTAND.toLowerCase();

}

function isClubMember(member) {

  const preview =
    typeof getAdminPreviewRole === 'function'
      ? getAdminPreviewRole()
      : null;

  if (preview === 'public') {
    return false;
  }

  if (preview === 'Mitglied') {
    return true;
  }

  if (!member?.id) {
    return false;
  }

  if (!member.rolle) {
    return true;
  }

  const role =
    member.rolle.trim().toLowerCase();

  return (
    role === MEMBER_ROLE_MITGLIED.toLowerCase()
    || role === MEMBER_ROLE_VORSTAND.toLowerCase()
  );

}

function isPublicParticipant(member) {

  if (!member?.rolle) {
    return false;
  }

  if (isAnonymizedMember(member)) {
    return false;
  }

  return member.rolle.trim().toLowerCase()
    === MEMBER_ROLE_PUBLIC;

}

function isAnonymizedMember(member) {

  return !!member?.anonymized_at;

}

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
        .is('anonymized_at', null)
        .limit(1)
        .maybeSingle(),

    () =>
      window.supabaseClient
        .from(table)
        .select('*')
        .eq('email', trimmed)
        .is('anonymized_at', null)
        .limit(1)
        .maybeSingle(),

    () =>
      window.supabaseClient
        .from(table)
        .select('*')
        .filter('email', 'ilike', trimmed)
        .is('anonymized_at', null)
        .limit(1)
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

    id: row.id,

    mitgliedsnummer:
      row.mitgliedsnummer || '',

    vorname:
      row.vorname || '',

    nachname:
      row.nachname || '',

    abteilung:
      row.abteilung || '',

    strasse:
      row.strasse || '',

    hausnummer:
      row.hausnummer || '',

    plz:
      row.plz || '',

    wohnort:
      row.wohnort || '',

    geburtsdatum:
      row.geburtsdatum || '',

    email:
      row.email || '',

    telefonnummer:
      row.telefonnummer || '',

    einwilligung_kontakt:
      row.einwilligung_kontakt === true,

    kontakt_eingewilligt_am:
      row.kontakt_eingewilligt_am || '',

    kontakt_widerrufen_am:
      row.kontakt_widerrufen_am || '',

    einwilligung_bilder:
      row.einwilligung_bilder === true,

    bilder_eingewilligt_am:
      row.bilder_eingewilligt_am || '',

    bilder_widerrufen_am:
      row.bilder_widerrufen_am || '',

    rolle:
      row.rolle || MEMBER_ROLE_MITGLIED,

    anonymized_at:
      row.anonymized_at || null,

    last_change_summary_seen_at:
      row.last_change_summary_seen_at || null

  };

}

async function updateMemberContactFields(
  memberId,
  fields
) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .update({
        strasse: fields.strasse || null,
        hausnummer: fields.hausnummer || null,
        plz: fields.plz || null,
        wohnort: fields.wohnort || null,
        telefonnummer: fields.telefonnummer || null
      })
      .eq('id', memberId)
      .select('*')
      .single();

  if (error) {
    throw error;
  }

  return normalizeMemberRow(data);

}

async function grantMemberConsent(
  memberId,
  kind,
  member
) {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  let payload = null;

  if (kind === 'kontakt') {

    if (member.einwilligung_kontakt) {
      return null;
    }

    payload = {
      einwilligung_kontakt: true,
      kontakt_eingewilligt_am: today
    };

  }

  if (kind === 'bilder') {

    if (member.einwilligung_bilder) {
      return null;
    }

    payload = {
      einwilligung_bilder: true,
      bilder_eingewilligt_am: today
    };

  }

  if (!payload) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .update(payload)
      .eq('id', memberId)
      .select('*')
      .single();

  if (error) {
    throw error;
  }

  return normalizeMemberRow(data);

}

async function revokeMemberConsent(
  memberId,
  kind,
  member
) {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  let payload = null;

  if (kind === 'kontakt') {

    if (!member?.einwilligung_kontakt) {
      return null;
    }

    payload = {
      einwilligung_kontakt: false,
      kontakt_widerrufen_am: today
    };

  }

  if (kind === 'bilder') {

    if (!member?.einwilligung_bilder) {
      return null;
    }

    payload = {
      einwilligung_bilder: false,
      bilder_widerrufen_am: today
    };

  }

  if (!payload) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .update(payload)
      .eq('id', memberId)
      .select('*')
      .single();

  if (error) {
    throw error;
  }

  return normalizeMemberRow(data);

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
