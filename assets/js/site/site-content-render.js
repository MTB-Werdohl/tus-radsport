function renderGlobalSiteBanner(
  banner
) {

  const container =
    document.getElementById(
      'site-global-banner'
    );

  if (!container) {
    return;
  }

  if (
    !banner
    || !isSiteContentScheduleActive(banner)
    || !banner.text
  ) {

    container.hidden = true;
    container.innerHTML = '';

    return;

  }

  const styleClass =
    banner.style === 'warning'
      ? 'site-global-banner--warning'
      : 'site-global-banner--info';

  const inner =
    banner.url
      ? `<a
          class="site-global-banner__link"
          href="${escapeSiteContentHtml(banner.url)}">
          ${escapeSiteContentHtml(banner.text)}
        </a>`
      : `<span class="site-global-banner__text">
          ${escapeSiteContentHtml(banner.text)}
        </span>`;

  container.hidden = false;

  container.innerHTML = `
<div
  class="site-global-banner ${styleClass}"
  role="status">

  ${inner}

</div>
  `.trim();

}

function applySaisonMode(
  saison
) {

  document.body.classList.remove(
    'site-saison-pause'
  );

  const saisonBannerTarget =
    document.getElementById(
      'site-saison-banner'
    );

  if (saisonBannerTarget) {
    saisonBannerTarget.innerHTML = '';
    saisonBannerTarget.hidden = true;
  }

  renderSaisonOverlay(null);

  if (
    !saison
    || saison.enabled !== true
  ) {
    return;
  }

  document.body.classList.add(
    'site-saison-pause'
  );

  if (
    saison.banner_text
    && saisonBannerTarget
  ) {

    saisonBannerTarget.hidden = false;

    saisonBannerTarget.innerHTML = `
<div
  class="site-saison-banner"
  role="status">

  ${escapeSiteContentHtml(saison.banner_text)}

</div>
    `.trim();

  }

  renderSaisonOverlay(saison);

}

function renderSaisonOverlay(
  saison
) {

  const existing =
    document.getElementById(
      'site-content-overlay'
    );

  if (existing) {
    existing.remove();
  }

  if (
    !saison
    || saison.enabled !== true
    || !saison.overlay_text
  ) {
    return;
  }

  const overlay = {
    active: true,
    title: '',
    text: saison.overlay_text,
    dismissible: true,
    updated_at: saison.updated_at || null
  };

  if (isSiteOverlayDismissed(overlay)) {
    return;
  }

  const dialog =
    document.createElement('dialog');

  dialog.id = 'site-content-overlay';
  dialog.className =
    'site-content-overlay';

  dialog.innerHTML = `
<form method="dialog" class="site-content-overlay__form">

  <div class="site-content-overlay__inner">

    <p class="site-content-overlay__text">
      ${escapeSiteContentHtml(overlay.text)}
    </p>

    <button
      type="submit"
      class="site-content-overlay__close">

      Schließen

    </button>

  </div>

</form>
  `.trim();

  document.body.appendChild(dialog);

  dialog
    .querySelector('form')
    ?.addEventListener(
      'submit',
      (event) => {

        event.preventDefault();

        markSiteOverlayDismissed(overlay);

        dialog.close();
        dialog.remove();

        window.dispatchEvent(
          new CustomEvent(
            'site-overlay-dismissed'
          )
        );

      }
    );

  if (
    typeof dialog.showModal === 'function'
  ) {
    dialog.showModal();
  }

}

function renderLandingHints(
  landingHints
) {

  const container =
    document.getElementById(
      'home-quick-facts'
    );

  if (!container) {
    return;
  }

  const items =
    (landingHints?.items || [])
      .filter((item) =>
        item.active && item.text
      );

  if (!items.length) {
    return;
  }

  container.innerHTML =
    items
      .map((item) => {

        if (item.url) {

          return `
<a
  class="home-quick-facts__link"
  href="${escapeSiteContentHtml(item.url)}">

  <strong>${escapeSiteContentHtml(item.text)}</strong>

</a>
          `.trim();

        }

        return `
<strong>${escapeSiteContentHtml(item.text)}</strong>
        `.trim();

      })
      .join('');

}

function renderSiteOverlay(
  overlay
) {

  const existing =
    document.getElementById(
      'site-content-overlay'
    );

  if (existing) {
    existing.remove();
  }

  if (
    !overlay
    || !isSiteContentScheduleActive(overlay)
    || !overlay.text
    || isSiteOverlayDismissed(overlay)
  ) {
    return;
  }

  const dialog =
    document.createElement('dialog');

  dialog.id = 'site-content-overlay';
  dialog.className =
    'site-content-overlay';

  dialog.innerHTML = `
<form method="dialog" class="site-content-overlay__form">

  <div class="site-content-overlay__inner">

    ${
      overlay.title
        ? `<h2 class="site-content-overlay__title">
            ${escapeSiteContentHtml(overlay.title)}
          </h2>`
        : ''
    }

    <p class="site-content-overlay__text">
      ${escapeSiteContentHtml(overlay.text)}
    </p>

    ${
      overlay.dismissible
        ? `<button
            type="submit"
            class="site-content-overlay__close">

            Schließen

          </button>`
        : ''
    }

  </div>

</form>
  `.trim();

  document.body.appendChild(dialog);

  if (overlay.dismissible) {

    dialog
      .querySelector('form')
      ?.addEventListener(
        'submit',
        (event) => {

          event.preventDefault();

          markSiteOverlayDismissed(overlay);

          dialog.close();
          dialog.remove();

          window.dispatchEvent(
            new CustomEvent(
              'site-overlay-dismissed'
            )
          );

        }
      );

  }

  if (
    typeof dialog.showModal === 'function'
  ) {
    dialog.showModal();
  }

}

async function initPublicSiteContent() {

  if (
    typeof fetchPublicSiteContent
      !== 'function'
  ) {
    return;
  }

  try {

    const content =
      await fetchPublicSiteContent();

    applySaisonMode(
      content.saison
    );

  } catch (error) {

    console.error(error);

  }

  window.__siteContentInitComplete = true;

  window.dispatchEvent(
    new CustomEvent(
      'site-content-init-complete'
    )
  );

}

document.addEventListener(
  'DOMContentLoaded',
  initPublicSiteContent
);
