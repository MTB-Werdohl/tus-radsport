function renderEvent(
  event,
  options
) {

  const backUrl =
    typeof getCalendarUrl === 'function'
      ? getCalendarUrl()
      : '/kalender/';

  const wrapper =
    document
    .getElementById(
      'event'
    );

  if (
    !wrapper ||
    !event
  ) return;

  const eventImage =
    typeof resolveTerminImage === 'function'
      ? resolveTerminImage(event)
      : event.image;

  document.title =
    `${event.title}
    · MTB Werdohl`;

  wrapper.innerHTML = `

<div class="event-page">

<header class="event-header">

<div class="event-header__title">

<h1 class="event-title">

${formatContentCardTitle(
  event.title,
  event.sichtbarkeit
)}

</h1>

<div class="event-header__actions">

<a
  class="event-back-link"
  href="${backUrl}">

← Zurück

</a>

<div id="share"></div>

</div>

</div>

<div class="event-header__main">

<div class="event-header__when">

<h2 class="event-date">

📅

${formatEventDate(
event
)}

</h2>

${
  formatEventTime(event)
    ? `
<p class="event-time">

🕒

${formatEventTime(event)}

Uhr

</p>
`
    : ''
}

${

event.location

?

`

<p class="event-location">

📍

${event.location}

</p>

`

:''

}

${renderContentCreatorMeta(
  event.creator_label
)}

</div>

<div
  id="event-feedback"
  class="event-header__feedback">

</div>

</div>

</header>

${

eventImage

?

`

<img

class="event-image"

src="${eventImage}"

>

`

:''

}

${

renderLinks(event)

}

<div class="event-content">

${marked.parse(

event.content || ''

)}

</div>

<div class="event-back">

<a href="${backUrl}">

← Zurück zum Kalender

</a>

</div>

</div>

`;

  wrapper.dataset.eventId =
    String(event.id);

  wrapper.dataset.eventTitle =
    event.title || '';

  buildShareButton(
    'share',
    event.title
  );

}

function renderLinks(
 event
) {

 const stages =
   event?.route_stages?.length
     ? event.route_stages
     : (
       typeof buildTerminRouteStagesFromLegacy
         === 'function'
         ? buildTerminRouteStagesFromLegacy(
           event
         )
         : []
     );

 if (
   typeof renderTerminRouteStagesTable
     === 'function'
 ) {

   const tableHtml =
     renderTerminRouteStagesTable(
       stages
     );

   if (tableHtml) {
     return tableHtml;
   }

 }

 return '';

}
