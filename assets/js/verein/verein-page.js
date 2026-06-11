const VEREIN_TABS = [
  'about',
  'ausfahrt',
  'kodex'
];

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
