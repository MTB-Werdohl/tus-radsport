function renderEvent(
  event,
  recap
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

${renderEventRecap(recap, event)}

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

initEventRecapLightbox();

}

function renderEventRecap(
  recap,
  event
) {

  if (
    !recap
    || recap.status !== 'published'
  ) {
    return '';
  }

  const headline =
    recap.headline
    || event.title
    || 'Rückblick';

  const images =
    recap.images
    || recap.termin_recap_images
    || [];

  const imagesHtml =
    images.length
      ? `
        <div class="event-recap-images">
          ${
            images
              .map((image, index) => {

                const url =
                  typeof resolveRecapImageUrl
                    === 'function'
                    ? resolveRecapImageUrl(image)
                    : image.storage_path;

                if (!url) {
                  return '';
                }

                return `
                  <a
                    href="${url}"
                    class="event-recap-image-link glightbox"
                    data-glightbox="type: image"
                    data-gallery="event-recap">

                    <img
                      class="event-recap-image"
                      src="${url}"
                      alt="Rückblick ${index + 1}"
                      loading="lazy">

                  </a>
                `;

              })
              .join('')
          }
        </div>
      `
      : '';

  return `
    <section class="event-recap">

      <h2 class="event-recap-title">
        Rückblick
      </h2>

      <h3 class="event-recap-headline">
        ${escapeEventHtml(headline)}
      </h3>

      <div class="event-recap-body">
        ${
          typeof marked !== 'undefined'
            ? marked.parse(recap.body || '')
            : escapeEventHtml(recap.body || '')
        }
      </div>

      ${imagesHtml}

    </section>
  `;

}

function escapeEventHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function initEventRecapLightbox() {

  if (typeof GLightbox !== 'function') {
    return;
  }

  if (window._eventRecapLightbox) {

    window._eventRecapLightbox.destroy();
    window._eventRecapLightbox = null;

  }

  if (
    !document.querySelector(
      '.event-recap .glightbox'
    )
  ) {
    return;
  }

  window._eventRecapLightbox =
    GLightbox({
      selector: '.event-recap .glightbox'
    });

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