function toDatetimeLocalValue(value) {

  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad =
    (part) =>
      String(part).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-')
    + 'T'
    + pad(date.getHours())
    + ':'
    + pad(date.getMinutes());

}

function fromDatetimeLocalValue(value) {

  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();

}

function setSiteContentStatus(
  elementId,
  message,
  isError
) {

  const el =
    document.getElementById(elementId);

  if (!el) {
    return;
  }

  el.textContent = message || '';
  el.classList.toggle(
    'admin-hint--error',
    !!isError
  );

}

function switchSiteContentTab(tabId) {

  document
    .querySelectorAll('[data-site-content-tab]')
    .forEach((button) => {

      button.classList.toggle(
        'is-active',
        button.dataset.siteContentTab === tabId
      );

    });

  document
    .querySelectorAll('[data-site-content-panel]')
    .forEach((panel) => {

      panel.hidden =
        panel.dataset.siteContentPanel !== tabId;

    });

}

function bindSiteContentTabs() {

  document
    .querySelectorAll('[data-site-content-tab]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          switchSiteContentTab(
            button.dataset.siteContentTab
          );

        }
      );

    });

}

function renderLandingHintRow(
  item,
  index
) {

  return `
<div
  class="site-landing-item"
  data-landing-index="${index}">

  <label>
    <input
      type="checkbox"
      data-landing-active
      ${item?.active !== false ? 'checked' : ''}>
    Aktiv
  </label>

  <label>
    Text
    <input
      type="text"
      data-landing-text
      maxlength="160"
      value="${escapeAdminHtml(item?.text || '')}">
  </label>

  <label>
    Link (optional)
    <input
      type="text"
      data-landing-url
      value="${escapeAdminHtml(item?.url || '')}">
  </label>

  <button
    type="button"
    class="site-landing-remove"
    data-landing-remove>

    Entfernen

  </button>

</div>
  `.trim();

}

function bindLandingHintRows() {

  const container =
    document.getElementById(
      'site-landing-items'
    );

  if (!container) {
    return;
  }

  container
    .querySelectorAll('[data-landing-remove]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          button
            .closest('.site-landing-item')
            ?.remove();

          if (
            typeof window.adminUnsavedGuard
              ?.markDirty === 'function'
          ) {
            window.adminUnsavedGuard.markDirty();
          }

        }
      );

    });

}

function readLandingHintItems() {

  return Array
    .from(
      document.querySelectorAll(
        '.site-landing-item'
      )
    )
    .map((row) => ({

      active:
        row
          .querySelector('[data-landing-active]')
          ?.checked !== false,

      text:
        row
          .querySelector('[data-landing-text]')
          ?.value
          .trim() || '',

      url:
        row
          .querySelector('[data-landing-url]')
          ?.value
          .trim() || ''

    }))
    .filter((item) => item.text);

}

function populateLandingHints(
  landingHints
) {

  const container =
    document.getElementById(
      'site-landing-items'
    );

  if (!container) {
    return;
  }

  const items =
    landingHints?.items?.length
      ? landingHints.items
      : [{ text: '', url: '', active: true }];

  container.innerHTML =
    items
      .map(renderLandingHintRow)
      .join('');

  bindLandingHintRows();

}

async function loadSiteBannerForm() {

  const banner =
    await getSiteBannerState();

  document
    .getElementById('site-banner-active')
    .checked = banner?.active === true;

  document
    .getElementById('site-banner-text')
    .value = banner?.text || '';

  document
    .getElementById('site-banner-url')
    .value = banner?.url || '';

  document
    .getElementById('site-banner-style')
    .value = banner?.style || 'info';

  document
    .getElementById('site-banner-starts')
    .value =
      toDatetimeLocalValue(
        banner?.starts_at
      );

  document
    .getElementById('site-banner-ends')
    .value =
      toDatetimeLocalValue(
        banner?.ends_at
      );

}

