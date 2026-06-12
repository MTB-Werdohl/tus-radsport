const SUPPORTED_STREAM_SCHEMA_VERSION = 1;

const STREAM_VALIDATION_KEYS = [
  'distance',
  'altitude',
  'velocity_smooth',
  'latlng',
  'time'
];

const STREAM_DISTANCE_TOLERANCE_M = 0.01;

const STREAM_CHART_VIEWBOX_WIDTH = 800;
const STREAM_CHART_VIEWBOX_HEIGHT = 240;
const STREAM_CHART_PLOT_PADDING = 20;
const STREAM_CHART_MIN_VALUE_SPAN = 10;

const STREAM_SEGMENT_MIN_POINT_COUNT = 50;
const STREAM_SEGMENT_MEDIAN_SPACING_FALLBACK_M = 20;

const STEEPEST_WINDOW_M = 100;
const STEEPEST_WINDOW_MIN_M = 80;
const STEEPEST_WINDOW_MAX_M = 120;
const STEEPEST_FALLBACK_WINDOW_M = 250;
const STEEPEST_FALLBACK_WINDOW_MIN_M = 200;
const STEEPEST_FALLBACK_WINDOW_MAX_M = 300;
const STEEPEST_FALLBACK_MIN_RISE_M = 15;
const STEEPEST_ALTITUDE_SMOOTH_RADIUS_M = 30;
const STEEPEST_MIN_RISE_M = 8;
const STEEPEST_MIN_GRADE_PCT = 6;
const STEEPEST_MIN_VELOCITY_MPS = 1.5;

const FASTEST_WINDOW_M = 100;
const FASTEST_WINDOW_MIN_M = 80;
const FASTEST_WINDOW_MAX_M = 120;
const FASTEST_MIN_VELOCITY_MPS = 2;
const FASTEST_MIN_TOUR_RATIO = 1.15;

function validateStreamPayloadClient(payload) {

  if (
    !payload
    || typeof payload !== 'object'
  ) {
    return {
      ok: false,
      reason: 'invalid payload'
    };
  }

  if (
    Number(payload.schema_version)
    !== SUPPORTED_STREAM_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      reason: 'unsupported schema_version'
    };
  }

  const pointCount =
    Number(payload.point_count);

  if (
    !Number.isFinite(pointCount)
    || pointCount < 2
  ) {
    return {
      ok: false,
      reason: 'invalid point_count'
    };
  }

  const streams =
    payload.streams;

  if (
    !streams
    || typeof streams !== 'object'
  ) {
    return {
      ok: false,
      reason: 'missing streams'
    };
  }

  for (const key of STREAM_VALIDATION_KEYS) {

    const values =
      streams[key];

    if (
      !Array.isArray(values)
      || values.length !== pointCount
    ) {
      return {
        ok: false,
        reason: `invalid ${key}`
      };

    }

  }

  return { ok: true };

}

function computeStreamPointSpacing(points) {

  const gaps = [];

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {

    gaps.push(
      points[index].distanceM
      - points[index - 1].distanceM
    );

  }

  if (!gaps.length) {
    return {
      medianM: 0,
      meanM: 0
    };
  }

  gaps.sort(
    (left, right) => left - right
  );

  const meanM =
    gaps.reduce(
      (sum, gap) => sum + gap,
      0
    ) / gaps.length;

  return {
    medianM:
      gaps[Math.floor(gaps.length / 2)],
    meanM
  };

}

