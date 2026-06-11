function escapeActivityCardHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatActivityLocation(activity) {

  const location =
    String(activity?.start_location || '')
      .trim();

  return location || '—';

}

function memberStubFromActivityEntry(entry) {

  const fullName =
    String(entry?.member_name || '')
      .trim();

  const parts =
    fullName.split(/\s+/)
      .filter(Boolean);

  return {
    member_name: fullName,
    vorname: parts[0] || '',
    nachname: parts.slice(1).join(' '),
    avatar_url: entry?.avatar_url || null
  };

}

function renderActivityMemberAvatar(
  entry,
  sizeClass
) {

  if (
    typeof renderMemberAvatarHtml
      !== 'function'
  ) {
    return '';
  }

  try {

    return renderMemberAvatarHtml(
      memberStubFromActivityEntry(entry),
      sizeClass || 'member-avatar--md'
    );

  } catch (error) {

    console.error(error);

    return '';

  }

}

function decodeActivityPolyline(encoded) {

  if (!encoded) {
    return [];
  }

  let index = 0;
  const length = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < length) {

    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat =
      (result & 1)
        ? ~(result >> 1)
        : (result >> 1);

    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng =
      (result & 1)
        ? ~(result >> 1)
        : (result >> 1);

    lng += deltaLng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });

  }

  return coordinates;

}

function renderActivityMapHtml(
  polyline,
  options = {}
) {

  const points =
    decodeActivityPolyline(polyline);

  if (points.length < 2) {
    return '';
  }

  const width =
    Number(options.width) || 400;

  const height =
    Number(options.height) || 120;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  points.forEach((point) => {

    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);

  });

  const padX = width * 0.08;
  const padY = height * 0.14;
  const innerWidth = width - (padX * 2);
  const innerHeight = height - (padY * 2);
  const latSpan = maxLat - minLat || 0.00001;
  const lngSpan = maxLng - minLng || 0.00001;

  const path =
    points.map((point, index) => {

      const x =
        padX
        + (
          (point.lng - minLng)
          / lngSpan
        ) * innerWidth;

      const y =
        padY
        + (
          (maxLat - point.lat)
          / latSpan
        ) * innerHeight;

      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;

    }).join(' ');

  const mapClass =
    options.detail
      ? 'aktivitaeten-detail-map'
      : 'aktivitaeten-card-map';

  return `
<div class="${mapClass}" aria-hidden="true">
  <svg
    viewBox="0 0 ${width} ${height}"
    preserveAspectRatio="xMidYMid meet"
    role="presentation">
    <path
      d="${path}"
      class="aktivitaeten-map-path"
      fill="none" />
  </svg>
</div>
  `;

}

function renderActivityStatsHtml(
  activity,
  escapeHtml
) {

  const escape =
    escapeHtml || escapeActivityCardHtml;

  return `
<dl class="aktivitaeten-stats">

  <div>
    <dt>Distanz</dt>
    <dd>${escape(
      typeof formatActivityDistance === 'function'
        ? formatActivityDistance(activity.distance_m)
        : '—'
    )}</dd>
  </div>

  <div>
    <dt>Höhenmeter</dt>
    <dd>${escape(
      typeof formatActivityElevation === 'function'
        ? formatActivityElevation(activity.elevation_gain_m)
        : '—'
    )}</dd>
  </div>

  <div>
    <dt>Zeit</dt>
    <dd>${escape(
      typeof formatActivityDuration === 'function'
        ? formatActivityDuration(activity.moving_time_s)
        : '—'
    )}</dd>
  </div>

</dl>
  `;

}

function renderActivityCardHtml(
  activity,
  options = {}
) {

  const escape =
    options.escapeHtml || escapeActivityCardHtml;

  const title =
    activity?.activity_name
    || 'Aktivität';

  const memberName =
    options.memberName
    || activity?.member_name
    || 'Mitglied';

  const avatarHtml =
    options.avatarHtml
    ?? renderActivityMemberAvatar(
      options.avatarEntry || activity,
      'member-avatar--md'
    );

  const timeLabel =
    typeof formatActivityDateTime === 'function'
      ? formatActivityDateTime(activity.start_date)
      : '—';

  const locationLabel =
    formatActivityLocation(activity);

  const statsHtml =
    renderActivityStatsHtml(activity, escape);

  const mapHtml =
    renderActivityMapHtml(
      activity.map_summary_polyline,
      options.mapOptions || {}
    );

  const badgeHtml =
    options.badgeHtml || '';

  const url =
    options.url || null;

  const extraClass =
    options.extraClass || '';

  const wrapperTag =
    url ? 'a' : 'div';

  const wrapperClass =
    url
      ? 'aktivitaeten-card-link'
      : 'aktivitaeten-card-inner';

  const wrapperAttrs =
    url
      ? ` href="${escape(url)}"`
      : '';

  return `
<article class="aktivitaeten-card${extraClass ? ` ${extraClass}` : ''}">

  <${wrapperTag}
    class="${wrapperClass}"${wrapperAttrs}>

    <div class="aktivitaeten-card-layout">

      <div class="aktivitaeten-card-avatar">
        ${avatarHtml}
      </div>

      <p class="aktivitaeten-card-member-name">
        ${escape(memberName)}
      </p>

      <p class="aktivitaeten-card-meta-line">
        <span class="aktivitaeten-card-time">
          ${escape(timeLabel)}
        </span>
        <span class="aktivitaeten-card-sep" aria-hidden="true">·</span>
        <span class="aktivitaeten-card-location">
          ${escape(locationLabel)}
        </span>
      </p>

      <div class="aktivitaeten-card-body">

        <h3 class="aktivitaeten-card-title">
          ${escape(title)}${badgeHtml}
        </h3>

        ${statsHtml}
        ${mapHtml}

      </div>

    </div>

  </${wrapperTag}>

</article>
  `;

}
