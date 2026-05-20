function formatCardDate(
  event
){

  if (
    event.recurring
  ){

    const weekdays=[

      'So',
      'Mo',
      'Di',
      'Mi',
      'Do',
      'Fr',
      'Sa'

    ];

    return `

${

weekdays[
event.daysOfWeek?.[0]
] || ''

}

${

event.startTime || ''

}

`;

  }

  if (!event.date)
    return '';

  return new Date(
    event.date
  )

  .toLocaleString(

    'de-DE',

    {

      day:'2-digit',

      month:'2-digit',

      hour:'2-digit',

      minute:'2-digit'

    }

  );

}