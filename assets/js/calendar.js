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

eventSources: [
  {
    url: '/assets/data/events.json',
    method: 'GET'
  },

  {
    url: 'https://openholidaysapi.org/PublicHolidays',
    method: 'GET',
    extraParams: {
      countryIsoCode: 'DE',
      subdivisionCode: 'DE-NW',
      languageIsoCode: 'DE',
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    },

    color: '#c0392b',
    textColor: '#ffffff'
  },

  {
    url: 'https://openholidaysapi.org/SchoolHolidays',
    method: 'GET',
    extraParams: {
      countryIsoCode: 'DE',
      subdivisionCode: 'DE-NW',
      languageIsoCode: 'DE',
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    },

    color: '#f1c40f',
    textColor: '#000000'
  }
],

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