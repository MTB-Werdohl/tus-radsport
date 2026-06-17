const SITE_OVERLAY_DISMISS_KEY =
  'siteOverlayDismissedAt';

function escapeSiteContentHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function siteStateKey(name) {

  return window.siteConfig
    ?.siteStateKeys?.[name]
    || name;

}

function parseSiteContentTimestamp(value) {

  if (!value) {
    return null;
  }

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? null
    : time;

}

function isSiteContentScheduleActive(
  payload
) {

  if (!payload?.active) {
    return false;
  }

  const now = Date.now();

  const startsAt =
    parseSiteContentTimestamp(
      payload.starts_at
    );

  const endsAt =
    parseSiteContentTimestamp(
      payload.ends_at
    );

  if (
    startsAt !== null
    && now < startsAt
  ) {
    return false;
  }

  if (
    endsAt !== null
    && now > endsAt
  ) {
    return false;
  }

  return true;

}

function normalizeSiteBanner(value) {

  if (!value) {
    return null;
  }

  return {
    active: value.active === true,
    text: String(value.text || '').trim(),
    url: String(value.url || '').trim(),
    style:
      value.style === 'warning'
        ? 'warning'
        : 'info',
    starts_at: value.starts_at || null,
    ends_at: value.ends_at || null,
    updated_at: value.updated_at || null
  };

}

function normalizeSaisonMode(value) {

  if (!value) {
    return null;
  }

  if (
    value.enabled !== undefined
    || value.banner_text !== undefined
    || value.overlay_text !== undefined
  ) {

    return {
      enabled: value.enabled === true,
      banner_text:
        String(value.banner_text || '').trim(),
      overlay_text:
        String(value.overlay_text || '').trim(),
      updated_at: value.updated_at || null
    };

  }

  const legacyMessage =
    String(value.message || '').trim();

  return {
    enabled: value.mode === 'pause',
    banner_text: legacyMessage,
    overlay_text: legacyMessage,
    updated_at: value.updated_at || null
  };

}

function normalizeLandingHints(value) {

  if (!value?.items) {
    return { items: [] };
  }

  const items =
    (Array.isArray(value.items)
      ? value.items
      : [])
      .map((item) => ({

        text:
          String(item?.text || '').trim(),

        url:
          String(item?.url || '').trim(),

        active:
          item?.active !== false

      }))
      .filter((item) => item.text)
      .slice(0, 5);

  return {
    items,
    updated_at: value.updated_at || null
  };

}

function normalizeSiteOverlay(value) {

  if (!value) {
    return null;
  }

  return {
    active: value.active === true,
    title: String(value.title || '').trim(),
    text: String(value.text || '').trim(),
    dismissible:
      value.dismissible !== false,
    starts_at: value.starts_at || null,
    ends_at: value.ends_at || null,
    updated_at: value.updated_at || null
  };

}

async function fetchSiteStateValue(key) {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.siteState
      )
      .select('value')
      .eq('key', key)
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return data?.value || null;

}

async function saveSiteStateValue(
  key,
  value
) {

  const payload = {
    ...value,
    updated_at:
      new Date().toISOString()
  };

  const { error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.siteState
      )
      .upsert(
        { key, value: payload },
        { onConflict: 'key' }
      );

  if (error) {

    console.error(error);

    return false;

  }

  return true;

}

async function fetchPublicSiteContent() {

  const keys =
    Object.values(
      window.siteConfig.siteStateKeys
    )
      .filter((key) =>
        key !== siteStateKey('lastPush')
      );

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.siteState
      )
      .select('key, value')
      .in('key', keys);

  if (error) {

    console.error(error);

    return {};

  }

  const map = {};

  (data || []).forEach((row) => {

    map[row.key] = row.value;

  });

  return {
    banner: normalizeSiteBanner(
      map[siteStateKey('siteBanner')]
    ),
    saison: normalizeSaisonMode(
      map[siteStateKey('saisonMode')]
    ),
    landingHints: normalizeLandingHints(
      map[siteStateKey('landingHints')]
    ),
    overlay: normalizeSiteOverlay(
      map[siteStateKey('siteOverlay')]
    )
  };

}

async function getSiteBannerState() {

  return normalizeSiteBanner(
    await fetchSiteStateValue(
      siteStateKey('siteBanner')
    )
  );

}

async function saveSiteBannerState(
  payload
) {

  return saveSiteStateValue(
    siteStateKey('siteBanner'),
    normalizeSiteBanner(payload)
      || { active: false, text: '', url: '', style: 'info' }
  );

}

async function getSaisonModeState() {

  return normalizeSaisonMode(
    await fetchSiteStateValue(
      siteStateKey('saisonMode')
    )
  );

}

async function saveSaisonModeState(
  payload
) {

  return saveSiteStateValue(
    siteStateKey('saisonMode'),
    normalizeSaisonMode(payload)
      || {
        enabled: false,
        banner_text: '',
        overlay_text: ''
      }
  );

}

async function getLandingHintsState() {

  return normalizeLandingHints(
    await fetchSiteStateValue(
      siteStateKey('landingHints')
    )
  );

}

async function saveLandingHintsState(
  payload
) {

  return normalizeLandingHints(payload);

}

async function saveLandingHintsToDb(
  payload
) {

  const normalized =
    normalizeLandingHints(payload);

  return saveSiteStateValue(
    siteStateKey('landingHints'),
    normalized
  );

}

async function getSiteOverlayState() {

  return normalizeSiteOverlay(
    await fetchSiteStateValue(
      siteStateKey('siteOverlay')
    )
  );

}

async function saveSiteOverlayState(
  payload
) {

  return saveSiteStateValue(
    siteStateKey('siteOverlay'),
    normalizeSiteOverlay(payload)
      || {
        active: false,
        title: '',
        text: '',
        dismissible: true
      }
  );

}

function isSiteOverlayDismissed(
  overlay
) {

  if (
    !overlay?.dismissible
    || !overlay?.updated_at
  ) {
    return false;
  }

  const dismissedAt =
    localStorage.getItem(
      SITE_OVERLAY_DISMISS_KEY
    );

  if (!dismissedAt) {
    return false;
  }

  return (
    parseSiteContentTimestamp(dismissedAt)
    >= parseSiteContentTimestamp(
      overlay.updated_at
    )
  );

}

function markSiteOverlayDismissed(
  overlay
) {

  const stamp =
    overlay?.updated_at
    || new Date().toISOString();

  localStorage.setItem(
    SITE_OVERLAY_DISMISS_KEY,
    stamp
  );

}
