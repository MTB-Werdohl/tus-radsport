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

function getRecurringDurationDays(event) {

  const value =
    parseInt(event?.durationDays, 10);

  if (
    Number.isFinite(value)
    && value > 1
  ) {
    return value;
  }

  return 1;

}

function isMultiDaySingleTermin(event) {

  if (event?.recurring) {
    return false;
  }

  const start =
    getSingleTerminStartDay(event);

  const end =
    getSingleTerminEndDay(event);

  if (!start || !end) {
    return false;
  }

  return end.getTime() > start.getTime();

}

function isMultiDayRecurringTermin(event) {

  return !!event?.recurring
    && getRecurringDurationDays(event) > 1;

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

  if (event?.recurring) {
    return '';
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

  if (event.recurring) {

    const weekday =
      TERMIN_WEEKDAYS[
        event.daysOfWeek?.[0]
      ] || 'Termin';

    const duration =
      getRecurringDurationDays(event);

    if (duration > 1) {
      return (
        `Jeden ${weekday} · ${duration} Tage`
      );
    }

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

  if (event?.recurring) {
    return getTerminTimeLabel(event);
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

  if (event?.generatedDate) {

    const start =
      startOfTerminDay(event.generatedDate);

    const duration =
      getRecurringDurationDays(event);

    if (duration > 1) {

      const end =
        addTerminDays(
          start,
          duration - 1
        );

      const time =
        getTerminTimeLabel(event);

      return (
        `${formatTerminDayRange(start, end)}`
        + (time ? ` · ${time} Uhr` : '')
      );

    }

    const time =
      getTerminTimeLabel(event, start);

    return (
      `${formatTerminWeekdayDate(start)}`
      + (time ? ` · ${time} Uhr` : '')
    );

  }

  return formatTerminSchedule(event);

}

function getRecurringOccurrenceEndDay(
  startDay,
  event
) {

  const duration =
    getRecurringDurationDays(event);

  if (duration <= 1) {
    return startDay;
  }

  return addTerminDays(
    startDay,
    duration - 1
  );

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

  if (event?.generatedDate) {
    return new Date(event.generatedDate);
  }

  return getSingleTerminStartDay(event)
    || new Date(0);

}

function getTerminVisibilityEndDay(event) {

  if (event?.generatedDate) {

    return getRecurringOccurrenceEndDay(
      startOfTerminDay(event.generatedDate),
      event
    );

  }

  return getSingleTerminEndDay(event);

}

function isTerminStillUpcoming(termin) {

  const today =
    new Date();

  today.setHours(0, 0, 0, 0);

  if (termin?.recurring) {

    const recurringEnd =
      termin.endRecur
        ? parseTerminDateOnly(
          termin.endRecur
        )
        : null;

    if (
      recurringEnd
      && recurringEnd < today
    ) {
      return false;
    }

    return true;

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

  if (event?.recurring) {
    return `🔁 ${formatTerminSchedule(event)}`;
  }

  if (!event?.date) {
    return '📅 Ohne Datum';
  }

  return `📅 ${formatTerminSchedule(event)}`;

}
