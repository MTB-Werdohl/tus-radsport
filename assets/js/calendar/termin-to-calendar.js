function termineToCalendarEvents(termine) {

  return termine.map(item => {

    const category =
      getTerminCategory(item.category);

    const baseEvent = {

      title: item.title,

      location: item.location,

      url: '/kalender/' + item.slug + '/',

      backgroundColor: category.color,

      borderColor: category.color,

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
