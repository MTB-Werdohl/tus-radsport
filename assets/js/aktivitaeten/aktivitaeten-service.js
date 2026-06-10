function getActivityFeedDays() {

  const days =
    Number(
      window.siteConfig?.strava?.feedDays
    );

  if (
    Number.isFinite(days)
    && days > 0
    && days <= 365
  ) {
    return Math.floor(days);
  }

  return 90;

}

function getCurrentStatsPeriod() {

  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };

}

async function fetchPublicActivityFeed() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_public_activity_feed',
      {
        p_days: getActivityFeedDays()
      }
    );

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    return Object.values(data);
  }

  return [];

}

async function fetchPublicActivityDetail(
  activityId
) {

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_public_activity_detail',
      {
        p_activity_id: activityId,
        p_days: getActivityFeedDays()
      }
    );

  if (error) {
    throw error;
  }

  return data || null;

}

async function fetchPublicMemberRankings(
  year,
  month
) {

  const args = {
    p_year: year
  };

  if (
    month !== null
    && month !== undefined
  ) {
    args.p_month = month;
  }

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_public_member_rankings',
      args
    );

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    return Object.values(data);
  }

  return [];

}

async function fetchPublicClubStats(
  year,
  month
) {

  const args = {
    p_year: year
  };

  if (
    month !== null
    && month !== undefined
  ) {
    args.p_month = month;
  }

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_public_club_stats',
      args
    );

  if (error) {
    throw error;
  }

  return data || null;

}

function formatActivityTypeLabel(type) {

  const key =
    String(type || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');

  const labels = {
    ride: 'Radfahren',
    virtualride: 'Radfahren (indoor)',
    ebikeride: 'E-Bike',
    gravelride: 'Gravel',
    mountainbikeride: 'Mountainbike',
    run: 'Laufen',
    walk: 'Gehen',
    hike: 'Wandern',
    swim: 'Schwimmen',
    workout: 'Training',
    weighttraining: 'Krafttraining'
  };

  if (labels[key]) {
    return labels[key];
  }

  if (!type) {
    return 'Aktivität';
  }

  return String(type);

}

function formatActivityDistance(
  meters
) {

  const value =
    Number(meters) || 0;

  if (value <= 0) {
    return '—';
  }

  const km =
    value / 1000;

  return (
    km.toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
    + ' km'
  );

}

function formatActivityElevation(
  meters
) {

  const value =
    Math.round(Number(meters) || 0);

  if (value <= 0) {
    return '—';
  }

  return (
    value.toLocaleString('de-DE')
    + ' m'
  );

}

function formatActivityDuration(
  seconds
) {

  const total =
    Number(seconds) || 0;

  if (total <= 0) {
    return '—';
  }

  const hours =
    Math.floor(total / 3600);

  const minutes =
    Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')} h`;
  }

  return `${minutes} min`;

}

function formatActivityDateTime(
  value
) {

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

  return `${datePart}, ${hours}:${minutes} Uhr`;

}

function formatGermanMonthYear(
  year,
  month
) {

  const date =
    new Date(year, month - 1, 1);

  return date.toLocaleDateString(
    'de-DE',
    {
      month: 'long',
      year: 'numeric'
    }
  );

}
