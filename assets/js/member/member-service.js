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
      row.strava_sync_enabled === true,

    avatar_storage_path:
      row.avatar_storage_path || null,

    avatar_updated_at:
      row.avatar_updated_at || null,

    avatar_source:
      row.avatar_source || null,

    avatar_consent_at:
      row.avatar_consent_at || null,

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

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const datePart =
    typeof formatDateLong === 'function'
      ? formatDateLong(
        date.toISOString().slice(0, 10)
      )
      : date.toLocaleDateString('de-DE');

  const hours =
    String(date.getHours())
      .padStart(2, '0');

  const minutes =
    String(date.getMinutes())
      .padStart(2, '0');

  return `${datePart} ${hours}:${minutes}`;

}

function formatStravaStatusLabel(status) {

  const syncStatus =
    status?.syncStatus || '';

  if (syncStatus === 'active') {
    return '✓ Aktiv';
  }

  if (syncStatus === 'syncing') {
    return 'Import läuft …';
  }

  if (syncStatus === 'error') {
    return 'Fehler';
  }

  if (syncStatus === 'pending') {
    return 'Wird vorbereitet …';
  }

  return '—';

}

function stravaNeedsRetry(status) {

  if (!status?.connected) {
    return false;
  }

  if (status.syncStatus === 'error') {
    return true;
  }

  if (
    !status.initialSyncCompleted
    && status.syncStatus === 'pending'
  ) {
    return true;
  }

  return false;

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
      importedActivityCount:
        Number(data.imported_activity_count) || 0,
      syncStatus: data.sync_status || null,
      syncErrorMessage:
        data.sync_error_message || null,
      initialSyncCompleted:
        data.initial_sync_completed === true,
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
    importedActivityCount:
      Number(data.imported_activity_count) || 0,
    syncStatus: data.sync_status || null,
    syncErrorMessage:
      data.sync_error_message || null,
    initialSyncCompleted:
      data.initial_sync_completed === true,
    publishFeed: data.publish_feed === true,
    publishRankings: data.publish_rankings === true,
    contributeToClubGoals:
      data.contribute_to_club_goals === true,
    syncEnabled: data.strava_sync_enabled === true
  };

}

