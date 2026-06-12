const MAX_SPEED_INSIGHT_MIN_RATIO = 1.20;

function escapeActivityAnalysisHtml(value) {

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

function getPauseTourInsight(activity) {

  if (
    typeof formatPauseDuration !== 'function'
  ) {
    return null;
  }

  const pause =
    formatPauseDuration(
      activity?.elapsed_time_s,
      activity?.moving_time_s
    );

  if (!pause) {
    return null;
  }

  return {
    id: 'pause',
    label: 'Pausenzeit',
    value: pause.pauseLabel,
    detail:
      `${pause.pausePercent} % der Gesamtzeit`
  };

}

function getElevationRangeTourInsight(activity) {

  if (
    typeof formatElevationRange !== 'function'
  ) {
    return null;
  }

  const range =
    formatElevationRange(
      activity?.elev_high_m,
      activity?.elev_low_m
    );

  if (!range) {
    return null;
  }

  return {
    id: 'elevation-range',
    label: 'Höhenbereich',
    value: range.label,
    detail: range.detail
  };

}

function getAverageSpeedTourInsight(activity) {

  const avgMps =
    Number(activity?.average_speed_mps) || 0;

  if (avgMps <= 0) {
    return null;
  }

  const value =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(avgMps)
      : '—';

  if (
    !value
    || value === '—'
  ) {
    return null;
  }

  return {
    id: 'avg-speed',
    label: 'Ø Tempo',
    value,
    detail: null
  };

}

function getMaxSpeedTourInsight(
  activity,
  avgMps
) {

  const maxMps =
    Number(activity?.max_speed_mps) || 0;

  if (
    avgMps <= 0
    || maxMps <= 0
    || maxMps < avgMps * MAX_SPEED_INSIGHT_MIN_RATIO
  ) {
    return null;
  }

  const value =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(maxMps)
      : '—';

  if (
    !value
    || value === '—'
  ) {
    return null;
  }

  return {
    id: 'max-speed',
    label: 'Höchsttempo',
    value,
    detail: null
  };

}

function computeActivityTourInsights(activity) {

  const insights = [];

  const pauseInsight =
    getPauseTourInsight(activity);

  if (pauseInsight) {
    insights.push(pauseInsight);
  }

  const elevationInsight =
    getElevationRangeTourInsight(activity);

  if (elevationInsight) {
    insights.push(elevationInsight);
  }

  const avgMps =
    Number(activity?.average_speed_mps) || 0;

  const avgInsight =
    getAverageSpeedTourInsight(activity);

  if (avgInsight) {
    insights.push(avgInsight);
  }

  const maxInsight =
    getMaxSpeedTourInsight(
      activity,
      avgMps
    );

  if (maxInsight) {
    insights.push(maxInsight);
  }

  return insights;

}

function getSplitKmLabel(
  split,
  index
) {

  const km =
    Number(split?.split);

  if (
    Number.isFinite(km)
    && km > 0
  ) {
    return km;
  }

  return index + 1;

}

function getSplitDurationLabel(split) {

  const seconds =
    split?.elapsed_time
    ?? split?.moving_time;

  if (
    typeof formatActivityDuration !== 'function'
  ) {
    return null;
  }

  const label =
    formatActivityDuration(seconds);

  if (
    !label
    || label === '—'
  ) {
    return null;
  }

  return label;

}

function pickFastestSplitHighlight(splits) {

  let best = null;

  splits.forEach((split, index) => {

    const speed =
      Number(split?.average_speed) || 0;

    if (speed <= 0) {
      return;
    }

    if (
      !best
      || speed > best.speed
    ) {
      best = {
        split,
        index,
        speed
      };
    }

  });

  if (!best) {
    return null;
  }

  const primary =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(best.speed)
      : '—';

  if (
    !primary
    || primary === '—'
  ) {
    return null;
  }

  return {
    id: 'fastest',
    title: 'Schnellster Kilometer',
    km: getSplitKmLabel(
      best.split,
      best.index
    ),
    primary,
    secondary:
      getSplitDurationLabel(best.split)
  };

}

function pickSteepestSplitHighlight(splits) {

  let best = null;

  splits.forEach((split, index) => {

    const elevation =
      Number(split?.elevation_difference);

    if (
      !Number.isFinite(elevation)
      || elevation <= 0
    ) {
      return;
    }

    if (
      !best
      || elevation > best.elevation
    ) {
      best = {
        split,
        index,
        elevation
      };
    }

  });

  if (!best) {
    return null;
  }

  const primary =
    typeof formatActivityElevationDelta === 'function'
      ? formatActivityElevationDelta(best.elevation)
      : '—';

  if (
    !primary
    || primary === '—'
  ) {
    return null;
  }

  return {
    id: 'steepest',
    title: 'Steilster Kilometer',
    km: getSplitKmLabel(
      best.split,
      best.index
    ),
    primary,
    secondary:
      getSplitDurationLabel(best.split)
  };

}

function computeActivitySplitHighlights(activity) {

  const splits =
    typeof normalizeActivitySplitsMetric === 'function'
      ? normalizeActivitySplitsMetric(activity)
      : [];

  if (splits.length < 2) {
    return [];
  }

  const highlights = [];

  const fastest =
    pickFastestSplitHighlight(splits);

  if (fastest) {
    highlights.push(fastest);
  }

  const steepest =
    pickSteepestSplitHighlight(splits);

  if (steepest) {
    highlights.push(steepest);
  }

  return highlights;

}

function renderActivityDetailInsightCard(insight) {

  const escape =
    escapeActivityAnalysisHtml;

  const detailHtml =
    insight.detail
      ? `
<p class="activity-detail-insight-card__detail">
  ${escape(insight.detail)}
</p>
      `
      : '';

  return `
<div class="activity-detail-insight-card">

  <p class="activity-detail-insight-card__label">
    ${escape(insight.label)}
  </p>

  <p class="activity-detail-insight-card__value">
    ${escape(insight.value)}
  </p>

  ${detailHtml}

</div>
  `;

}

function renderTourInsightsSection(insights) {

  if (!insights.length) {
    return '';
  }

  const cards =
    insights
      .map(renderActivityDetailInsightCard)
      .join('');

  return `
<div class="activity-detail-analysis__section activity-detail-analysis__section--insights">

  <h2 class="activity-detail-section-title">
    Tour-Insights
  </h2>

  <div class="activity-detail-insights-grid">
    ${cards}
  </div>

</div>
  `;

}

function renderActivityDetailHighlightCard(highlight) {

  const escape =
    escapeActivityAnalysisHtml;

  const secondaryHtml =
    highlight.secondary
      ? `
<p class="activity-detail-highlight-card__secondary">
  ${escape(highlight.secondary)}
</p>
      `
      : '';

  return `
<div class="activity-detail-highlight-card">

  <p class="activity-detail-highlight-card__title">
    ${escape(highlight.title)}
  </p>

  <p class="activity-detail-highlight-card__km">
    Km ${escape(highlight.km)}
  </p>

  <p class="activity-detail-highlight-card__primary">
    ${escape(highlight.primary)}
  </p>

  ${secondaryHtml}

</div>
  `;

}

function renderSplitHighlightsSection(highlights) {

  if (!highlights.length) {
    return '';
  }

  const cards =
    highlights
      .map(renderActivityDetailHighlightCard)
      .join('');

  return `
<div class="activity-detail-analysis__section activity-detail-analysis__section--highlights">

  <h2 class="activity-detail-section-title">
    Highlights
  </h2>

  <div class="activity-detail-highlights-grid">
    ${cards}
  </div>

</div>
  `;

}

function renderActivityDetailAnalysis(activity) {

  const insights =
    computeActivityTourInsights(activity);

  const highlights =
    computeActivitySplitHighlights(activity);

  if (
    !insights.length
    && !highlights.length
  ) {
    return '';
  }

  return `
<section
  id="activity-detail-analysis"
  class="activity-detail-analysis"
  aria-label="Tour-Einordnung">

  ${renderTourInsightsSection(insights)}

  ${renderSplitHighlightsSection(highlights)}

</section>
  `;

}
