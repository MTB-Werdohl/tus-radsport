function handleEventRender(info) {

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

}