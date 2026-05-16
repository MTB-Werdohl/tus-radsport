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

    eventClick: function(info) {
      if (info.event.url) {
        window.location.href = info.event.url;
        info.jsEvent.preventDefault();
      }
    }

  });

  calendar.render();

});