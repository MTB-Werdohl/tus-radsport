const MEMBER_ROLE_VORSTAND =
  'Vorstand';

const MEMBER_ROLE_MITGLIED =
  'Mitglied';

const MEMBER_ROLE_PUBLIC =
  'public';

function isVorstand(member) {

  if (!member?.rolle) {
    return false;
  }

  return member.rolle.trim().toLowerCase()
    === MEMBER_ROLE_VORSTAND.toLowerCase();

}

function isClubMember(member) {

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

    einwilligung_bilder:
      row.einwilligung_bilder === true,

    bilder_eingewilligt_am:
      row.bilder_eingewilligt_am || '',

    rolle:
      row.rolle || MEMBER_ROLE_MITGLIED,

    anonymized_at:
      row.anonymized_at || null,

    strava_connected_at:
      row.strava_connected_at || null,

    publish_feed:
      row.publish_feed === true,

    publish_rankings:
      row.publish_rankings === true,

    contribute_to_club_goals:
      row.contribute_to_club_goals === true,

    strava_sync_enabled:
      row.strava_sync_enabled === true

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

function formatStravaDateTime(value) {

  if (
    !value
    || typeof formatDateLong !== 'function'
  ) {
    return '—';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return formatDateLong(
    date.toISOString().slice(0, 10)
  );

}

async function fetchStravaProfileStatus() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_strava_profile_status'
    );

  if (error) {

    const message =
      String(error.message || '');

    if (
      message.includes('Could not find the function')
      || error.code === 'PGRST202'
    ) {

      return {
        available: false,
        error: new Error(
          'Strava ist serverseitig noch nicht eingerichtet. '
          + 'Im Supabase SQL Editor docs/supabase-strava.sql ausführen.'
        )
      };

    }

    if (
      message.includes('Nur Vereinsmitglieder')
    ) {
      return {
        available: false,
        error: error
      };

    }

    console.error(error);

    return {
      available: false,
      error: error
    };

  }

  return {
    available: true,
    status: {
      connected: data.connected === true,
      displayName:
        String(data.display_name || '').trim(),
      connectedAt: data.connected_at || null,
      lastSyncAt: data.last_sync_at || null,
      publishFeed: data.publish_feed === true,
      publishRankings: data.publish_rankings === true,
      contributeToClubGoals:
        data.contribute_to_club_goals === true,
      syncEnabled: data.strava_sync_enabled === true
    }
  };

}

async function updateStravaVisibility(
  flags
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'update_strava_visibility',
      {
        p_publish_feed:
          flags.publishFeed === true,
        p_publish_rankings:
          flags.publishRankings === true,
        p_contribute_to_club_goals:
          flags.contributeToClubGoals === true
      }
    );

  if (error) {
    throw error;
  }

  return {
    connected: data.connected === true,
    displayName:
      String(data.display_name || '').trim(),
    connectedAt: data.connected_at || null,
    lastSyncAt: data.last_sync_at || null,
    publishFeed: data.publish_feed === true,
    publishRankings: data.publish_rankings === true,
    contributeToClubGoals:
      data.contribute_to_club_goals === true,
    syncEnabled: data.strava_sync_enabled === true
  };

}

async function disconnectStravaAccount() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'disconnect_strava'
    );

  if (error) {
    throw error;
  }

  return data;

}

async function requestStravaSync() {

  const functionSlug =
    window.siteConfig.functions.stravaSync;

  const data =
    await callMemberEdgeFunction(
      functionSlug
    );

  return {
    ok: data?.ok === true,
    started: data?.started === true,
    message:
      data?.message
      || (
        data?.ok
          ? 'Synchronisation abgeschlossen.'
          : 'Synchronisation fehlgeschlagen.'
      ),
    imported: data?.imported ?? null,
    last_sync_at: data?.last_sync_at ?? null
  };

}

function sleep(ms) {

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

}

async function waitForStravaSyncCompletion(
  previousLastSyncAt,
  maxWaitMs = 120000
) {

  const startedAt = Date.now();
  const previous =
    previousLastSyncAt || null;

  while (Date.now() - startedAt < maxWaitMs) {

    await sleep(3000);

    const profile =
      await fetchStravaProfileStatus();

    const lastSyncAt =
      profile?.status?.lastSyncAt || null;

    if (
      lastSyncAt
      && lastSyncAt !== previous
    ) {
      return {
        completed: true,
        lastSyncAt
      };
    }

  }

  return {
    completed: false,
    lastSyncAt: null
  };

}

async function readEdgeFunctionError(
  error
) {

  if (
    typeof readFunctionInvokeError
      === 'function'
  ) {

    const payload =
      await readFunctionInvokeError(error);

    if (payload?.error) {
      return payload.error;
    }

  }

  return error?.message || null;

}

async function callMemberEdgeFunction(
  functionSlug,
  body
) {

  const { data: { session } } =
    await window.supabaseClient.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Nicht angemeldet.');
  }

  const invokeResult =
    await window.supabaseClient.functions.invoke(
      functionSlug,
      { body: body || {} }
    );

  if (!invokeResult.error) {

    if (invokeResult.data?.error) {
      throw new Error(invokeResult.data.error);
    }

    return invokeResult.data;

  }

  const message =
    await readEdgeFunctionError(
      invokeResult.error
    );

  const transportFailed =
    typeof isEdgeFunctionTransportError
      === 'function'
    && isEdgeFunctionTransportError(
      message || invokeResult.error.message
    );

  if (transportFailed) {

    const response =
      await fetch(
        getFunctionUrl(functionSlug),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              `Bearer ${session.access_token}`,
            apikey:
              window.siteConfig.supabaseAnonKey
          },
          body: JSON.stringify(body || {})
        }
      );

    const result =
      typeof readFunctionFetchResult
        === 'function'
        ? await readFunctionFetchResult(response)
        : { error: new Error('Unbekannter Fehler') };

    if (result?.error) {
      throw result.error;
    }

    return result.data;

  }

  throw new Error(
    (
      typeof formatEdgeFunctionTransportError
        === 'function'
      && isEdgeFunctionTransportError(
        message
        || invokeResult.error.message
      )
    )
      ? formatEdgeFunctionTransportError(functionSlug)
      : (
        message
        || invokeResult.error.message
        || 'Server-Funktion fehlgeschlagen.'
      )
  );

}

async function beginStravaConnect() {

  const functionSlug =
    window.siteConfig.functions.stravaOAuthStart;

  const data =
    await callMemberEdgeFunction(
      functionSlug
    );

  if (!data?.url) {
    throw new Error(
      'Keine Strava-Weiterleitung erhalten.'
    );
  }

  window.location.href = data.url;

}
