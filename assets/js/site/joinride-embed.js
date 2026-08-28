(function initJoinrideEmbeds() {

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
    iframe.className =
      'joinride-embed__frame';

    root.appendChild(iframe);
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
