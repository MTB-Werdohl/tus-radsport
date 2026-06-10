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

event.image

?

`

<img

class="event-image"

src="${event.image}"

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

 if (

  !event.komoot &&

  !event.gpx

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

event.gpx

?

`

<a

href="${event.gpx}"

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