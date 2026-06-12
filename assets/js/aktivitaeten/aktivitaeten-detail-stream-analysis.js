const SUPPORTED_STREAM_SCHEMA_VERSION = 1;

const STREAM_VALIDATION_KEYS = [
  'distance',
  'altitude',
  'velocity_smooth',
  'latlng',
  'time'
];

const ELEVATION_VIEWBOX_WIDTH = 800;
const ELEVATION_VIEWBOX_HEIGHT = 240;
const ELEVATION_PLOT_PADDING = 20;
const ELEVATION_MIN_ALTITUDE_SPAN_M = 10;
const ELEVATION_DISTANCE_TOLERANCE_M = 0.01;
const ELEVATION_RESIZE_DEBOUNCE_MS = 150;

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

function prepareElevationProfileSeries(payload) {

  const pointCount =
    Number(payload.point_count);

  const distances =
    payload.streams.distance;

  const altitudes =
    payload.streams.altitude;

  const points = [];
  let distanceMinM = Infinity;
  let distanceMaxM = -Infinity;
  let altitudeMinM = Infinity;
  let altitudeMaxM = -Infinity;

  for (
    let index = 0;
    index < pointCount;
    index += 1
  ) {

    const distanceM =
      Number(distances[index]);

    const altitudeM =
      Number(altitudes[index]);

    if (
      !Number.isFinite(distanceM)
      || !Number.isFinite(altitudeM)
    ) {
      return null;
    }

    if (
      index > 0
      && distanceM
        < points[index - 1].distanceM
          - ELEVATION_DISTANCE_TOLERANCE_M
    ) {
      return null;
    }

    points.push({
      distanceM,
      altitudeM,
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

  }

  if (points.length < 2) {
    return null;
  }

  const altitudeSpanM =
    altitudeMaxM - altitudeMinM;

  let paddedAltitudeMinM;
  let paddedAltitudeMaxM;

  if (altitudeSpanM <= 0) {

    const halfSpan =
      ELEVATION_MIN_ALTITUDE_SPAN_M / 2;

    paddedAltitudeMinM =
      altitudeMinM - halfSpan;

    paddedAltitudeMaxM =
      altitudeMaxM + halfSpan;

  } else {

    const paddingM =
      Math.max(
        altitudeSpanM * 0.05,
        5
      );

    paddedAltitudeMinM =
      altitudeMinM - paddingM;

    paddedAltitudeMaxM =
      altitudeMaxM + paddingM;

  }

  const plotWidth =
    ELEVATION_VIEWBOX_WIDTH
    - (ELEVATION_PLOT_PADDING * 2);

  const plotHeight =
    ELEVATION_VIEWBOX_HEIGHT
    - (ELEVATION_PLOT_PADDING * 2);

  const distanceSpanM =
    Math.max(
      distanceMaxM - distanceMinM,
      1
    );

  const paddedAltitudeSpanM =
    Math.max(
      paddedAltitudeMaxM - paddedAltitudeMinM,
      1
    );

  const plotPoints =
    points.map((point) => {

      const x =
        ELEVATION_PLOT_PADDING
        + (
          (point.distanceM - distanceMinM)
          / distanceSpanM
        ) * plotWidth;

      const y =
        ELEVATION_PLOT_PADDING
        + plotHeight
        - (
          (point.altitudeM - paddedAltitudeMinM)
          / paddedAltitudeSpanM
        ) * plotHeight;

      return {
        ...point,
        plotX: x,
        plotY: y
      };

    });

  return {
    points: plotPoints,
    bounds: {
      distanceMinM,
      distanceMaxM,
      altitudeMinM,
      altitudeMaxM
    }
  };

}

function buildElevationProfilePath(
  plotPoints,
  closeArea
) {

  if (!plotPoints.length) {
    return '';
  }

  const lineParts =
    plotPoints.map((point, index) => {

      const command =
        index === 0 ? 'M' : 'L';

      return (
        `${command}${point.plotX.toFixed(2)} ${point.plotY.toFixed(2)}`
      );

    });

  if (!closeArea) {
    return lineParts.join(' ');
  }

  const baselineY =
    ELEVATION_VIEWBOX_HEIGHT - ELEVATION_PLOT_PADDING;

  const first =
    plotPoints[0];

  const last =
    plotPoints[plotPoints.length - 1];

  return [
    ...lineParts,
    `L${last.plotX.toFixed(2)} ${baselineY.toFixed(2)}`,
    `L${first.plotX.toFixed(2)} ${baselineY.toFixed(2)}`,
    'Z'
  ].join(' ');

}

function findNearestElevationPointByRatio(
  plotPoints,
  ratio
) {

  if (!plotPoints.length) {
    return null;
  }

  const clampedRatio =
    Math.min(
      1,
      Math.max(0, ratio)
    );

  const bounds =
    plotPoints[plotPoints.length - 1];

  const distanceMinM =
    plotPoints[0].distanceM;

  const distanceMaxM =
    bounds.distanceM;

  const distanceSpanM =
    Math.max(
      distanceMaxM - distanceMinM,
      1
    );

  const targetDistanceM =
    distanceMinM
    + clampedRatio * distanceSpanM;

  let nearest =
    plotPoints[0];

  let nearestDelta =
    Math.abs(
      nearest.distanceM - targetDistanceM
    );

  for (
    let index = 1;
    index < plotPoints.length;
    index += 1
  ) {

    const point =
      plotPoints[index];

    const delta =
      Math.abs(
        point.distanceM - targetDistanceM
      );

    if (
      delta < nearestDelta
      || (
        delta === nearestDelta
        && point.index < nearest.index
      )
    ) {
      nearest = point;
      nearestDelta = delta;
    }

  }

  return nearest;

}

function formatElevationProfileTooltip(
  point
) {

  const distanceLabel =
    typeof formatActivitySplitDistance === 'function'
      ? formatActivitySplitDistance(
        point.distanceM
      )
      : `${Math.round(point.distanceM)} m`;

  const altitudeLabel =
    typeof formatActivityPointElevation === 'function'
      ? formatActivityPointElevation(
        point.altitudeM
      )
      : `${Math.round(point.altitudeM)} m`;

  return `${distanceLabel} · ${altitudeLabel}`;

}

function renderActivityDetailStreamAnalysis() {

  return `
<section
  id="activity-detail-stream-analysis"
  class="activity-detail-stream-analysis"
  aria-label="Streckenprofil">

  <div class="activity-detail-stream-analysis__block activity-detail-elevation-profile">

    <h2 class="activity-detail-section-title">
      Höhenprofil
    </h2>

    <div
      class="activity-detail-elevation-profile__chart-wrap"
      data-elevation-profile-chart
      role="img"
      aria-label="Höhenprofil entlang der gefahrenen Strecke">

      <svg
        class="activity-detail-elevation-profile__svg"
        viewBox="0 0 ${ELEVATION_VIEWBOX_WIDTH} ${ELEVATION_VIEWBOX_HEIGHT}"
        preserveAspectRatio="none"
        aria-hidden="true">

        <path
          class="activity-detail-elevation-profile__area"
          data-elevation-profile-area
          d=""></path>

        <path
          class="activity-detail-elevation-profile__line"
          data-elevation-profile-line
          d=""></path>

        <line
          class="activity-detail-elevation-profile__cursor"
          data-elevation-profile-cursor
          x1="0"
          y1="${ELEVATION_PLOT_PADDING}"
          x2="0"
          y2="${ELEVATION_VIEWBOX_HEIGHT - ELEVATION_PLOT_PADDING}"
          visibility="hidden"></line>

        <circle
          class="activity-detail-elevation-profile__cursor-dot"
          data-elevation-profile-cursor-dot
          r="4"
          cx="0"
          cy="0"
          visibility="hidden"></circle>

      </svg>

      <div
        class="activity-detail-elevation-profile__tooltip"
        data-elevation-profile-tooltip
        hidden
        aria-hidden="true"></div>

    </div>

  </div>

</section>
  `;

}

function bindElevationProfileChart(
  wrapEl,
  series
) {

  const plotPoints =
    series.points;

  const linePath =
    buildElevationProfilePath(
      plotPoints,
      false
    );

  const areaPath =
    buildElevationProfilePath(
      plotPoints,
      true
    );

  const lineEl =
    wrapEl.querySelector(
      '[data-elevation-profile-line]'
    );

  const areaEl =
    wrapEl.querySelector(
      '[data-elevation-profile-area]'
    );

  const cursorEl =
    wrapEl.querySelector(
      '[data-elevation-profile-cursor]'
    );

  const cursorDotEl =
    wrapEl.querySelector(
      '[data-elevation-profile-cursor-dot]'
    );

  const tooltipEl =
    wrapEl.querySelector(
      '[data-elevation-profile-tooltip]'
    );

  if (
    !lineEl
    || !areaEl
    || !cursorEl
    || !cursorDotEl
    || !tooltipEl
  ) {
    return null;
  }

  lineEl.setAttribute('d', linePath);
  areaEl.setAttribute('d', areaPath);

  const state = {
    active: false,
    relativeX: null,
    rect: null,
    rafId: 0,
    resizeTimer: 0,
    resizeObserver: null
  };

  function hideCrosshair() {

    state.active = false;
    state.relativeX = null;

    cursorEl.setAttribute('visibility', 'hidden');
    cursorDotEl.setAttribute('visibility', 'hidden');
    tooltipEl.hidden = true;
    tooltipEl.textContent = '';

  }

  function refreshRect() {

    state.rect =
      wrapEl.getBoundingClientRect();

  }

  function positionTooltip(
    clientX,
    clientY
  ) {

    if (
      !state.rect
      || state.rect.width <= 0
    ) {
      return;
    }

    const localX =
      clientX - state.rect.left;

    const localY =
      clientY - state.rect.top;

    const tooltipWidth =
      tooltipEl.offsetWidth || 120;

    const tooltipHeight =
      tooltipEl.offsetHeight || 32;

    let left =
      localX + 12;

    let top =
      localY - tooltipHeight - 12;

    if (left + tooltipWidth > state.rect.width - 4) {
      left =
        localX - tooltipWidth - 12;
    }

    if (left < 4) {
      left = 4;
    }

    if (top < 4) {
      top = localY + 12;
    }

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;

  }

  function applyCrosshairAtRatio(
    ratio,
    clientX,
    clientY
  ) {

    const point =
      findNearestElevationPointByRatio(
        plotPoints,
        ratio
      );

    if (!point) {
      hideCrosshair();
      return;
    }

    state.relativeX = ratio;

    cursorEl.setAttribute('x1', String(point.plotX));
    cursorEl.setAttribute('x2', String(point.plotX));
    cursorEl.setAttribute('visibility', 'visible');

    cursorDotEl.setAttribute('cx', String(point.plotX));
    cursorDotEl.setAttribute('cy', String(point.plotY));
    cursorDotEl.setAttribute('visibility', 'visible');

    tooltipEl.textContent =
      formatElevationProfileTooltip(point);

    tooltipEl.hidden = false;
    positionTooltip(clientX, clientY);

  }

  function updateFromClientX(
    clientX,
    clientY
  ) {

    refreshRect();

    if (
      !state.rect
      || state.rect.width <= 0
    ) {
      hideCrosshair();
      return;
    }

    const ratio =
      (clientX - state.rect.left)
      / state.rect.width;

    applyCrosshairAtRatio(
      ratio,
      clientX,
      clientY
    );

  }

  function schedulePointerUpdate(event) {

    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
    }

    const clientX =
      event.clientX;

    const clientY =
      event.clientY;

    state.rafId =
      requestAnimationFrame(() => {
        state.rafId = 0;
        updateFromClientX(
          clientX,
          clientY
        );
      });

  }

  function handlePointerDown(event) {

    if (
      event.pointerType === 'mouse'
      && event.button !== 0
    ) {
      return;
    }

    state.active = true;

    if (wrapEl.setPointerCapture) {
      wrapEl.setPointerCapture(event.pointerId);
    }

    schedulePointerUpdate(event);

  }

  function handlePointerMove(event) {

    if (
      !state.active
      && event.pointerType !== 'mouse'
    ) {
      return;
    }

    if (
      event.pointerType === 'mouse'
      && !state.active
    ) {
      state.active = true;
    }

    schedulePointerUpdate(event);

  }

  function handlePointerEnd(event) {

    if (
      wrapEl.releasePointerCapture
      && wrapEl.hasPointerCapture?.(
        event.pointerId
      )
    ) {
      wrapEl.releasePointerCapture(
        event.pointerId
      );
    }

    hideCrosshair();

  }

  function handleResize() {

    if (state.resizeTimer) {
      clearTimeout(state.resizeTimer);
    }

    state.resizeTimer =
      setTimeout(() => {

        state.resizeTimer = 0;
        refreshRect();

        if (
          state.relativeX === null
          || !state.rect
          || state.rect.width <= 0
        ) {
          return;
        }

        const clientX =
          state.rect.left
          + state.relativeX * state.rect.width;

        const clientY =
          state.rect.top
          + state.rect.height / 2;

        applyCrosshairAtRatio(
          state.relativeX,
          clientX,
          clientY
        );

      }, ELEVATION_RESIZE_DEBOUNCE_MS);

  }

  wrapEl.addEventListener(
    'pointerdown',
    handlePointerDown
  );

  wrapEl.addEventListener(
    'pointermove',
    handlePointerMove
  );

  wrapEl.addEventListener(
    'pointerup',
    handlePointerEnd
  );

  wrapEl.addEventListener(
    'pointercancel',
    handlePointerEnd
  );

  wrapEl.addEventListener(
    'pointerleave',
    () => {

      state.active = false;
      hideCrosshair();

    }
  );

  if (
    typeof ResizeObserver === 'function'
  ) {

    state.resizeObserver =
      new ResizeObserver(handleResize);

    state.resizeObserver.observe(wrapEl);

  } else {

    window.addEventListener(
      'resize',
      handleResize
    );

  }

  refreshRect();

  return () => {

    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
    }

    if (state.resizeTimer) {
      clearTimeout(state.resizeTimer);
    }

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
    } else {
      window.removeEventListener(
        'resize',
        handleResize
      );
    }

    wrapEl.removeEventListener(
      'pointerdown',
      handlePointerDown
    );

    wrapEl.removeEventListener(
      'pointermove',
      handlePointerMove
    );

    wrapEl.removeEventListener(
      'pointerup',
      handlePointerEnd
    );

    wrapEl.removeEventListener(
      'pointercancel',
      handlePointerEnd
    );

  };

}

