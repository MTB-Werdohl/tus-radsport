function escapeHistoryHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function renderHistoryYearFilter(
  years,
  activeYear
) {

  const container =
    document.getElementById(
      'history-year-filter'
    );

  if (!container) {
    return;
  }

  if (!years.length) {

    container.innerHTML = '';
    return;

  }

  const buttons =
    [
      {
        label: 'Alle',
        value: ''
      },
      ...years.map((year) => ({
        label: String(year),
        value: String(year)
      }))
    ];

  container.innerHTML =
    buttons
      .map((button) => `

        <button
          type="button"
          class="history-year-button${
            String(activeYear || '')
            === button.value
              ? ' is-active'
              : ''
          }"
          data-year="${escapeHistoryHtml(button.value)}">

          ${escapeHistoryHtml(button.label)}

        </button>

      `)
      .join('');

}

function renderHistoryCards(
  items
) {

  const wrapper =
    document.getElementById(
      'history-cards'
    );

  if (!wrapper) {
    return;
  }

  if (!items?.length) {

    wrapper.innerHTML = `

      <article class="history-card history-card--empty">

        <h3>
          Noch keine Rückblicke
        </h3>

        <p>
          Sobald Veranstaltungen dokumentiert sind,
          erscheinen sie hier.
        </p>

      </article>

    `;

    return;

  }

  wrapper.innerHTML =
    items
      .map((item) => {

        const termin =
          item.termin || {};

        const title =
          item.headline
          || termin.title
          || 'Veranstaltung';

        const dateLabel =
          typeof formatEventDate === 'function'
            ? formatEventDate(termin)
            : '';

        const location =
          termin.location || '';

        const teaser =
          typeof buildRecapTeaser === 'function'
            ? buildRecapTeaser(item.body)
            : '';

        const imageUrl =
          typeof resolveRecapPreviewImage
            === 'function'
            ? resolveRecapPreviewImage(
              item,
              termin
            )
            : null;

        const href =
          typeof getEventUrl === 'function'
            ? getEventUrl(termin.slug)
            : `/event.html?slug=${encodeURIComponent(termin.slug || '')}`;

        const imageHtml =
          imageUrl
            ? `
              <img
                class="history-card-image"
                src="${escapeHistoryHtml(imageUrl)}"
                alt=""
                loading="lazy">
            `
            : '';

        const locationHtml =
          location
            ? `
              <p class="history-card-location">
                📍 ${escapeHistoryHtml(location)}
              </p>
            `
            : '';

        return `
          <article class="history-card">

            <a
              class="history-card-link"
              href="${escapeHistoryHtml(href)}">

              ${imageHtml}

              <div class="history-card-copy">

                <h3>
                  ${escapeHistoryHtml(title)}
                </h3>

                <p class="history-card-meta">
                  ${escapeHistoryHtml(dateLabel)}
                </p>

                ${locationHtml}

                <p class="history-card-teaser">
                  ${escapeHistoryHtml(teaser || 'Mehr lesen')}
                </p>

              </div>

            </a>

          </article>

        `;

      })
      .join('');

}

window.renderHistoryYearFilter =
  renderHistoryYearFilter;

window.renderHistoryCards =
  renderHistoryCards;
