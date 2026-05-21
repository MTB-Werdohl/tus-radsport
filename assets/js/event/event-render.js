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

  wrapper.innerHTML = `

<div class="event-page">

<div class="event-meta">

<h1 class="event-title">

${event.title}

</h1>

<div id="share"></div>

<h2 class="event-date">

📅

${formatEventDate(
event
)}

</h2>

<p class="event-time">

🕒

${formatEventTime(
event
)}

Uhr

</p>

${

event.location

?

`

<p>

📍

${event.location}

</p>

`

:''

}

</div>

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

<a href="/kalender/">

← Zurück

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