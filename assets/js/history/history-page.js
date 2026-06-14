let historyState = {
  items: [],
  years: [],
  activeYear: ''
};

async function loadHistoryPage() {

  const cards =
    document.getElementById(
      'history-cards'
    );

  if (cards) {

    cards.innerHTML =
      '<p class="history-loading">Lädt …</p>';

  }

  try {

    const items =
      await fetchHistoryItems();

    historyState.items = items;
    historyState.years =
      collectHistoryYears(items);

    renderHistoryYearFilter(
      historyState.years,
      historyState.activeYear
    );

    renderHistoryCards(
      filterHistoryByYear(
        items,
        historyState.activeYear
      )
    );

    bindHistoryYearFilter();

  } catch (error) {

    console.error(error);

    if (cards) {

      cards.innerHTML =
        '<p class="history-loading">'
        + 'Historie konnte nicht geladen werden.'
        + '</p>';

    }

  }

}

function bindHistoryYearFilter() {

  const container =
    document.getElementById(
      'history-year-filter'
    );

  if (!container) {
    return;
  }

  container
    .querySelectorAll('[data-year]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          historyState.activeYear =
            button.dataset.year || '';

          renderHistoryYearFilter(
            historyState.years,
            historyState.activeYear
          );

          renderHistoryCards(
            filterHistoryByYear(
              historyState.items,
              historyState.activeYear
            )
          );

          bindHistoryYearFilter();

        }
      );

    });

}

document.addEventListener(
  'DOMContentLoaded',
  loadHistoryPage
);