function insertActivityDetailStreamAnalysis(
  container,
  html
) {

  const anchor =
    container.querySelector(
      '#activity-detail-analysis'
    )
    || container.querySelector(
      '.activity-detail-hero'
    )
    || container.querySelector(
      '.activity-detail-header'
    );

  if (anchor) {
    anchor.insertAdjacentHTML(
      'afterend',
      html
    );
    return;
  }

  container.insertAdjacentHTML(
    'beforeend',
    html
  );

}

function mountActivityDetailStreamAnalysis(
  container,
  series
) {

  if (
    !container
    || container.querySelector(
      '#activity-detail-stream-analysis'
    )
  ) {
    return;
  }

  insertActivityDetailStreamAnalysis(
    container,
    renderActivityDetailStreamAnalysis()
  );

  const wrapEl =
    container.querySelector(
      '[data-elevation-profile-chart]'
    );

  if (!wrapEl) {
    return;
  }

  const bindChart = () => {

    if (wrapEl.clientWidth <= 0) {

      requestAnimationFrame(bindChart);
      return;

    }

    bindElevationProfileChart(
      wrapEl,
      series
    );

  };

  bindChart();

}

async function loadActivityDetailStreamAnalysis(
  activityId,
  container
) {

  if (
    !activityId
    || !container
  ) {
    return;
  }

  try {

    const payload =
      await fetchPublicActivityStreams(
        activityId
      );

    if (
      !container.isConnected
    ) {
      return;
    }

    if (!payload) {

      console.warn(
        '[streams] no public stream data',
        { activityId }
      );

      return;

    }

    const validation =
      validateStreamPayloadClient(payload);

    if (!validation.ok) {

      console.warn(
        '[streams] invalid payload',
        {
          activityId,
          reason: validation.reason
        }
      );

      return;

    }

    const series =
      prepareElevationProfileSeries(payload);

    if (!series) {

      console.warn(
        '[streams] elevation series unavailable',
        { activityId }
      );

      return;

    }

    mountActivityDetailStreamAnalysis(
      container,
      series
    );

  } catch (error) {

    console.error(
      '[streams] fetch failed',
      { activityId, error }
    );

  }

}
