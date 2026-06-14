let erlebtesState = {
  items: [],
  years: [],
  activeYear: ''
};

async function loadErlebtesPage() {

  const cards =
    document.getElementById(
      'erlebtes-cards'
    );

  if (cards) {

    cards.innerHTML =
      '<p class="erlebtes-loading">Lädt …</p>';

  }

  try {

    const items =
      await fetchErlebtesItems();

    erlebtesState.items = items;
    erlebtesState.years =
      collectErlebtesYears(items);

    renderErlebtesYearFilter(
      erlebtesState.years,
      erlebtesState.activeYear
    );

    renderErlebtesCards(
      filterErlebtesByYear(
        items,
        erlebtesState.activeYear
      )
    );

    bindErlebtesYearFilter();

  } catch (error) {

    console.error(error);

    if (cards) {

      cards.innerHTML =
        '<p class="erlebtes-loading">'
        + 'Erlebtes konnte nicht geladen werden.'
        + '</p>';

    }

  }

}

function bindErlebtesYearFilter() {

  const container =
    document.getElementById(
      'erlebtes-year-filter'
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

          erlebtesState.activeYear =
            button.dataset.year || '';

          renderErlebtesYearFilter(
            erlebtesState.years,
            erlebtesState.activeYear
          );

          renderErlebtesCards(
            filterErlebtesByYear(
              erlebtesState.items,
              erlebtesState.activeYear
            )
          );

          bindErlebtesYearFilter();

        }
      );

    });

}

document.addEventListener(
  'DOMContentLoaded',
  loadErlebtesPage
);
