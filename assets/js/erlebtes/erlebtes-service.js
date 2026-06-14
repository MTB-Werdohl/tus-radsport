function getErlebtesTerminDate(termin) {

  if (!termin?.date) {
    return null;
  }

  return new Date(termin.date);

}

function isErlebtesEligibleRecap(row) {

  const termin = row.termin;

  if (!termin) {
    return false;
  }

  if (termin.recurring) {
    return false;
  }

  if (
    termin.sichtbarkeit
    !== window.siteConfig.visibility.public
  ) {
    return false;
  }

  if (
    typeof isTerminStillUpcoming
      === 'function'
    && isTerminStillUpcoming(termin)
  ) {
    return false;
  }

  return true;

}

function getErlebtesYear(termin) {

  const date =
    getErlebtesTerminDate(termin);

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getFullYear();

}

async function fetchErlebtesItems() {

  const rows =
    await fetchPublishedRecapsForErlebtes();

  return rows
    .filter(isErlebtesEligibleRecap)
    .sort((a, b) => {

      const aDate =
        getErlebtesTerminDate(a.termin)
        || new Date(0);

      const bDate =
        getErlebtesTerminDate(b.termin)
        || new Date(0);

      return bDate - aDate;

    });

}

function collectErlebtesYears(items) {

  const years =
    new Set();

  items.forEach((item) => {

    const year =
      getErlebtesYear(item.termin);

    if (year) {
      years.add(year);
    }

  });

  return [...years]
    .sort((a, b) => b - a);

}

function filterErlebtesByYear(
  items,
  year
) {

  if (!year) {
    return items;
  }

  const parsed =
    Number(year);

  if (!Number.isFinite(parsed)) {
    return items;
  }

  return items.filter((item) =>
    getErlebtesYear(item.termin) === parsed
  );

}

window.fetchErlebtesItems =
  fetchErlebtesItems;

window.collectErlebtesYears =
  collectErlebtesYears;

window.filterErlebtesByYear =
  filterErlebtesByYear;

window.getErlebtesYear =
  getErlebtesYear;
