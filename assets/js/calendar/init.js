document.addEventListener(
  'DOMContentLoaded',

  async function(){

    const calendarEl=

      document.getElementById(
        'calendar'
      );

    if (!calendarEl) return;

    window.contentViewerMember =
      await ensureContentViewerMember();

    let lastCalendarMonthStart =
      null;

    const todayStart =
      new Date();

    todayStart.setHours(0, 0, 0, 0);

    const savedMonthValue =
      resolveCalendarViewMonth();

    const savedMonthDate =
      parseCalendarViewMonth(
        savedMonthValue
      );

    const initialDate =
      savedMonthDate
      && savedMonthDate >= todayStart
        ? savedMonthDate
        : todayStart;

    if (savedMonthDate) {
      saveCalendarViewMonth(
        initialDate
      );
    }

    const calendar=

      new FullCalendar.Calendar(

        calendarEl,

        {

          initialView:
            'dayGridMonth',

          initialDate,

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

  const currentMonthStart=

    new Date(

      start.getFullYear(),

      start.getMonth(),

      1

    );

  let advanceDirection=

    'forward';

  if (lastCalendarMonthStart) {

    if (
      currentMonthStart
      < lastCalendarMonthStart
    ) {
      advanceDirection=
        'backward';
    } else if (
      currentMonthStart
      > lastCalendarMonthStart
    ) {
      advanceDirection=
        'forward';
    }

  }

  lastCalendarMonthStart=
    currentMonthStart;

  saveCalendarViewMonth(
    currentMonthStart
  );

  loadCards(
    start,
    end,
    {
      autoAdvanceMonth: true,
      calendar,
      advanceDirection
    }
  );

}

        }

      );

    calendar.render();

  }

);
