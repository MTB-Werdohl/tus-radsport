const STREAM_CHART_RESIZE_DEBOUNCE_MS = 150;

function buildStreamProfilePath(
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
    STREAM_CHART_VIEWBOX_HEIGHT
    - STREAM_CHART_PLOT_PADDING;

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

function findNearestStreamPointByRatio(
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

  const distanceMinM =
    plotPoints[0].distanceM;

  const distanceMaxM =
    plotPoints[plotPoints.length - 1].distanceM;

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

function bindDistanceSeriesChart(
  wrapEl,
  series,
  config
) {

  const plotPoints =
    series.points;

  const linePath =
    buildStreamProfilePath(
      plotPoints,
      false
    );

  const areaPath =
    buildStreamProfilePath(
      plotPoints,
      true
    );

  const lineEl =
    wrapEl.querySelector(
      config.lineSelector
    );

  const areaEl =
    wrapEl.querySelector(
      config.areaSelector
    );

  const cursorEl =
    wrapEl.querySelector(
      config.cursorSelector
    );

  const cursorDotEl =
    wrapEl.querySelector(
      config.cursorDotSelector
    );

  const tooltipEl =
    wrapEl.querySelector(
      config.tooltipSelector
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
      findNearestStreamPointByRatio(
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
      config.formatTooltip(point);

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

      }, STREAM_CHART_RESIZE_DEBOUNCE_MS);

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

function formatElevationStreamTooltip(
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

function formatSpeedStreamTooltip(
  point
) {

  const distanceLabel =
    typeof formatActivitySplitDistance === 'function'
      ? formatActivitySplitDistance(
        point.distanceM
      )
      : `${Math.round(point.distanceM)} m`;

  const speedLabel =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(
        point.velocityMps
      )
      : '—';

  return `${distanceLabel} · ${speedLabel}`;

}

function bindStreamChartWhenReady(
  wrapEl,
  series,
  config
) {

  if (!wrapEl) {
    return;
  }

  const bindChart = () => {

    if (wrapEl.clientWidth <= 0) {
      requestAnimationFrame(bindChart);
      return;
    }

    bindDistanceSeriesChart(
      wrapEl,
      series,
      config
    );

  };

  bindChart();

}

function bindElevationProfileChart(
  wrapEl,
  series
) {

  bindStreamChartWhenReady(
    wrapEl,
    series,
    {
      lineSelector:
        '[data-elevation-profile-line]',
      areaSelector:
        '[data-elevation-profile-area]',
      cursorSelector:
        '[data-elevation-profile-cursor]',
      cursorDotSelector:
        '[data-elevation-profile-cursor-dot]',
      tooltipSelector:
        '[data-elevation-profile-tooltip]',
      formatTooltip:
        formatElevationStreamTooltip
    }
  );

}

function bindSpeedProfileChart(
  wrapEl,
  series
) {

  bindStreamChartWhenReady(
    wrapEl,
    series,
    {
      lineSelector:
        '[data-speed-profile-line]',
      areaSelector:
        '[data-speed-profile-area]',
      cursorSelector:
        '[data-speed-profile-cursor]',
      cursorDotSelector:
        '[data-speed-profile-cursor-dot]',
      tooltipSelector:
        '[data-speed-profile-tooltip]',
      formatTooltip:
        formatSpeedStreamTooltip
    }
  );

}
