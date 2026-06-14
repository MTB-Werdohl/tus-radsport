function escapeErlebtesHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function renderErlebtesYearFilter(
  years,
  activeYear
) {

  const container =
    document.getElementById(
      'erlebtes-year-filter'
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
          class="erlebtes-year-button${
            String(activeYear || '')
            === button.value
              ? ' is-active'
              : ''
          }"
          data-year="${escapeErlebtesHtml(button.value)}">

          ${escapeErlebtesHtml(button.label)}

        </button>

      `)
      .join('');

}

function renderErlebtesCards(
  items
) {

  const wrapper =
    document.getElementById(
      'erlebtes-cards'
    );

  if (!wrapper) {
    return;
  }

  if (!items?.length) {

    wrapper.innerHTML = `

      <article class="erlebtes-card erlebtes-card--empty">

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

        const teaser =
          typeof buildRecapTeaser === 'function'
            ? buildRecapTeaser(
              item.body,
              10000
            )
            : String(item.body || '').trim();

        const imageUrl =
          typeof resolveRecapPreviewImage
            === 'function'
            ? resolveRecapPreviewImage(
              item,
              termin
            )
            : null;

        const baseHref =
          typeof getEventUrl === 'function'
            ? getEventUrl(termin.slug)
            : `/event.html?slug=${encodeURIComponent(termin.slug || '')}`;

        const href =
          `${baseHref}${baseHref.includes('?') ? '&' : '?'}from=erlebtes#event-recap`;

        const imageHtml =
          imageUrl
            ? `
              <div class="erlebtes-card-media">
                <img
                  class="erlebtes-card-image"
                  src="${escapeErlebtesHtml(imageUrl)}"
                  alt=""
                  loading="lazy">
              </div>
            `
            : `
              <div class="erlebtes-card-media erlebtes-card-media--empty"></div>
            `;

        return `
          <article class="erlebtes-card">

            <a
              class="erlebtes-card-link"
              href="${escapeErlebtesHtml(href)}">

              ${imageHtml}

              <div class="erlebtes-card-copy">

                <h3>
                  ${escapeErlebtesHtml(title)}
                </h3>

                <p class="erlebtes-card-meta">
                  ${escapeErlebtesHtml(dateLabel)}
                </p>

                <p class="erlebtes-card-teaser">
                  ${escapeErlebtesHtml(teaser || 'Mehr lesen')}
                </p>

              </div>

            </a>

          </article>

        `;

      })
      .join('');

}

window.renderErlebtesYearFilter =
  renderErlebtesYearFilter;

window.renderErlebtesCards =
  renderErlebtesCards;
