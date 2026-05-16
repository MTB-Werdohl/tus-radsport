document.addEventListener('DOMContentLoaded', function () {

  const currentYear = new Date().getFullYear();

  const validFrom = `${currentYear}-01-01`;

  const validTo = `${currentYear + 1}-12-31`;

  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: 'listMonth',

    locale: 'de',

    buttonText: {
      today: 'Heute',
      month: 'Monat',
      list: 'Liste'
    },

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
  events: async function(fetchInfo, successCallback, failureCallback) {

    try {

      const response = await fetch(
        'https://openholidaysapi.org/PublicHolidays' +
        '?countryIsoCode=DE' +
        '&subdivisionCode=DE-NW' +
        '&languageIsoCode=DE' +
        `&validFrom=${validFrom}` +
        `&validTo=${validTo}`
      );

      const data = await response.json();

      const holidays = data.map(item => ({

        title: item.name[0].text,

        start: item.startDate,

        end: item.endDate,

        display: 'background',

      extendedProps: {
       isInfoEvent: true
      },

        backgroundColor: '#c0392b',

        borderColor: '#c0392b',

        textColor: '#ffffff'

      }));

      successCallback(holidays);

    } catch(error) {

      failureCallback(error);

    }

  }
},

{
  events: async function(fetchInfo, successCallback, failureCallback) {

    try {

      const response = await fetch(
        'https://openholidaysapi.org/SchoolHolidays' +
        '?countryIsoCode=DE' +
        '&subdivisionCode=DE-NW' +
        '&languageIsoCode=DE' +
        `&validFrom=${validFrom}` +
        `&validTo=${validTo}`
      );

      const data = await response.json();

      const holidays = data.map(item => ({

        title: item.name[0].text,

        start: item.startDate,

        end: item.endDate,

        display: 'background',

        extendedProps: {
        isInfoEvent: true
        },

        backgroundColor: '#f1c40f',

        borderColor: '#f1c40f'

      }));

      successCallback(holidays);

    } catch(error) {

      failureCallback(error);

    }

  }
}
],

eventDataTransform: function(eventData) {

  if (
    eventData.extendedProps &&
    eventData.extendedProps.exclude
  ) {

    const excludes = eventData.extendedProps.exclude;

    const generatedDate = eventData.start;

    if (generatedDate) {

      const dateOnly = generatedDate.split('T')[0];

      if (excludes.includes(dateOnly)) {
        return false;
      }

    }

  }

  return eventData;

},

eventDidMount: function(info) {

  const now = new Date();

if (info.event.start < now) {

  info.el.style.opacity = '0.45';

  info.el.style.filter = 'grayscale(100%)';

  info.el.style.cursor = 'default';

  info.el.style.textDecoration = 'line-through';

}

eventDataTransform: function(eventData) {

  if (
    eventData.extendedProps &&
    eventData.extendedProps.exclude &&
    eventData.start
  ) {

    const excludes = eventData.extendedProps.exclude;

    const dateOnly = eventData.start.split('T')[0];

    if (excludes.includes(dateOnly)) {
      return false;
    }

  }

  return eventData;

},


  if (info.event.extendedProps.isInfoEvent) {

    info.el.style.cursor = 'default';

    info.el.style.pointerEvents = 'none';

  }

},

eventClick: function(info) {

  if (info.event.extendedProps.isInfoEvent) {
    info.jsEvent.preventDefault();
    return;
  }

  const now = new Date();

  if (info.event.start < now) {
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