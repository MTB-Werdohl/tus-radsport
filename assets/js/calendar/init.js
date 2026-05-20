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

          datesSet(

            info

          ){

            loadCards(

              info.start,

              info.end

            );

          }

        }

      );

    calendar.render();

  }

);