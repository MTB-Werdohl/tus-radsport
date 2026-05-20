function formatEventDate(
  event
) {

  if (!event)
    return '';

  if (event.recurring) {

    const weekdays = [

      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag'

    ];

    return (

      'Jeden ' +

      weekdays[
        event.daysOfWeek?.[0]
      ]

    );

  }

  const date =
    new Date(
      event.date
    );

  return date
    .toLocaleDateString(
      'de-DE',
      {

        day:'2-digit',

        month:'2-digit',

        year:'numeric'

      }

    );

}

function formatEventTime(
  event
) {

  if (!event)
    return '';

if (event.recurring) {

  return event.startTime || '';

}

  return new Date(
    event.date
  )

  .toLocaleTimeString(

    'de-DE',

    {

      hour:'2-digit',

      minute:'2-digit'

    }

  );

}