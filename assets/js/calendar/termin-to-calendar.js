function termineToCalendarEvents(
  termine,
  options = {}
) {

  const member =
    options.member || null;

  const showDraftStyle =
    viewerIncludesDrafts(member);

  return termine.map(item => {

    const category =
      getTerminCategory(item.category);

    let backgroundColor =
      category.color;

    let borderColor =
      category.color;

    if (
      showDraftStyle
      && normalizeContentVisibility(
        item.sichtbarkeit
      ) === CONTENT_VISIBILITY.draft
    ) {

      backgroundColor = '#b42230';
      borderColor = '#b42230';

    }

    const baseEvent = {

      title: item.title,

      location: item.location,

      url:
        getEventUrl(item.slug),

      backgroundColor,

      borderColor,

      extendedProps: {
        exclude: item.exclude || []
      }

    };

    if (item.recurring) {

      const recurringEvent = {

        ...baseEvent,

        daysOfWeek: item.daysOfWeek,

        startTime: item.startTime,

        startRecur: item.startRecur,

        endRecur: item.endRecur

      };

      const durationDays =
        getRecurringDurationDays(item);

      if (durationDays > 1) {

        recurringEvent.duration = {
          days: durationDays
        };

      }

      return recurringEvent;

    }

    const startDay =
      getSingleTerminStartDay(item);

    const endDay =
      getSingleTerminEndDay(item);

    if (
      startDay
      && endDay
      && endDay.getTime() > startDay.getTime()
    ) {

      return {

        ...baseEvent,

        start: item.date,

        end: toFullCalendarExclusiveEnd(endDay)

      };

    }

    return {

      ...baseEvent,

      start: item.date

    };

  });

}
