document.addEventListener(
  'DOMContentLoaded',

  function(){

    const calendarEl=

      document.getElementById(
        'calendar'
      );

    if (!calendarEl) return;

    const calendar=

      new FullCalendar.Calendar(

        calendarEl,

        {

          initialView:
            'dayGridMonth',

          locale:'de',

          height:'auto',

          firstDay:1,

          validRange:{

          start:new Date()

          },

          headerToolbar:{

            left:
              'prev,next today',

            center:
              'title',

            right:''

          },

          buttonText:{

            today:'Heute'

          },

          eventSources:
            eventSources,

          eventClick:
            handleEventClick,

          eventDidMount:
            handleEventRender,

datesSet(info){

  const current=

    info.view.currentStart;

  const start=

    new Date(

      current.getFullYear(),

      current.getMonth(),

      1

    );

  const end=

    new Date(

      current.getFullYear(),

      current.getMonth()+1,

      1

    );

  loadCards(

    start,

    end

  );

}

        }

      );

    calendar.render();

  }

);