function prepareStreamPointSeries(payload) {

  const pointCount =
    Number(payload.point_count);

  const distances =
    payload.streams.distance;

  const altitudes =
    payload.streams.altitude;

  const velocities =
    payload.streams.velocity_smooth;

  const times =
    payload.streams.time;

  const latlngs =
    payload.streams.latlng;

  const points = [];
  let distanceMinM = Infinity;
  let distanceMaxM = -Infinity;
  let altitudeMinM = Infinity;
  let altitudeMaxM = -Infinity;
  let velocityMinMps = Infinity;
  let velocityMaxMps = -Infinity;
  let velocitySumMps = 0;
  let velocityCount = 0;

  for (
    let index = 0;
    index < pointCount;
    index += 1
  ) {

    const distanceM =
      Number(distances[index]);

    const altitudeM =
      Number(altitudes[index]);

    const velocityMps =
      Number(velocities[index]);

    const timeS =
      Number(times[index]);

    const latlng =
      latlngs[index];

    if (
      !Number.isFinite(distanceM)
      || !Number.isFinite(altitudeM)
      || !Number.isFinite(velocityMps)
      || !Number.isFinite(timeS)
      || !Array.isArray(latlng)
      || latlng.length < 2
    ) {
      return null;
    }

    if (
      index > 0
      && distanceM
        < points[index - 1].distanceM
          - STREAM_DISTANCE_TOLERANCE_M
    ) {
      return null;
    }

    points.push({
      distanceM,
      altitudeM,
      velocityMps,
      timeS,
      latlng,
      index
    });

    distanceMinM =
      Math.min(distanceMinM, distanceM);

    distanceMaxM =
      Math.max(distanceMaxM, distanceM);

    altitudeMinM =
      Math.min(altitudeMinM, altitudeM);

    altitudeMaxM =
      Math.max(altitudeMaxM, altitudeM);

    if (velocityMps >= 0) {

      velocityMinMps =
        Math.min(velocityMinMps, velocityMps);

      velocityMaxMps =
        Math.max(velocityMaxMps, velocityMps);

      velocitySumMps += velocityMps;
      velocityCount += 1;

    }

  }

  if (points.length < 2) {
    return null;
  }

  const spacing =
    computeStreamPointSpacing(points);

  const tourAverageVelocityMps =
    velocityCount > 0
      ? velocitySumMps / velocityCount
      : 0;

  if (
    !Number.isFinite(velocityMinMps)
    || !Number.isFinite(velocityMaxMps)
  ) {
    velocityMinMps = 0;
    velocityMaxMps = 0;
  }

  return {
    points,
    spacing,
    bounds: {
      distanceMinM,
      distanceMaxM,
      altitudeMinM,
      altitudeMaxM,
      velocityMinMps,
      velocityMaxMps,
      tourAverageVelocityMps
    }
  };

}

function smoothStreamAltitudes(
  points,
  radiusM
) {

  return points.map((point) => {

    let sum = 0;
    let count = 0;

    for (
      let index = 0;
      index < points.length;
      index += 1
    ) {

      const sample =
        points[index];

      const deltaM =
        Math.abs(
          sample.distanceM - point.distanceM
        );

      if (deltaM <= radiusM) {
        sum += sample.altitudeM;
        count += 1;
      }

    }

    return {
      ...point,
      altitudeM:
        count > 0
          ? sum / count
          : point.altitudeM
    };

  });

}

function computeStreamPlotSeries(
  streamSeries,
  valueKey,
  minSpan
) {

  const sourcePoints =
    streamSeries.points;

  const bounds =
    streamSeries.bounds;

  let valueMin;
  let valueMax;

  if (valueKey === 'altitudeM') {

    valueMin = bounds.altitudeMinM;
    valueMax = bounds.altitudeMaxM;

  } else {

    valueMin = bounds.velocityMinMps;
    valueMax = bounds.velocityMaxMps;

  }

  const valueSpan =
    valueMax - valueMin;

  let paddedValueMin;
  let paddedValueMax;

  if (valueSpan <= 0) {

    const halfSpan =
      minSpan / 2;

    paddedValueMin =
      valueMin - halfSpan;

    paddedValueMax =
      valueMax + halfSpan;

  } else {

    const padding =
      Math.max(
        valueSpan * 0.05,
        valueKey === 'altitudeM' ? 5 : 0.5
      );

    paddedValueMin =
      valueMin - padding;

    paddedValueMax =
      valueMax + padding;

  }

  const plotWidth =
    STREAM_CHART_VIEWBOX_WIDTH
    - (STREAM_CHART_PLOT_PADDING * 2);

  const plotHeight =
    STREAM_CHART_VIEWBOX_HEIGHT
    - (STREAM_CHART_PLOT_PADDING * 2);

  const distanceSpanM =
    Math.max(
      bounds.distanceMaxM - bounds.distanceMinM,
      1
    );

  const paddedValueSpan =
    Math.max(
      paddedValueMax - paddedValueMin,
      1
    );

  const plotPoints =
    sourcePoints.map((point) => {

      const value =
        point[valueKey];

      const plotX =
        STREAM_CHART_PLOT_PADDING
        + (
          (point.distanceM - bounds.distanceMinM)
          / distanceSpanM
        ) * plotWidth;

      const plotY =
        STREAM_CHART_PLOT_PADDING
        + plotHeight
        - (
          (value - paddedValueMin)
          / paddedValueSpan
        ) * plotHeight;

      return {
        ...point,
        plotX,
        plotY
      };

    });

  return {
    points: plotPoints,
    bounds: streamSeries.bounds
  };

}

function computeElevationPlotSeries(
  streamSeries
) {

  return computeStreamPlotSeries(
    streamSeries,
    'altitudeM',
    STREAM_CHART_MIN_VALUE_SPAN
  );

}