async function loadSaisonForm() {

  const saison =
    await getSaisonModeState();

  const bannerActiveInput =
    document.getElementById(
      'site-saison-banner-active'
    );

  const overlayActiveInput =
    document.getElementById(
      'site-saison-overlay-active'
    );

  if (
    bannerActiveInput
    && overlayActiveInput
  ) {

    bannerActiveInput.checked =
      saison?.banner_active === true;

    overlayActiveInput.checked =
      saison?.overlay_active === true;

    document
      .getElementById('site-saison-banner-text')
      .value = saison?.banner_text || '';

    document
      .getElementById('site-saison-overlay-text')
      .value = saison?.overlay_text || '';

    return;

  }

  const legacyEnabledInput =
    document.getElementById('site-saison-enabled');

  if (legacyEnabledInput) {

    legacyEnabledInput.checked =
      saison?.banner_active === true
      && saison?.overlay_active === true;

    document
      .getElementById('site-saison-banner-text')
      .value = saison?.banner_text || '';

    document
      .getElementById('site-saison-overlay-text')
      .value = saison?.overlay_text || '';

    return;

  }

  document
    .getElementById('site-saison-mode')
    .value =
      saison?.banner_active
      || saison?.overlay_active
        ? 'pause'
        : 'active';

  document
    .getElementById('site-saison-message')
    .value = saison?.banner_text || '';

  document
    .getElementById('site-saison-starts')
    .value =
      toDatetimeLocalValue(
        saison?.starts_at
      );

  document
    .getElementById('site-saison-ends')
    .value =
      toDatetimeLocalValue(
        saison?.ends_at
      );

}

async function loadOverlayForm() {

  const overlay =
    await getSiteOverlayState();

  document
    .getElementById('site-overlay-active')
    .checked = overlay?.active === true;

  document
    .getElementById('site-overlay-title')
    .value = overlay?.title || '';

  document
    .getElementById('site-overlay-text')
    .value = overlay?.text || '';

  document
    .getElementById('site-overlay-dismissible')
    .checked = overlay?.dismissible !== false;

  document
    .getElementById('site-overlay-starts')
    .value =
      toDatetimeLocalValue(
        overlay?.starts_at
      );

  document
    .getElementById('site-overlay-ends')
    .value =
      toDatetimeLocalValue(
        overlay?.ends_at
      );

}

function bindSiteBannerForm() {

  document
    .getElementById('site-banner-form')
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        setSiteContentStatus(
          'site-banner-status',
          'Speichern …'
        );

        const ok =
          await saveSiteBannerState({

            active:
              document
                .getElementById('site-banner-active')
                .checked,

            text:
              document
                .getElementById('site-banner-text')
                .value
                .trim(),

            url:
              document
                .getElementById('site-banner-url')
                .value
                .trim(),

            style:
              document
                .getElementById('site-banner-style')
                .value,

            starts_at:
              fromDatetimeLocalValue(
                document
                  .getElementById('site-banner-starts')
                  .value
              ),

            ends_at:
              fromDatetimeLocalValue(
                document
                  .getElementById('site-banner-ends')
                  .value
              )

          });

        setSiteContentStatus(
          'site-banner-status',
          ok
            ? '✅ Banner gespeichert'
            : '❌ Speichern fehlgeschlagen',
          !ok
        );

        if (
          ok
          && typeof window.adminUnsavedGuard
            ?.markClean === 'function'
        ) {
          window.adminUnsavedGuard.markClean();
        }

      }
    );

}

function bindSaisonForm() {

  document
    .getElementById('site-saison-form')
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        setSiteContentStatus(
          'site-saison-status',
          'Speichern …'
        );

        const bannerActiveInput =
          document.getElementById(
            'site-saison-banner-active'
          );

        const overlayActiveInput =
          document.getElementById(
            'site-saison-overlay-active'
          );

        const legacyEnabledInput =
          document.getElementById(
            'site-saison-enabled'
          );

        const ok =
          bannerActiveInput
          && overlayActiveInput
            ? await saveSaisonModeState({

              banner_active:
                bannerActiveInput.checked,

              overlay_active:
                overlayActiveInput.checked,

              banner_text:
                document
                  .getElementById(
                    'site-saison-banner-text'
                  )
                  .value
                  .trim(),

              overlay_text:
                document
                  .getElementById(
                    'site-saison-overlay-text'
                  )
                  .value
                  .trim()

            })
            : legacyEnabledInput
              ? await saveSaisonModeState({

                banner_active:
                  legacyEnabledInput.checked,

                overlay_active:
                  legacyEnabledInput.checked,

                banner_text:
                  document
                    .getElementById(
                      'site-saison-banner-text'
                    )
                    .value
                    .trim(),

                overlay_text:
                  document
                    .getElementById(
                      'site-saison-overlay-text'
                    )
                    .value
                    .trim()

              })
            : await saveSaisonModeState({

              banner_active:
                document
                  .getElementById('site-saison-mode')
                  .value === 'pause',

              overlay_active:
                document
                  .getElementById('site-saison-mode')
                  .value === 'pause',

              banner_text:
                document
                  .getElementById('site-saison-message')
                  .value
                  .trim(),

              overlay_text:
                document
                  .getElementById('site-saison-message')
                  .value
                  .trim(),

              starts_at:
                fromDatetimeLocalValue(
                  document
                    .getElementById('site-saison-starts')
                    .value
                ),

              ends_at:
                fromDatetimeLocalValue(
                  document
                    .getElementById('site-saison-ends')
                    .value
                )

            });

        setSiteContentStatus(
          'site-saison-status',
          ok
            ? '✅ Saisonmodus gespeichert'
            : '❌ Speichern fehlgeschlagen',
          !ok
        );

        if (
          ok
          && typeof window.adminUnsavedGuard
            ?.markClean === 'function'
        ) {
          window.adminUnsavedGuard.markClean();
        }

      }
    );

}

