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

function renderElevationProfileBlock() {

  return renderStreamChartBlock(
    'activity-detail-elevation-profile',
    'Höhenprofil',
    'Höhenprofil entlang der gefahrenen Strecke',
    'data-elevation-profile-chart',
    'elevation-profile'
  );

}

function renderSpeedProfileBlock() {

  return renderStreamChartBlock(
    'activity-detail-speed-profile',
    'Geschwindigkeitsprofil',
    'Tempo entlang der gefahrenen Strecke',
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

  return `
<div class="activity-detail-highlight-card">

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
        renderElevationProfileBlock()
      );
      return;
    }

    if (block.id === 'speed') {
      parts.push(
        renderSpeedProfileBlock()
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
        block.series
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
        block.series
      );

    }

  });

}
