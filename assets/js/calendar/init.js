document.addEventListener(
  'DOMContentLoaded',

  function(){

    const calendarEl=

      document.getElementById(
        'calendar'
      );

    const calendar=

      new FullCalendar.Calendar(

        calendarEl,

        {

          initialView:
            'dayGridMonth',

          locale:'de',

          height:'auto',

          firstDay:1,

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