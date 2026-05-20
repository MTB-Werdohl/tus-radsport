function formatCardDate(
  event
){

  const date =

    event.generatedDate ||

    new Date(
      event.date
    );

  return date

    .toLocaleString(

      'de-DE',

      {

        weekday:'long',

        day:'2-digit',

        month:'2-digit',

        hour:'2-digit',

        minute:'2-digit'

      }

    );

}