function shouldHideEvent(info){

  const now =
    new Date();

  if(
    info.event.start < now
  ){

    info.el.style.filter =
      'grayscale(40%)';

    info.el.style.cursor =
      'default';

    info.el.style.textDecoration =
      'line-through';

  }

}