function bindLandingForm() {

  document
    .getElementById('site-landing-add')
    ?.addEventListener(
      'click',
      () => {

        const container =
          document.getElementById(
            'site-landing-items'
          );

        if (!container) {
          return;
        }

        const index =
          container
            .querySelectorAll('.site-landing-item')
            .length;

        if (index >= 5) {
          return;
        }

        container.insertAdjacentHTML(
          'beforeend',
          renderLandingHintRow(
            { text: '', url: '', active: true },
            index
          )
        );

        bindLandingHintRows();

        if (
          typeof window.adminUnsavedGuard
            ?.markDirty === 'function'
        ) {
          window.adminUnsavedGuard.markDirty();
        }

      }
    );

  document
    .getElementById('site-landing-form')
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        setSiteContentStatus(
          'site-landing-status',
          'Speichern …'
        );

        const ok =
          await saveLandingHintsToDb({
            items: readLandingHintItems()
          });

        setSiteContentStatus(
          'site-landing-status',
          ok
            ? '✅ Landing-Hinweise gespeichert'
            : '❌ Speichern fehlgeschlagen',
          !ok
        );

        if (
          ok
          && typeof window.adminUnsavedGuard
            ?.markClean === 'function'
        ) {
          window.adminUnsavedGuard.markClean();
        }

      }
    );

}

function bindOverlayForm() {

  document
    .getElementById('site-overlay-form')
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        setSiteContentStatus(
          'site-overlay-status',
          'Speichern …'
        );

        const ok =
          await saveSiteOverlayState({

            active:
              document
                .getElementById('site-overlay-active')
                .checked,

            title:
              document
                .getElementById('site-overlay-title')
                .value
                .trim(),

            text:
              document
                .getElementById('site-overlay-text')
                .value
                .trim(),

            dismissible:
              document
                .getElementById('site-overlay-dismissible')
                .checked,

            starts_at:
              fromDatetimeLocalValue(
                document
                  .getElementById('site-overlay-starts')
                  .value
              ),

            ends_at:
              fromDatetimeLocalValue(
                document
                  .getElementById('site-overlay-ends')
                  .value
              )

          });

        setSiteContentStatus(
          'site-overlay-status',
          ok
            ? '✅ Overlay gespeichert'
            : '❌ Speichern fehlgeschlagen',
          !ok
        );

        if (
          ok
          && typeof window.adminUnsavedGuard
            ?.markClean === 'function'
        ) {
          window.adminUnsavedGuard.markClean();
        }

      }
    );

}

async function initSiteContentAdminPage() {

  if (
    typeof initAdminUnsavedGuard === 'function'
  ) {
    initAdminUnsavedGuard();
  }

  if (
    document.querySelector('[data-site-content-tab]')
  ) {
    bindSiteContentTabs();
  }

  if (
    document.getElementById('site-banner-form')
  ) {
    bindSiteBannerForm();
  }

  if (
    document.getElementById('site-saison-form')
  ) {
    bindSaisonForm();
  }

  if (
    document.getElementById('site-landing-form')
  ) {
    bindLandingForm();
  }

  if (
    document.getElementById('site-overlay-form')
  ) {
    bindOverlayForm();
  }

  const loads = [];

  if (
    document.getElementById('site-banner-form')
  ) {
    loads.push(loadSiteBannerForm());
  }

  if (
    document.getElementById('site-saison-form')
  ) {
    loads.push(loadSaisonForm());
  }

  if (
    document.getElementById('site-overlay-form')
  ) {
    loads.push(loadOverlayForm());
  }

  if (
    document.getElementById('site-landing-items')
  ) {
    loads.push(
      getLandingHintsState().then(
        populateLandingHints
      )
    );
  }

  await Promise.all(loads);

}
