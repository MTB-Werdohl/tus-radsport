function escapeActivityCardHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatActivityLocation(activity) {

  return String(activity?.start_location || '')
    .trim();

}

function renderActivityMetaLineHtml(
  activity,
  escapeHtml
) {

  const escape =
    escapeHtml || escapeActivityCardHtml;

  const timeLabel =
    typeof formatActivityCardDateTime === 'function'
      ? formatActivityCardDateTime(activity.start_date)
      : (
        typeof formatActivityDateTime === 'function'
          ? formatActivityDateTime(activity.start_date)
          : '—'
      );

  const location =
    formatActivityLocation(activity);

  const locationHtml =
    location
      ? `<span class="aktivitaeten-card-sep" aria-hidden="true">·</span><span class="aktivitaeten-card-location">${escape(location)}</span>`
      : '';

  return `
<p class="aktivitaeten-card-meta-line">
  <span class="aktivitaeten-card-time">
    ${escape(timeLabel)}
  </span>${locationHtml}
</p>
  `;

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

  const mapClass =
    options.detail
      ? 'aktivitaeten-detail-map'
      : 'aktivitaeten-card-map';

  const height =
    Number(options.height)
      || (options.detail ? 240 : 160);

  return `
<div class="aktivitaeten-card-map-stack">
  <div
    class="${mapClass}"
    data-activity-map
    data-polyline="${escapeActivityCardHtml(polyline)}"
    style="min-height:${height}px"
    role="img"
    aria-label="Streckenkarte"></div>
</div>
  `;

}

function renderActivityStatsHtml(
  activity,
  escapeHtml
) {

  const escape =
    escapeHtml || escapeActivityCardHtml;

  const distance =
    typeof formatActivityDistance === 'function'
      ? formatActivityDistance(activity.distance_m)
      : '—';

  const elevation =
    typeof formatActivityElevation === 'function'
      ? formatActivityElevation(activity.elevation_gain_m)
      : '—';

  const duration =
    typeof formatActivityDuration === 'function'
      ? formatActivityDuration(activity.moving_time_s)
      : '—';

  return `
<div class="aktivitaeten-stats-block">

  <p class="aktivitaeten-stats-labels">
    <span>Distanz</span>
    <span class="aktivitaeten-stats-sep" aria-hidden="true">|</span>
    <span>Höhenmeter</span>
    <span class="aktivitaeten-stats-sep" aria-hidden="true">|</span>
    <span>Dauer</span>
  </p>

  <p class="aktivitaeten-stats-values">
    <span>${escape(distance)}</span>
    <span class="aktivitaeten-stats-sep" aria-hidden="true">|</span>
    <span>${escape(elevation)}</span>
    <span class="aktivitaeten-stats-sep" aria-hidden="true">|</span>
    <span>${escape(duration)}</span>
  </p>

</div>
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

  const metaHtml =
    renderActivityMetaLineHtml(
      activity,
      escape
    );

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

  const shellClass =
    mapHtml
      ? 'aktivitaeten-card-shell'
      : 'aktivitaeten-card-shell aktivitaeten-card-shell--single';

  const headerHtml = `
      <div class="aktivitaeten-card-header">

        <div class="aktivitaeten-card-avatar">
          ${avatarHtml}
        </div>

        <div class="aktivitaeten-card-header-text">

          <p class="aktivitaeten-card-member-name">
            ${escape(memberName)}
          </p>

          ${metaHtml}

        </div>

      </div>
  `;

  const bodyHtml = `
        <h3 class="aktivitaeten-card-title">
          ${escape(title)}${badgeHtml}
        </h3>

        ${statsHtml}
  `;

  const contentHtml = mapHtml
    ? `
    <div class="aktivitaeten-card-layout">

      <div class="${shellClass}">

        <div class="aktivitaeten-card-text">
          ${headerHtml}
          ${bodyHtml}
        </div>

        <div class="aktivitaeten-card-map-col">
          ${mapHtml}
        </div>

      </div>

    </div>
  `
    : `
    <div class="aktivitaeten-card-layout">

      <div class="${shellClass}">

        <div class="aktivitaeten-card-text">
          ${headerHtml}
          ${bodyHtml}
        </div>

      </div>

    </div>
  `;

  return `
<article class="aktivitaeten-card${extraClass ? ` ${extraClass}` : ''}">

  <${wrapperTag}
    class="${wrapperClass}"${wrapperAttrs}>
    ${contentHtml}
  </${wrapperTag}>

</article>
  `;

}
