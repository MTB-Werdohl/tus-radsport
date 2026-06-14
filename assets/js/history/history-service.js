function getHistoryTerminDate(termin) {

  if (!termin?.date) {
    return null;
  }

  return new Date(termin.date);

}

function isHistoryEligibleRecap(row) {

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

function getHistoryYear(termin) {

  const date =
    getHistoryTerminDate(termin);

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getFullYear();

}

async function fetchHistoryItems() {

  const rows =
    await fetchPublishedRecapsForHistory();

  return rows
    .filter(isHistoryEligibleRecap)
    .sort((a, b) => {

      const aDate =
        getHistoryTerminDate(a.termin)
        || new Date(0);

      const bDate =
        getHistoryTerminDate(b.termin)
        || new Date(0);

      return bDate - aDate;

    });

}

function collectHistoryYears(items) {

  const years =
    new Set();

  items.forEach((item) => {

    const year =
      getHistoryYear(item.termin);

    if (year) {
      years.add(year);
    }

  });

  return [...years]
    .sort((a, b) => b - a);

}

function filterHistoryByYear(
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
    getHistoryYear(item.termin) === parsed
  );

}

window.fetchHistoryItems =
  fetchHistoryItems;

window.collectHistoryYears =
  collectHistoryYears;

window.filterHistoryByYear =
  filterHistoryByYear;

window.getHistoryYear =
  getHistoryYear;
