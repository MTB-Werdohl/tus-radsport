document.addEventListener('DOMContentLoaded', function () {

  const supabaseUrl = 'https://eazizesytrnknbgrnggj.supabase.co';
  const supabaseKey = 'sb_publishable_Bz-kKI-XUf9Y1sM3hWIfAw_4l8fIPQr';

  const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
  );

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
  events: async function(fetchInfo, successCallback, failureCallback) {

    try {

      const { data, error } = await supabaseClient
        .from('Termine')
        .select('*');

      if (error) {
        throw error;
      }

const events = data.map(item => {

  const baseEvent = {

    title: item.title,

    description: item.description,

    location: item.location,

    url: '/event.html?slug=' + item.slug,

    backgroundColor: '#2e8b57',

    borderColor: '#2e8b57',

    extendedProps: {
      exclude: item.exclude || []
    }

  };

  if (item.recurring) {

    return {

      ...baseEvent,

      daysOfWeek: item.daysOfWeek,

      startTime: item.startTime,

      startRecur: item.startRecur,

      endRecur: item.endRecur

    };

  }

  return {

    ...baseEvent,

    start: item.date

  };

});

      successCallback(events);

    } catch(error) {

      console.error(error);

      failureCallback(error);

    }

  }
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

eventDidMount: function(info) {

  const now = new Date();

  if (info.event.start < now) {

    info.el.style.filter = 'grayscale(40%)';

    info.el.style.cursor = 'default';

    info.el.style.textDecoration = 'line-through';

    const title = info.el.querySelector('.fc-list-event-title');

    if (title) {
      title.style.opacity = '0.5';
    }

    const time = info.el.querySelector('.fc-list-event-time');

    if (time) {
      time.style.opacity = '0.5';
  }

}

if (
  info.event.extendedProps.exclude
) {

  const excludes = info.event.extendedProps.exclude;

  const eventDate = info.event.startStr.split('T')[0];

  if (excludes.includes(eventDate)) {

    info.el.style.display = 'none';

    const listItem = info.el.closest('.fc-list-event');

    if (listItem) {
      listItem.style.display = 'none';
    }

  }

}

setTimeout(() => {

  document.querySelectorAll('.fc-list-day').forEach(dayGroup => {

    const events = dayGroup.querySelectorAll('.fc-list-event');

    const visibleEvents = Array.from(events).filter(event =>
      event.style.display !== 'none'
    );

    if (visibleEvents.length === 0) {
      dayGroup.style.display = 'none';
    }

  });

}, 0);

if (info.event.extendedProps.isInfoEvent) {

  info.el.style.cursor = 'default';

  info.el.style.pointerEvents = 'none';

}

if (info.view.type === 'listMonth') {

  const timeEl = info.el.querySelector('.fc-list-event-time');

  if (timeEl) {

    const formattedDate =
      info.event.start.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });

    timeEl.setAttribute('data-date', formattedDate);

  }

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

if (info.event.url) {
  window.location.href = info.event.url;
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

      <p>
        🕒
        ${info.event.start.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
        })} Uhr
      </p>

      ${info.event.extendedProps.location
        ? `<p>📍 ${info.event.extendedProps.location}</p>`
        : ''
      }

      ${info.event.extendedProps.description
        ? `<p>${info.event.extendedProps.description}</p>`
        : ''
      }

    ${info.event.url
      ? `
        <a class="event-popup-button"
          href="${info.event.url}">
          Mehr Details
       </a>
      `
     : ''
    }

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
},

});

calendar.render();

});

if ('serviceWorker' in navigator) {

  window.addEventListener('load', () => {

    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        console.log('Service Worker registriert');
      });

  });

}