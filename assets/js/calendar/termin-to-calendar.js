function termineToCalendarEvents(termine) {

  return termine.map(item => {

    const category =
      getTerminCategory(item.category);

    const baseEvent = {

      title: item.title,

      description: item.description,

      location: item.location,

      url: '/kalender/' + item.slug + '/',

      backgroundColor: category.color,

      borderColor: category.color,

      extendedProps: {
        exclude: item.exclude || []
      }

    };

    if (item.recurring) {

      return {

        ...baseEvent,

        daysOfWeek: item.daysOfWeek,

        startTime: item.startTime,

        startRecur: item.startRecur,

        endRecur: item.endRecur

      };

    }

    return {

      ...baseEvent,

      start: item.date

    };

  });

}
