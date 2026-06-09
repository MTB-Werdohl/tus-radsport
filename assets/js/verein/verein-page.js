const VEREIN_TABS = [
  'about',
  'ausfahrt',
  'kodex'
];

const VEREIN_HEADER_IMAGES = {
  about: {
    src: '/assets/images/header/ueberuns.png',
    alt: 'Über uns'
  },
  ausfahrt: {
    src: '/assets/images/header/ausfahrt.png',
    alt: 'Ausfahrt'
  },
  kodex: {
    src: '/assets/images/header/kodex.png',
    alt: 'Kodex'
  }
};

function normalizeVereinTab(tabId) {

  if (
    VEREIN_TABS.includes(tabId)
  ) {
    return tabId;
  }

  return 'about';

}

function getVereinTabFromUrl() {

  const tab =
    new URLSearchParams(
      window.location.search
    ).get('tab');

  return normalizeVereinTab(tab);

}

function updateVereinUrl(tabId) {

  const url =
    new URL(
      window.location.href
    );

  url.searchParams.set(
    'tab',
    tabId
  );

  window.history.replaceState(
    {},
    '',
    `${url.pathname}?${url.searchParams.toString()}`
  );

}

function updateVereinHeader(tabId) {

  const header =
    document.getElementById(
      'verein-header-img'
    );

  const config =
    VEREIN_HEADER_IMAGES[tabId];

  if (
    !header
    || !config
  ) {
    return;
  }

  header.src = config.src;
  header.alt = config.alt;

}

function switchVereinTab(tabId) {

  const activeTab =
    normalizeVereinTab(tabId);

  document
    .querySelectorAll('[data-verein-tab]')
    .forEach((button) => {

      const isActive =
        button.dataset.vereinTab === activeTab;

      button.classList.toggle(
        'is-active',
        isActive
      );

      button.setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );

    });

  document
    .querySelectorAll('[data-verein-panel]')
    .forEach((panel) => {

      panel.hidden =
        panel.dataset.vereinPanel !== activeTab;

    });

  updateVereinHeader(activeTab);
  updateVereinUrl(activeTab);

}

function bindVereinTabEvents() {

  document
    .querySelectorAll('[data-verein-tab]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          switchVereinTab(
            button.dataset.vereinTab
          );

        }
      );

    });

  document
    .querySelectorAll('a[data-verein-tab-link]')
    .forEach((link) => {

      link.addEventListener(
        'click',
        (event) => {

          event.preventDefault();

          switchVereinTab(
            link.dataset.vereinTabLink
          );

        }
      );

    });

}

function initVereinPage() {

  bindVereinTabEvents();
  switchVereinTab(
    getVereinTabFromUrl()
  );

}

document.addEventListener(
  'DOMContentLoaded',
  initVereinPage
);
