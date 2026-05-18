function handleEventClick(info) {

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

}