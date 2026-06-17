const TERMIN_WEEKDAYS = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag'
];

function parseTerminDateOnly(value) {

  if (!value) {
    return null;
  }

  const datePart =
    String(value).slice(0, 10);

  const parts =
    datePart.split('-').map(Number);

  if (
    parts.length !== 3
    || !parts[0]
    || !parts[1]
    || !parts[2]
  ) {
    return null;
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );

}

function startOfTerminDay(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

}

function addTerminDays(date, amount) {

  const copy =
    new Date(date);

  copy.setDate(
    copy.getDate() + amount
  );

  return copy;

}

function formatTerminDayMonth(date) {

  const day =
    String(date.getDate())
      .padStart(2, '0');

  const month =
    String(date.getMonth() + 1)
      .padStart(2, '0');

  return `${day}.${month}`;

}

function formatTerminFullDate(date) {

  return date.toLocaleDateString(
    'de-DE',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
  );

}

function formatTerminWeekdayDate(date) {

  return date.toLocaleDateString(
    'de-DE',
    {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    }
  );

}

function formatTerminIsoDate(
  date
) {

  return (
    `${date.getFullYear()}-${
      String(date.getMonth() + 1)
        .padStart(2, '0')
    }-${
      String(date.getDate())
        .padStart(2, '0')
    }`
  );

}

function isRecurringTermin(
  event
) {

  return event?.recurring === true;

}

function getRecurringTerminExcludeDates(
  event
) {

  const raw =
    event?.exclude;

  if (!raw) {
    return new Set();
  }

  if (Array.isArray(raw)) {
    return new Set(
      raw.map(String)
    );
  }

  return new Set();

}

function getRecurringTerminStartDay(
  event
) {

  return (
    parseTerminDateOnly(
      event?.startRecur
    )
    || getSingleTerminStartDay(event)
  );

}

function getRecurringTerminEndDay(
  event
) {

  return (
    parseTerminDateOnly(
      event?.endRecur
    )
    || null
  );

}

function isRecurringOccurrenceDay(
  event,
  day
) {

  const exclude =
    getRecurringTerminExcludeDates(
      event
    );

  const dateKey =
    formatTerminIsoDate(day);

  if (exclude.has(dateKey)) {
    return false;
  }

  const daysOfWeek =
    event?.daysOfWeek;

  if (
    Array.isArray(daysOfWeek)
    && daysOfWeek.length
  ) {
    return daysOfWeek.includes(
      day.getDay()
    );
  }

  return true;

}

function recurringTerminHasOccurrenceInRange(
  event,
  rangeStart,
  rangeEnd
) {

  const seriesStart =
    getRecurringTerminStartDay(
      event
    );

  if (!seriesStart) {
    return false;
  }

  const seriesEnd =
    getRecurringTerminEndDay(event);

  let current =
    startOfTerminDay(
      rangeStart > seriesStart
        ? rangeStart
        : seriesStart
    );

  const endDay =
    startOfTerminDay(rangeEnd);

  while (current < endDay) {

    if (
      seriesEnd
      && current > seriesEnd
    ) {
      break;
    }

    if (
      isRecurringOccurrenceDay(
        event,
        current
      )
    ) {
      return true;
    }

    current =
      addTerminDays(current, 1);

  }

  return false;

}

function getNextRecurringOccurrenceDay(
  event,
  fromDate
) {

  const fromDay =
    startOfTerminDay(
      fromDate || new Date()
    );

  const seriesStart =
    getRecurringTerminStartDay(
      event
    );

  if (!seriesStart) {
    return null;
  }

  const seriesEnd =
    getRecurringTerminEndDay(event);

  let current =
    fromDay < seriesStart
      ? seriesStart
      : fromDay;

  const scanLimit =
    addTerminDays(fromDay, 370);

  const stopDay =
    seriesEnd
    && seriesEnd < scanLimit
      ? addTerminDays(seriesEnd, 1)
      : scanLimit;

  while (current < stopDay) {

    if (
      isRecurringOccurrenceDay(
        event,
        current
      )
    ) {
      return current;
    }

    current =
      addTerminDays(current, 1);

  }

  return null;

}

function terminListingOverlapsRange(
  event,
  rangeStart,
  rangeEnd
) {

  if (isRecurringTermin(event)) {

    return recurringTerminHasOccurrenceInRange(
      event,
      rangeStart,
      rangeEnd
    );

  }

  return singleTerminOverlapsRange(
    event,
    rangeStart,
    rangeEnd
  );

}

function getSingleTerminStartDay(event) {

  if (!event?.date) {
    return null;
  }

  return startOfTerminDay(
    new Date(event.date)
  );

}

