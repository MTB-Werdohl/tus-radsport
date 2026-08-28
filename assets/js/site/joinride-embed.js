(function initJoinrideEmbeds() {

  const DEFAULT_OPEN_URL =
    'https://joinride.cc/pro/mtb-werdohl/activities';

  function getOpenUrl(root) {

    return root.dataset.joinrideOpenUrl
      || DEFAULT_OPEN_URL;

  }

  function buildOpenLink(root) {

    const openUrl =
      getOpenUrl(root);

    const openLabel =
      root.dataset.joinrideOpenLabel
      || 'Auf JoinRide öffnen';

    const link =
      document.createElement('a');

    link.className =
      'cta-btn joinride-open-btn';
    link.href = openUrl;
    link.target = '_blank';
    link.rel =
      'noopener noreferrer';
    link.textContent = openLabel;

    return link;

  }

  function buildActions(root) {

    const actions =
      document.createElement('div');

    actions.className =
      'joinride-actions';

    actions.appendChild(
      buildOpenLink(root)
    );

    const note =
      document.createElement('p');

    note.className =
      'joinride-actions__note';
    note.textContent =
      'Anmeldung und App laufen auf JoinRide — hier nur die Vorschau.';

    actions.appendChild(note);

    return actions;

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

    const frameWrap =
      document.createElement('div');

    frameWrap.className =
      'joinride-embed__preview';

    const iframe =
      document.createElement('iframe');

    iframe.src = src;
    iframe.title = title;
    iframe.width = '100%';
    iframe.height = height;
    iframe.loading = 'lazy';
    iframe.referrerPolicy =
      'no-referrer-when-downgrade';
    iframe.className =
      'joinride-embed__frame';
    iframe.setAttribute(
      'tabindex',
      '-1'
    );
    iframe.setAttribute(
      'aria-hidden',
      'true'
    );

    frameWrap.appendChild(iframe);
    root.appendChild(frameWrap);
    root.appendChild(
      buildActions(root)
    );

    root.dataset.joinrideLoaded = '1';
    root.classList.add(
      'joinride-embed--loaded'
    );

  }

  document
    .querySelectorAll(
      '[data-joinride-src]'
    )
    .forEach(loadEmbed);

})();
