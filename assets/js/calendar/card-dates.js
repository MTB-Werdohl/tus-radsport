function formatCardDate(
  event
){

  const date =

    event.generatedDate ||

    new Date(
      event.date
    );

  const formattedDate =

    date.toLocaleDateString(

      'de-DE',

      {

        weekday:'long',

        day:'2-digit',

        month:'2-digit'

      }

    );

  const time =

    event.startTime ||

    date.toLocaleTimeString(

      'de-DE',

      {

        hour:'2-digit',

        minute:'2-digit'

      }

    );

  return `${formattedDate} · ${time} Uhr`;

}