function getSingleTerminEndDay(event) {

  const parsedEnd =
    parseTerminDateOnly(event?.endDate);

  if (parsedEnd) {
    return parsedEnd;
  }

  return getSingleTerminStartDay(event);

}

function isMultiDaySingleTermin(event) {

  const start =
    getSingleTerminStartDay(event);

  const end =
    getSingleTerminEndDay(event);

  if (!start || !end) {
    return false;
  }

  return end.getTime() > start.getTime();

}

function formatTerminDayRange(
  start,
  end
) {

  if (
    !start
    || !end
    || start.getTime() === end.getTime()
  ) {
    return formatTerminFullDate(start || end);
  }

  if (
    start.getFullYear() === end.getFullYear()
  ) {

    return (
      `${formatTerminDayMonth(start)}.-`
      + `${formatTerminDayMonth(end)}.`
      + `${start.getFullYear()}`
    );

  }

  return (
    `${formatTerminFullDate(start)} – `
    + formatTerminFullDate(end)
  );

}

function getTerminTimeLabel(event, date) {

  if (event?.startTime) {

    return String(event.startTime).slice(0, 5);

  }

  if (!event?.date) {
    return '';
  }

  const source =
    date || new Date(event.date);

  const label =
    source.toLocaleTimeString(
      'de-DE',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  if (label === '00:00') {
    return '';
  }

  return label;

}

function formatTerminSchedule(event) {

  const dateLabel =
    formatTerminDateLabel(event);

  const time =
    getTerminDisplayTime(event);

  if (!dateLabel) {
    return '';
  }

  if (!time) {
    return dateLabel;
  }

  return `${dateLabel} · ${time} Uhr`;

}

function formatTerminDateLabel(event) {

  if (!event) {
    return '';
  }

  if (isRecurringTermin(event)) {

    const weekday =
      TERMIN_WEEKDAYS[
        event.daysOfWeek?.[0]
      ] || 'Termin';

    return `Jeden ${weekday}`;

  }

  const start =
    getSingleTerminStartDay(event);

  const end =
    getSingleTerminEndDay(event);

  if (!start) {
    return '';
  }

  if (isMultiDaySingleTermin(event)) {
    return formatTerminDayRange(start, end);
  }

  return formatTerminWeekdayDate(start);

}

function getTerminDisplayTime(event) {

  if (isRecurringTermin(event)) {

    if (event?.startTime) {
      return String(event.startTime)
        .slice(0, 5);
    }

    return '';

  }

  const start =
    getSingleTerminStartDay(event);

  if (!start || !event?.date) {
    return '';
  }

  return getTerminTimeLabel(
    event,
    start
  );

}

function formatCardTerminDate(event) {

  return formatTerminSchedule(event);

}

function singleTerminOverlapsRange(
  event,
  rangeStart,
  rangeEnd
) {

  const start =
    getSingleTerminStartDay(event);

  const end =
    getSingleTerminEndDay(event);

  if (!start || !end) {
    return false;
  }

  const endExclusive =
    addTerminDays(end, 1);

  return (
    endExclusive > rangeStart
    && start < rangeEnd
  );

}

function getTerminSortDate(event) {

  if (isRecurringTermin(event)) {

    const nextDay =
      getNextRecurringOccurrenceDay(
        event,
        new Date()
      );

    if (nextDay) {
      return nextDay;
    }

    const seriesStart =
      getRecurringTerminStartDay(
        event
      );

    if (seriesStart) {
      return seriesStart;
    }

  }

  return (
    getSingleTerminStartDay(event)
    || new Date(0)
  );

}

function getTerminVisibilityEndDay(event) {

  if (isRecurringTermin(event)) {

    return (
      getRecurringTerminEndDay(event)
      || getRecurringTerminStartDay(event)
    );

  }

  return getSingleTerminEndDay(event);

}

function isTerminStillUpcoming(termin) {

  const today =
    new Date();

  today.setHours(0, 0, 0, 0);

  if (isRecurringTermin(termin)) {

    const seriesEnd =
      getRecurringTerminEndDay(
        termin
      );

    if (
      seriesEnd
      && seriesEnd < today
    ) {
      return false;
    }

    return !!getNextRecurringOccurrenceDay(
      termin,
      today
    );

  }

  const endDay =
    getTerminVisibilityEndDay(termin);

  if (!endDay) {
    return false;
  }

  return endDay >= today;

}

function toFullCalendarExclusiveEnd(endDay) {

  return addTerminDays(
    endDay,
    1
  ).toISOString();

}

function formatAdminTerminMeta(event) {

  if (!event?.date) {
    return '📅 Ohne Datum';
  }

  return `📅 ${formatTerminSchedule(event)}`;

}