function computeSpeedPlotSeries(
  streamSeries
) {

  const bounds =
    streamSeries.bounds;

  if (
    bounds.velocityMaxMps <= 0
    && bounds.velocityMinMps <= 0
  ) {
    return null;
  }

  return computeStreamPlotSeries(
    streamSeries,
    'velocityMps',
    1
  );

}

function formatStreamGradePct(
  gradePct
) {

  if (!Number.isFinite(gradePct)) {
    return '—';
  }

  return (
    gradePct
      .toFixed(1)
      .replace('.', ',')
    + ' %'
  );

}

function formatStreamSegmentDistanceLabel(
  distanceM
) {

  if (
    typeof formatActivitySplitDistance === 'function'
  ) {
    return formatActivitySplitDistance(
      distanceM
    );
  }

  return `${Math.round(distanceM)} m`;

}

function formatStreamSegmentDuration(
  startPoint,
  endPoint
) {

  const durationS =
    Number(endPoint?.timeS)
    - Number(startPoint?.timeS);

  if (
    !Number.isFinite(durationS)
    || durationS <= 0
  ) {
    return null;
  }

  if (
    typeof formatActivityDuration === 'function'
  ) {

    const label =
      formatActivityDuration(durationS);

    if (
      label
      && label !== '—'
    ) {
      return label;
    }

  }

  return null;

}

function averageSegmentVelocityMps(
  startPoint,
  endPoint
) {

  const timeDeltaS =
    endPoint.timeS - startPoint.timeS;

  if (timeDeltaS <= 0) {
    return 0;
  }

  return (
    (endPoint.distanceM - startPoint.distanceM)
    / timeDeltaS
  );

}

function findBestSteepestSegment(
  points,
  windowM,
  windowMinM,
  windowMaxM,
  minRiseM
) {

  let best = null;

  for (
    let startIndex = 0;
    startIndex < points.length;
    startIndex += 1
  ) {

    const startPoint =
      points[startIndex];

    for (
      let endIndex = startIndex + 1;
      endIndex < points.length;
      endIndex += 1
    ) {

      const endPoint =
        points[endIndex];

      const runM =
        endPoint.distanceM
        - startPoint.distanceM;

      if (runM < windowMinM) {
        continue;
      }

      if (runM > windowMaxM) {
        break;
      }

      const riseM =
        endPoint.altitudeM
        - startPoint.altitudeM;

      if (
        riseM < minRiseM
      ) {
        continue;
      }

      const gradePct =
        (riseM / runM) * 100;

      if (
        gradePct < STEEPEST_MIN_GRADE_PCT
      ) {
        continue;
      }

      const velocityMps =
        averageSegmentVelocityMps(
          startPoint,
          endPoint
        );

      if (
        velocityMps > 0
        && velocityMps < STEEPEST_MIN_VELOCITY_MPS
      ) {
        continue;
      }

      if (
        !best
        || gradePct > best.gradePct
        || (
          gradePct === best.gradePct
          && riseM > best.riseM
        )
        || (
          gradePct === best.gradePct
          && riseM === best.riseM
          && startPoint.index < best.startPoint.index
        )
      ) {

        best = {
          gradePct,
          riseM,
          runM,
          startPoint,
          endPoint,
          startIndex,
          endIndex,
          windowM
        };

      }

    }

  }

  return best;

}

function findBestFastestSegment(
  points,
  tourAverageVelocityMps
) {

  let best = null;

  for (
    let startIndex = 0;
    startIndex < points.length;
    startIndex += 1
  ) {

    const startPoint =
      points[startIndex];

    for (
      let endIndex = startIndex + 1;
      endIndex < points.length;
      endIndex += 1
    ) {

      const endPoint =
        points[endIndex];

      const runM =
        endPoint.distanceM
        - startPoint.distanceM;

      if (runM < FASTEST_WINDOW_MIN_M) {
        continue;
      }

      if (runM > FASTEST_WINDOW_MAX_M) {
        break;
      }

      const velocityMps =
        averageSegmentVelocityMps(
          startPoint,
          endPoint
        );

      if (
        velocityMps < FASTEST_MIN_VELOCITY_MPS
      ) {
        continue;
      }

      if (
        tourAverageVelocityMps > 0
        && velocityMps
          < tourAverageVelocityMps
            * FASTEST_MIN_TOUR_RATIO
      ) {
        continue;
      }

      if (
        !best
        || velocityMps > best.velocityMps
        || (
          velocityMps === best.velocityMps
          && startPoint.index < best.startPoint.index
        )
      ) {

        best = {
          velocityMps,
          runM,
          startPoint,
          endPoint,
          startIndex,
          endIndex,
          windowM: FASTEST_WINDOW_M
        };

      }

    }

  }

  return best;

}