async function fetchMemberActivities(
  limit = 100
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_member_activities',
      {
        p_limit: limit
      }
    );

  if (error) {

    const message =
      String(error.message || '');

    if (
      message.includes('Could not find the function')
      || error.code === 'PGRST202'
    ) {
      throw new Error(
        'Aktivitäten sind serverseitig noch nicht eingerichtet. '
        + 'Im Supabase SQL Editor docs/supabase-strava-member-activities.sql ausführen.'
      );
    }

    throw error;

  }

  const activities =
    Array.isArray(data?.activities)
      ? data.activities
      : (
        data?.activities
        && typeof data.activities === 'object'
          ? Object.values(data.activities)
          : []
      );

  return {
    publishFeed: data?.publish_feed === true,
    feedDays:
      Number(data?.feed_days) || 90,
    activities
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

async function retryStravaSync() {

  const functionSlug =
    window.siteConfig.functions.stravaSync;

  const data =
    await callMemberEdgeFunction(
      functionSlug,
      { retry: true }
    );

  return {
    ok: data?.ok === true,
    started: data?.started === true,
    message:
      data?.message
      || (
        data?.ok
          ? 'Synchronisierung erneut gestartet.'
          : 'Synchronisierung fehlgeschlagen.'
      )
  };

}

async function requestStravaSync() {

  return retryStravaSync();

}

function sleep(ms) {

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

}

async function waitForStravaSyncCompletion(
  previousState,
  maxWaitMs = 120000
) {

  const startedAt = Date.now();
  const previousSyncAt =
    previousState?.lastSyncAt || null;
  const wasCompleted =
    previousState?.initialSyncCompleted === true;

  while (Date.now() - startedAt < maxWaitMs) {

    await sleep(3000);

    const profile =
      await fetchStravaProfileStatus();

    const status =
      profile?.status || {};

    if (status.syncStatus === 'error') {
      return {
        completed: false,
        error:
          status.syncErrorMessage
          || 'Synchronisation fehlgeschlagen.'
      };
    }

    if (
      status.syncStatus === 'active'
      && (
        status.initialSyncCompleted
        || (
          status.lastSyncAt
          && status.lastSyncAt !== previousSyncAt
        )
      )
    ) {
      return {
        completed: true,
        status
      };
    }

    if (
      wasCompleted
      && status.syncStatus === 'active'
      && status.lastSyncAt
      && status.lastSyncAt !== previousSyncAt
    ) {
      return {
        completed: true,
        status
      };
    }

  }

  return {
    completed: false,
    status: null
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

function buildMemberInitials(
  vorname,
  nachname
) {

  const first =
    String(vorname || '')
      .trim()
      .charAt(0);

  const last =
    String(nachname || '')
      .trim()
      .charAt(0);

  const initials =
    (first + last).toUpperCase();

  return initials || '?';

}

function getAvatarPublicUrl(
  storagePath,
  updatedAt
) {

  if (!storagePath) {
    return null;
  }

  const bucket =
    window.siteConfig?.storage?.avatars
    || 'avatars';

  const { data } =
    window.supabaseClient
      .storage
      .from(bucket)
      .getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    return null;
  }

  if (updatedAt) {

    const timestamp =
      new Date(updatedAt).getTime();

    if (!Number.isNaN(timestamp)) {
      return `${data.publicUrl}?t=${timestamp}`;
    }

  }

  return data.publicUrl;

}

const getMemberAvatarPublicUrl =
  getAvatarPublicUrl;

function renderMemberAvatarHtml(
  member,
  sizeClass
) {

  const size =
    sizeClass || 'member-avatar--md';

  const name =
    [
      member?.vorname,
      member?.nachname
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  const url =
    member?.avatar_url
    || getAvatarPublicUrl(
      member?.avatar_storage_path,
      member?.avatar_updated_at
    );

  if (url) {

    const alt =
      name
        ? `Profilbild von ${name}`
        : 'Profilbild';

    return `
<span class="member-avatar ${size}">
  <img
    src="${escapeMemberHtml(url)}"
    alt="${escapeMemberHtml(alt)}"
    loading="lazy"
    decoding="async">
</span>
    `.trim();

  }

  const initials =
    buildMemberInitials(
      member?.vorname,
      member?.nachname
    );

  return `
<span
  class="member-avatar member-avatar--initials ${size}"
  aria-hidden="true"
  title="${escapeMemberHtml(name || 'Mitglied')}">

  ${escapeMemberHtml(initials)}

</span>
  `.trim();

}

function loadImageFromFile(
  file
) {

  return new Promise((resolve, reject) => {

    const url =
      URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {

      URL.revokeObjectURL(url);
      resolve(image);

    };

    image.onerror = () => {

      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht gelesen werden.'));

    };

    image.src = url;

  });

}

async function resizeAvatarFileToWebp(
  file,
  maxSize
) {

  const limit =
    maxSize || 512;

  const image =
    await loadImageFromFile(file);

  const sourceWidth =
    image.naturalWidth
    || image.width;

  const sourceHeight =
    image.naturalHeight
    || image.height;

  if (
    !sourceWidth
    || !sourceHeight
  ) {
    throw new Error('Ungültige Bildgröße.');
  }

  const cropSize =
    Math.min(
      sourceWidth,
      sourceHeight
    );

  const sourceX =
    Math.floor(
      (sourceWidth - cropSize) / 2
    );

  const sourceY =
    Math.floor(
      (sourceHeight - cropSize) / 2
    );

  const canvas =
    document.createElement('canvas');

  canvas.width = limit;
  canvas.height = limit;

  const context =
    canvas.getContext('2d');

  if (!context) {
    throw new Error('Bildverarbeitung nicht verfügbar.');
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    limit,
    limit
  );

  const blob =
    await new Promise((resolve, reject) => {

      canvas.toBlob(
        (result) => {

          if (!result) {
            reject(new Error('Bild konnte nicht konvertiert werden.'));
            return;
          }

          resolve(result);

        },
        'image/webp',
        0.82
      );

    });

  return blob;

}

async function uploadMemberAvatar(
  file,
  memberId
) {

  if (!file || !memberId) {
    throw new Error('Kein Bild oder kein Mitglied.');
  }

  if (
    file.size
    > 2 * 1024 * 1024
  ) {
    throw new Error('Das Bild darf maximal 2 MB groß sein.');
  }

  const blob =
    await resizeAvatarFileToWebp(file);

  const bucket =
    window.siteConfig?.storage?.avatars
    || 'avatars';

  const path =
    `${memberId}/avatar.webp`;

  const { error: uploadError } =
    await window.supabaseClient.storage
      .from(bucket)
      .upload(
        path,
        blob,
        {
          upsert: true,
          contentType: 'image/webp',
          cacheControl: '3600'
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  const nowIso =
    new Date().toISOString();

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .update({
        avatar_storage_path: path,
        avatar_updated_at: nowIso,
        avatar_source: 'upload',
        avatar_consent_at: nowIso
      })
      .eq('id', memberId)
      .select('*')
      .single();

  if (error) {
    throw error;
  }

  return normalizeMemberRow(data);

}

async function removeMemberAvatar(
  member
) {

  if (!member?.id) {
    throw new Error('Kein Mitglied.');
  }

  const bucket =
    window.siteConfig?.storage?.avatars
    || 'avatars';

  if (member.avatar_storage_path) {

    const { error: removeError } =
      await window.supabaseClient.storage
        .from(bucket)
        .remove([member.avatar_storage_path]);

    if (removeError) {
      throw removeError;
    }

  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.members)
      .update({
        avatar_storage_path: null,
        avatar_updated_at: null,
        avatar_source: null,
        avatar_consent_at: null
      })
      .eq('id', member.id)
      .select('*')
      .single();

  if (error) {
    throw error;
  }

  return normalizeMemberRow(data);

}
