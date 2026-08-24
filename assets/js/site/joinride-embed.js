(function initJoinrideEmbeds() {

  const JOINRIDE_CONSENT_KEY =
    'joinrideEmbedConsent';

  function hasConsent() {

    try {

      return sessionStorage.getItem(
        JOINRIDE_CONSENT_KEY
      ) === '1';

    } catch (_error) {

      return false;

    }

  }

  function storeConsent() {

    try {

      sessionStorage.setItem(
        JOINRIDE_CONSENT_KEY,
        '1'
      );

    } catch (_error) {
      /* ignore */
    }

  }

  function loadEmbed(root) {

    if (
      !root
      || root.dataset.joinrideLoaded === '1'
    ) {
      return;
    }

    const src =
      root.dataset.joinrideSrc;

    if (!src) {
      return;
    }

    const title =
      root.dataset.joinrideTitle
      || 'Club-Touren auf JoinRide';

    const height =
      root.dataset.joinrideHeight
      || '460';

    root.innerHTML = '';

    const iframe =
      document.createElement('iframe');

    iframe.src = src;
    iframe.title = title;
    iframe.width = '100%';
    iframe.height = height;
    iframe.loading = 'lazy';
    iframe.referrerPolicy =
      'no-referrer-when-downgrade';
    iframe.setAttribute(
      'style',
      'border:0;overflow:hidden;width:100%;'
    );

    root.appendChild(iframe);
    root.dataset.joinrideLoaded = '1';
    root.classList.add(
      'joinride-embed--loaded'
    );

  }

  function buildPlaceholder(root) {

    const label =
      root.dataset.joinrideLabel
      || 'Nächste Termine von JoinRide laden?';

    const hint =
      root.dataset.joinrideHint
      || 'Erst nach dem Klick wird Inhalt von joinride.cc geladen. Dabei können Daten (z.\u00a0B. IP-Adresse) an JoinRide übermittelt und Cookies gesetzt werden. Details in der Datenschutzerklärung.';

    root.innerHTML = `
<div class="joinride-consent">
  <p class="joinride-consent__text">
    ${hint}
  </p>
  <button
    type="button"
    class="cta-btn joinride-consent__btn">
    ${label}
  </button>
</div>
`;

    const button =
      root.querySelector(
        '.joinride-consent__btn'
      );

    if (!button) {
      return;
    }

    button.addEventListener(
      'click',
      () => {

        storeConsent();
        loadEmbed(root);

      }
    );

  }

  document
    .querySelectorAll(
      '[data-joinride-src]'
    )
    .forEach((root) => {

      if (hasConsent()) {
        loadEmbed(root);
        return;
      }

      buildPlaceholder(root);

    });

})();
