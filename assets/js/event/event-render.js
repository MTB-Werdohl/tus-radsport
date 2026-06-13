function renderEvent(
  event
) {

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

  const eventGpx =
    typeof resolveTerminGpx === 'function'
      ? resolveTerminGpx(event)
      : event.gpx;

  document.title =
    `${event.title}
    · MTB Werdohl`;

  const calendarBackUrl =
    typeof getCalendarUrl === 'function'
      ? getCalendarUrl()
      : '/kalender/';

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
  href="${calendarBackUrl}">

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

<a href="${calendarBackUrl}">

← Zurück zum Kalender

</a>

</div>

</div>

`;

buildShareButton(
  'share',
  event.title
);

}

function renderLinks(
 event
) {

 const eventGpx =
   typeof resolveTerminGpx === 'function'
     ? resolveTerminGpx(event)
     : event.gpx;

 if (

  !event.komoot &&

  !eventGpx

 ) return '';

 return `

<div class="event-links">

${

event.komoot

?

`

<a

href="${event.komoot}"

target="_blank"

class="event-button"

>

🚵 Komoot

</a>

`

:''

}

${

eventGpx

?

`

<a

href="${eventGpx}"

target="_blank"

class="event-button"

>

⬇ GPX

</a>

`

:''

}

</div>

`;

}