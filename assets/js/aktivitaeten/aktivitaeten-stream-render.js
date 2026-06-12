function escapeStreamAnalysisHtml(value) {

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

function renderStreamChartBlock(
  blockClass,
  title,
  ariaLabel,
  chartDataAttr,
  prefix
) {

  return `
<div class="activity-detail-stream-analysis__block ${blockClass}">

  <h2 class="activity-detail-section-title">
    ${escapeStreamAnalysisHtml(title)}
  </h2>

  <div
    class="activity-detail-stream-chart__chart-wrap"
    ${chartDataAttr}
    role="img"
    aria-label="${escapeStreamAnalysisHtml(ariaLabel)}">

    <svg
      class="activity-detail-stream-chart__svg"
      viewBox="0 0 ${STREAM_CHART_VIEWBOX_WIDTH} ${STREAM_CHART_VIEWBOX_HEIGHT}"
      preserveAspectRatio="none"
      aria-hidden="true">

      <path
        class="activity-detail-stream-chart__area"
        data-${prefix}-area
        d=""></path>

      <path
        class="activity-detail-stream-chart__line"
        data-${prefix}-line
        d=""></path>

      <line
        class="activity-detail-stream-chart__cursor"
        data-${prefix}-cursor
        x1="0"
        y1="${STREAM_CHART_PLOT_PADDING}"
        x2="0"
        y2="${STREAM_CHART_VIEWBOX_HEIGHT - STREAM_CHART_PLOT_PADDING}"
        visibility="hidden"></line>

      <circle
        class="activity-detail-stream-chart__cursor-dot"
        data-${prefix}-cursor-dot
        r="4"
        cx="0"
        cy="0"
        visibility="hidden"></circle>

    </svg>

    <div
      class="activity-detail-stream-chart__tooltip"
      data-${prefix}-tooltip
      hidden
      aria-hidden="true"></div>

  </div>

</div>
  `;

}

function buildElevationChartAriaLabel(
  series
) {

  const bounds =
    series?.bounds;

  if (!bounds) {
    return 'Höhenprofil entlang der gefahrenen Strecke';
  }

  const range =
    typeof formatElevationRange === 'function'
      ? formatElevationRange(
        bounds.altitudeMinM,
        bounds.altitudeMaxM
      )
      : null;

  const distance =
    typeof formatActivityDistance === 'function'
      ? formatActivityDistance(
        bounds.distanceMaxM
      )
      : null;

  if (
    range?.label
    && distance
    && distance !== '—'
  ) {
    return (
      `Höhenprofil, ${range.label}, Strecke ${distance}`
    );
  }

  return 'Höhenprofil entlang der gefahrenen Strecke';

}

function buildSpeedChartAriaLabel(
  series
) {

  const bounds =
    series?.bounds;

  if (!bounds) {
    return 'Tempo entlang der gefahrenen Strecke';
  }

  const maxSpeed =
    typeof formatActivitySpeed === 'function'
      ? formatActivitySpeed(
        bounds.velocityMaxMps
      )
      : null;

  const distance =
    typeof formatActivityDistance === 'function'
      ? formatActivityDistance(
        bounds.distanceMaxM
      )
      : null;

  if (
    maxSpeed
    && maxSpeed !== '—'
    && distance
    && distance !== '—'
  ) {
    return (
      `Tempo entlang der Strecke ${distance}, Höchsttempo ${maxSpeed}`
    );
  }

  return 'Tempo entlang der gefahrenen Strecke';

}

function renderElevationProfileBlock(
  series
) {

  return renderStreamChartBlock(
    'activity-detail-elevation-profile',
    'Höhenprofil',
    buildElevationChartAriaLabel(series),
    'data-elevation-profile-chart',
    'elevation-profile'
  );

}

function renderSpeedProfileBlock(
  series
) {

  return renderStreamChartBlock(
    'activity-detail-speed-profile',
    'Geschwindigkeitsprofil',
    buildSpeedChartAriaLabel(series),
    'data-speed-profile-chart',
    'speed-profile'
  );

}

function renderStreamHighlightCard(
  highlight
) {

  const escape =
    escapeStreamAnalysisHtml;

  const secondaryHtml =
    highlight.secondary
      ? `
<p class="activity-detail-highlight-card__secondary">
  ${escape(highlight.secondary)}
</p>
      `
      : '';

  const hasMapSegment =
    Array.isArray(highlight.startLatLng)
    && highlight.startLatLng.length >= 2
    && Array.isArray(highlight.endLatLng)
    && highlight.endLatLng.length >= 2;

  const interactiveClass =
    hasMapSegment
      ? ' activity-detail-highlight-card--map-sync'
      : '';

  const interactiveAttrs =
    hasMapSegment
      ? `
    tabindex="0"
    role="button"
    aria-label="${escape(`${highlight.title} auf der Karte anzeigen`)}"
      `
      : '';

  return `
<div class="activity-detail-highlight-card${interactiveClass}"${interactiveAttrs}>

  <p class="activity-detail-highlight-card__title">
    ${escape(highlight.title)}
  </p>

  <p class="activity-detail-highlight-card__km">
    ${escape(highlight.km)}
  </p>

  <p class="activity-detail-highlight-card__primary">
    ${escape(highlight.primary)}
  </p>

  ${secondaryHtml}

</div>
  `;

}

function renderStreamHighlightsBlock(
  highlights
) {

  if (
    !highlights
    || !highlights.length
  ) {
    return '';
  }

  const cards =
    highlights
      .map(renderStreamHighlightCard)
      .join('');

  return `
<div class="activity-detail-stream-analysis__block activity-detail-stream-highlights">

  <h2 class="activity-detail-section-title">
    Strecken-Highlights
  </h2>

  <div class="activity-detail-highlights-grid">
    ${cards}
  </div>

</div>
  `;

}

function renderStreamAnalysisSection(
  blocks
) {

  const parts = [];

  blocks.forEach((block) => {

    if (block.id === 'elevation') {
      parts.push(
        renderElevationProfileBlock(
          block.series
        )
      );
      return;
    }

    if (block.id === 'speed') {
      parts.push(
        renderSpeedProfileBlock(
          block.series
        )
      );
      return;
    }

    if (block.id === 'highlights') {
      parts.push(
        renderStreamHighlightsBlock(
          block.highlights
        )
      );
    }

  });

  if (!parts.length) {
    return '';
  }

  return `
<section
  id="activity-detail-stream-analysis"
  class="activity-detail-stream-analysis"
  aria-label="Streckenprofil">

  ${parts.join('')}

</section>
  `;

}

function insertActivityDetailStreamAnalysis(
  container,
  html
) {

  const contentColumn =
    container.querySelector(
      '.activity-detail-scroll-sync__content'
    );

  if (contentColumn) {
    contentColumn.insertAdjacentHTML(
      'beforeend',
      html
    );
    return;
  }

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

function clearStreamHighlightCardSelection(
  container
) {

  container
    .querySelectorAll(
      '.activity-detail-highlight-card--active'
    )
    .forEach((card) => {
      card.classList.remove(
        'activity-detail-highlight-card--active'
      );
    });

}

function buildStreamChartMapSyncOptions(
  mapSync,
  container
) {

  if (!mapSync) {
    return {};
  }

  return {
    onPointActive(point) {

      mapSync.clearSegmentHighlight();

      clearStreamHighlightCardSelection(
        container
      );

      if (point?.latlng) {
        mapSync.showProfilePoint(
          point.latlng
        );
      }

    },
    onPointInactive() {
      mapSync.hideProfilePoint();
    }
  };

}

function bindStreamHighlightMapSync(
  container,
  highlights,
  mapSync
) {

  if (
    !container
    || !mapSync
    || !highlights?.length
  ) {
    return;
  }

  const cards =
    container.querySelectorAll(
      '.activity-detail-stream-highlights .activity-detail-highlight-card--map-sync'
    );

  cards.forEach((card, index) => {

    const highlight =
      highlights[index];

    if (
      !highlight?.startLatLng
      || !highlight?.endLatLng
    ) {
      return;
    }

    function activateHighlight() {

      mapSync.hideProfilePoint();

      mapSync.showSegmentHighlight(
        highlight.startLatLng,
        highlight.endLatLng
      );

      clearStreamHighlightCardSelection(
        container
      );

      card.classList.add(
        'activity-detail-highlight-card--active'
      );

    }

    card.addEventListener(
      'click',
      activateHighlight
    );

    card.addEventListener(
      'keydown',
      (event) => {

        if (
          event.key !== 'Enter'
          && event.key !== ' '
        ) {
          return;
        }

        event.preventDefault();
        activateHighlight();

      }
    );

  });

}

function mountStreamAnalysisSection(
  container,
  blocks
) {

  if (
    !container
    || !blocks.length
    || container.querySelector(
      '#activity-detail-stream-analysis'
    )
  ) {
    return;
  }

  const html =
    renderStreamAnalysisSection(blocks);

  if (!html) {
    return;
  }

  insertActivityDetailStreamAnalysis(
    container,
    html
  );

  const mapSync =
    typeof createActivityDetailStreamMapSync
      === 'function'
      ? createActivityDetailStreamMapSync(
        container
      )
      : null;

  const chartSyncOptions =
    buildStreamChartMapSyncOptions(
      mapSync,
      container
    );

  blocks.forEach((block) => {

    if (
      block.id === 'elevation'
    ) {

      const wrapEl =
        container.querySelector(
          '[data-elevation-profile-chart]'
        );

      bindElevationProfileChart(
        wrapEl,
        block.series,
        chartSyncOptions
      );

      return;

    }

    if (
      block.id === 'speed'
    ) {

      const wrapEl =
        container.querySelector(
          '[data-speed-profile-chart]'
        );

      bindSpeedProfileChart(
        wrapEl,
        block.series,
        chartSyncOptions
      );

      return;

    }

    if (
      block.id === 'highlights'
    ) {

      bindStreamHighlightMapSync(
        container,
        block.highlights,
        mapSync
      );

    }

  });

  if (
    mapSync
    && typeof refreshActivityDetailMapSize
      === 'function'
  ) {
    refreshActivityDetailMapSize(container);
  }

}
