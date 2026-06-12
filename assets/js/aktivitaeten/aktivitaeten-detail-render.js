function escapeActivityDetailHtml(value) {

  if (
    typeof escapeActivityCardHtml === 'function'
  ) {
    return escapeActivityCardHtml(value);
  }

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function getActivityDetailPolyline(activity) {

  return (
    activity?.map_polyline
    || activity?.map_summary_polyline
    || ''
  );

}

function normalizeActivitySplitsMetric(activity) {

  let splits =
    activity?.splits_metric;

  if (typeof splits === 'string') {

    try {
      splits = JSON.parse(splits);
    } catch (_error) {
      return [];
    }

  }

  return Array.isArray(splits)
    ? splits
    : [];

}

function renderActivityDetailMetaLine(
  activity
) {

  const escape =
    escapeActivityDetailHtml;

  const timeLabel =
    typeof formatActivityDateTime === 'function'
      ? formatActivityDateTime(activity.start_date)
      : '—';

  const location =
    typeof formatActivityLocation === 'function'
      ? formatActivityLocation(activity)
      : String(activity?.start_location || '').trim();

  const typeLabel =
    typeof formatActivityTypeLabel === 'function'
      ? formatActivityTypeLabel(activity.activity_type)
      : 'Aktivität';

  const parts = [
    timeLabel,
    location,
    typeLabel
  ].filter(Boolean);

  return `
<p class="activity-detail-meta">
  ${parts.map((part) => escape(part)).join(
    '<span class="activity-detail-meta-sep" aria-hidden="true">·</span>'
  )}
</p>
  `;

}

function renderActivityDetailHeader(
  activity
) {

  const escape =
    escapeActivityDetailHtml;

  const title =
    activity?.activity_name
    || 'Aktivität';

  const avatarHtml =
    typeof renderActivityMemberAvatar === 'function'
      ? renderActivityMemberAvatar(
        activity,
        'member-avatar--md'
      )
      : '';

  return `
<header class="activity-detail-header">

  <div class="activity-detail-member">

    <div class="activity-detail-avatar">
      ${avatarHtml}
    </div>

    <div class="activity-detail-member-text">

      <p class="activity-detail-member-name">
        ${escape(activity?.member_name || 'Mitglied')}
      </p>

      ${renderActivityDetailMetaLine(activity)}

    </div>

  </div>

  <h1 class="activity-detail-title">
    ${escape(title)}
  </h1>

</header>
  `;

}

function renderActivityDetailHeroMap(
  activity
) {

  const polyline =
    getActivityDetailPolyline(activity);

  const points =
    typeof decodeActivityPolyline === 'function'
      ? decodeActivityPolyline(polyline)
      : [];

  if (points.length < 2) {
    return '';
  }

  return `
<div class="activity-detail-hero">

  <div
    class="activity-detail-hero-map"
    data-activity-detail-map
    data-polyline="${escapeActivityDetailHtml(polyline)}"
    role="img"
    aria-label="Streckenkarte der Aktivität"></div>

</div>
  `;

}

function renderActivityDetailStatItem(
  label,
  value
) {

  if (
    !value
    || value === '—'
  ) {
    return '';
  }

  const escape =
    escapeActivityDetailHtml;

  return `
<div class="activity-detail-stat">
  <dt>${escape(label)}</dt>
  <dd>${escape(value)}</dd>
</div>
  `;

}

function renderActivityDetailPrimaryStats(
  activity
) {

  const distance =
    typeof formatActivityDistance === 'function'
      ? formatActivityDistance(activity.distance_m)
      : '—';

  const elevation =
    typeof formatActivityElevation === 'function'
      ? formatActivityElevation(activity.elevation_gain_m)
      : '—';

  const movingTime =
    typeof formatActivityDuration === 'function'
      ? formatActivityDuration(activity.moving_time_s)
      : '—';

  const items =
    [
      renderActivityDetailStatItem(
        'Distanz',
        distance
      ),
      renderActivityDetailStatItem(
        'Höhenmeter',
        elevation
      ),
      renderActivityDetailStatItem(
        'Bewegungszeit',
        movingTime
      )
    ].filter(Boolean).join('');

  if (!items) {
    return '';
  }

  return `
<section
  class="activity-detail-stats activity-detail-stats--primary"
  aria-label="Hauptkennzahlen">

  <dl class="activity-detail-stats-grid">
    ${items}
  </dl>

</section>
  `;

}

function renderActivityDetailSecondaryStats(
  activity
) {

  const movingTimeS =
    Number(activity?.moving_time_s) || 0;

  const elapsedTimeS =
    Number(activity?.elapsed_time_s) || 0;

  const elapsedTime =
    elapsedTimeS > 0
    && elapsedTimeS !== movingTimeS
    && typeof formatActivityDuration === 'function'
      ? formatActivityDuration(elapsedTimeS)
      : (
        elapsedTimeS > 0
        && movingTimeS <= 0
        && typeof formatActivityDuration === 'function'
          ? formatActivityDuration(elapsedTimeS)
          : null
      );

  const averageSpeed =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(activity.average_speed_mps)
      : '—';

  const maxSpeed =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(activity.max_speed_mps)
      : '—';

  const elevHigh =
    typeof formatActivityPointElevation === 'function'
      ? formatActivityPointElevation(activity.elev_high_m)
      : '—';

  const elevLow =
    typeof formatActivityPointElevation === 'function'
      ? formatActivityPointElevation(activity.elev_low_m)
      : '—';

  const items =
    [
      renderActivityDetailStatItem(
        'Gesamtzeit',
        elapsedTime
      ),
      renderActivityDetailStatItem(
        'Ø Tempo',
        averageSpeed
      ),
      renderActivityDetailStatItem(
        'Max. Tempo',
        maxSpeed
      ),
      renderActivityDetailStatItem(
        'Höchster Punkt',
        elevHigh
      ),
      renderActivityDetailStatItem(
        'Tiefster Punkt',
        elevLow
      )
    ].filter(Boolean).join('');

  if (!items) {
    return '';
  }

  return `
<section
  class="activity-detail-stats activity-detail-stats--secondary"
  aria-label="Detailkennzahlen">

  <h2 class="activity-detail-section-title">
    Weitere Kennzahlen
  </h2>

  <dl class="activity-detail-stats-grid">
    ${items}
  </dl>

</section>
  `;

}

function renderActivityDetailSplits(
  activity
) {

  const splits =
    normalizeActivitySplitsMetric(activity);

  if (!splits.length) {
    return '';
  }

  const escape =
    escapeActivityDetailHtml;

  const rows =
    splits.map((split, index) => {

      const km =
        split?.split
        ?? index + 1;

      const distance =
        typeof formatActivitySplitDistance === 'function'
          ? formatActivitySplitDistance(split?.distance)
          : '—';

      const duration =
        typeof formatActivityDuration === 'function'
          ? formatActivityDuration(
            split?.elapsed_time
            ?? split?.moving_time
          )
          : '—';

      const speed =
        typeof formatActivitySpeed === 'function'
          ? formatActivitySpeed(split?.average_speed)
          : '—';

      const elevation =
        typeof formatActivityElevationDelta === 'function'
          ? formatActivityElevationDelta(
            split?.elevation_difference
          )
          : '—';

      return `
<tr>
  <td>${escape(km)}</td>
  <td>${escape(distance)}</td>
  <td>${escape(duration)}</td>
  <td>${escape(speed)}</td>
  <td>${escape(elevation)}</td>
</tr>
      `;

    }).join('');

  return `
<section
  class="activity-detail-splits"
  aria-label="Kilometersplits">

  <h2 class="activity-detail-section-title">
    Kilometer
  </h2>

  <div class="activity-detail-splits-table-wrap">

    <table class="activity-detail-splits-table">

      <thead>
        <tr>
          <th scope="col">Km</th>
          <th scope="col">Distanz</th>
          <th scope="col">Zeit</th>
          <th scope="col">Ø Tempo</th>
          <th scope="col">Höhe Δ</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>

    </table>

  </div>

</section>
  `;

}

function renderActivityDetailPhoto(
  activity
) {

  const photoUrl =
    String(activity?.activity_photo_url || '')
      .trim();

  if (!photoUrl) {
    return '';
  }

  const escape =
    escapeActivityDetailHtml;

  const title =
    activity?.activity_name
    || 'Aktivität';

  return `
<section
  class="activity-detail-photo"
  aria-label="Aktivitätsfoto">

  <h2 class="activity-detail-section-title">
    Foto
  </h2>

  <figure class="activity-detail-photo-figure">

    <img
      class="activity-detail-photo-image"
      src="${escape(photoUrl)}"
      alt="${escape(`Foto: ${title}`)}"
      loading="lazy"
      decoding="async">

  </figure>

</section>
  `;

}

function renderActivityDetailNotFound() {

  return `
<section class="aktivitaeten-section">

  <h1>Aktivität nicht gefunden</h1>

  <p class="aktivitaeten-hint">
    Diese Aktivität ist nicht öffentlich sichtbar oder
    liegt außerhalb des Feed-Zeitraums.
  </p>

  <p>
    <a href="/aktivitaeten/">Zurück zum Aktivitätsportal</a>
  </p>

</section>
  `;

}

function renderActivityDetailPage(
  activity
) {

  if (!activity) {
    return renderActivityDetailNotFound();
  }

  return `
<section class="aktivitaeten-section aktivitaeten-detail">

  <p class="aktivitaeten-back">
    <a href="/aktivitaeten/">← Aktivitäten</a>
  </p>

  ${renderActivityDetailHeader(activity)}

  ${renderActivityDetailHeroMap(activity)}

  <div
    id="activity-detail-future-analysis"
    class="activity-detail-future-analysis"></div>

  ${renderActivityDetailPrimaryStats(activity)}

  ${renderActivityDetailSecondaryStats(activity)}

  ${renderActivityDetailSplits(activity)}

  ${renderActivityDetailPhoto(activity)}

</section>
  `;

}

function mountActivityDetailPage(
  activity
) {

  const container =
    document.getElementById(
      'aktivitaeten-detail'
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    renderActivityDetailPage(activity);

  if (
    activity
    && typeof refreshActivityDetailMap === 'function'
  ) {
    refreshActivityDetailMap(container);
  }

}
