document.addEventListener('DOMContentLoaded', function () {

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

    eventSources: eventSources,

    eventDidMount: handleEventRender,

    eventClick: handleEventClick,

  });

  calendar.render();

  registerServiceWorker();

});