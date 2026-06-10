const CALENDAR_VIEW_MONTH_KEY =
  'mtb-calendar-view-month';

function formatCalendarViewMonth(date) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  return `${year}-${month}`;

}

function parseCalendarViewMonth(value) {

  if (
    !value
    || !/^\d{4}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const [
    year,
    month
  ] = value.split('-').map(Number);

  if (
    month < 1
    || month > 12
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    1
  );

}

function saveCalendarViewMonth(date) {

  if (
    !date
    || Number.isNaN(date.getTime())
  ) {
    return;
  }

  try {

    sessionStorage.setItem(
      CALENDAR_VIEW_MONTH_KEY,
      formatCalendarViewMonth(date)
    );

  } catch (error) {

    /* ignore storage errors */

  }

}

function getCalendarViewMonth() {

  try {

    return sessionStorage.getItem(
      CALENDAR_VIEW_MONTH_KEY
    );

  } catch (error) {

    return null;

  }

}

function getCalendarMonthFromLocation() {

  return new URLSearchParams(
    window.location.search
  ).get('month');

}

function resolveCalendarViewMonth() {

  const fromLocation =
    getCalendarMonthFromLocation();

  if (fromLocation) {
    return fromLocation;
  }

  return getCalendarViewMonth();

}

function getCalendarUrl(monthValue) {

  const month =
    monthValue
    || resolveCalendarViewMonth();

  if (month) {
    return `/kalender/?month=${month}`;
  }

  return '/kalender/';

}
