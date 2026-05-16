document.addEventListener('DOMContentLoaded', function () {

  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: 'dayGridMonth',

    locale: 'de',

    height: 'auto',

    firstDay: 1,

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listMonth'
    },

events: '/assets/data/events.json',

eventDidMount: function(info) {

  if (info.event.extendedProps.isPast) {

    info.el.style.opacity = '0.45';

    info.el.style.filter = 'grayscale(100%)';

    info.el.style.cursor = 'default';

    info.el.style.textDecoration = 'line-through';

  }

},

eventClick: function(info) {

  if (info.event.extendedProps.isPast) {
    info.jsEvent.preventDefault();
    return;
  }

  info.jsEvent.preventDefault();

  const popup = document.createElement('div');

  popup.className = 'event-popup';

  popup.innerHTML = `
    <div class="event-popup-content">

      <button class="event-popup-close">
        ✕
      </button>

      <h2>${info.event.title}</h2>

      <p>
        📅
        ${info.event.start.toLocaleDateString('de-DE')}
      </p>

      ${info.event.extendedProps.location
        ? `<p>📍 ${info.event.extendedProps.location}</p>`
        : ''
      }

      ${info.event.extendedProps.description
        ? `<p>${info.event.extendedProps.description}</p>`
        : ''
      }

      <a class="event-popup-button"
         href="${info.event.url}">
         Mehr Details
      </a>

    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector('.event-popup-close')
    .addEventListener('click', () => {
      popup.remove();
    });

  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

}

  });

  calendar.render();

});