function buildStreamSegmentHighlight(
  kind,
  segment
) {

  const startPoint =
    segment.startPoint;

  const endPoint =
    segment.endPoint;

  const locationLabel =
    `bei ${formatStreamSegmentDistanceLabel(
      startPoint.distanceM
    )}`;

  const durationLabel =
    formatStreamSegmentDuration(
      startPoint,
      endPoint
    );

  if (kind === 'steepest') {

    const secondaryParts = [
      typeof formatActivityElevationDelta === 'function'
        ? formatActivityElevationDelta(
          segment.riseM
        )
        : `+${Math.round(segment.riseM)} m`,
      `${Math.round(segment.runM)} m`
    ];

    if (durationLabel) {
      secondaryParts.push(durationLabel);
    }

    return {
      id: 'steepest-section',
      title: 'Steilster Abschnitt',
      km: locationLabel,
      primary:
        formatStreamGradePct(
          segment.gradePct
        ),
      secondary:
        secondaryParts.join(' · '),
      startIndex: segment.startIndex,
      endIndex: segment.endIndex,
      startLatLng: startPoint.latlng,
      endLatLng: endPoint.latlng
    };

  }

  const secondaryParts = [
    `${Math.round(segment.runM)} m`
  ];

  if (durationLabel) {
    secondaryParts.push(durationLabel);
  }

  const primary =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(
        segment.velocityMps
      )
      : '—';

  if (
    !primary
    || primary === '—'
  ) {
    return null;
  }

  return {
    id: 'fastest-section',
    title: 'Schnellster Abschnitt',
    km: locationLabel,
    primary,
    secondary:
      secondaryParts.join(' · '),
    startIndex: segment.startIndex,
    endIndex: segment.endIndex,
    startLatLng: startPoint.latlng,
    endLatLng: endPoint.latlng
  };

}

function computeStreamSegments(
  streamSeries
) {

  if (
    streamSeries.points.length
    < STREAM_SEGMENT_MIN_POINT_COUNT
  ) {
    return {
      steepest: null,
      fastest: null,
      highlights: []
    };
  }

  const smoothedPoints =
    smoothStreamAltitudes(
      streamSeries.points,
      STEEPEST_ALTITUDE_SMOOTH_RADIUS_M
    );

  const useFallbackWindow =
    streamSeries.spacing.medianM
    > STREAM_SEGMENT_MEDIAN_SPACING_FALLBACK_M;

  const steepestSegment =
    findBestSteepestSegment(
      smoothedPoints,
      useFallbackWindow
        ? STEEPEST_FALLBACK_WINDOW_M
        : STEEPEST_WINDOW_M,
      useFallbackWindow
        ? STEEPEST_FALLBACK_WINDOW_MIN_M
        : STEEPEST_WINDOW_MIN_M,
      useFallbackWindow
        ? STEEPEST_FALLBACK_WINDOW_MAX_M
        : STEEPEST_WINDOW_MAX_M,
      useFallbackWindow
        ? STEEPEST_FALLBACK_MIN_RISE_M
        : STEEPEST_MIN_RISE_M
    );

  const fastestSegment =
    findBestFastestSegment(
      streamSeries.points,
      streamSeries.bounds.tourAverageVelocityMps
    );

  const highlights = [];

  if (steepestSegment) {

    const highlight =
      buildStreamSegmentHighlight(
        'steepest',
        steepestSegment
      );

    if (highlight) {
      highlights.push(highlight);
    }

  }

  if (fastestSegment) {

    const highlight =
      buildStreamSegmentHighlight(
        'fastest',
        fastestSegment
      );

    if (highlight) {
      highlights.push(highlight);
    }

  }

  return {
    steepest: steepestSegment,
    fastest: fastestSegment,
    highlights
  };

}

function runStreamAnalysisBlocks(
  payload
) {

  const streamSeries =
    prepareStreamPointSeries(payload);

  if (!streamSeries) {
    return [];
  }

  const blocks = [];

  const elevationSeries =
    computeElevationPlotSeries(
      streamSeries
    );

  if (elevationSeries) {
    blocks.push({
      id: 'elevation',
      series: elevationSeries
    });
  }

  const speedSeries =
    computeSpeedPlotSeries(
      streamSeries
    );

  if (speedSeries) {
    blocks.push({
      id: 'speed',
      series: speedSeries
    });
  }

  const segments =
    computeStreamSegments(
      streamSeries
    );

  if (segments.highlights.length) {
    blocks.push({
      id: 'highlights',
      highlights: segments.highlights
    });
  }

  return blocks;

}
