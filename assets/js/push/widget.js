document.addEventListener(
  'DOMContentLoaded',
  initPushWidget
);

async function initPushWidget() {

  const widget =
    document.getElementById('push-widget');

  const content =
    document.getElementById('push-widget-content');

  const toggle =
    document.getElementById('push-widget-toggle');

  if (!widget || !content) {
    return;
  }

  const push =
    await getLastPush();

  if (!push) {
    return;
  }

  widget.classList.remove('hidden');

  renderPush(content, push);

  applyPushWidgetReadState(widget, push);

  toggle.onclick = () => {

    widget.classList.toggle('collapsed');

    if (widget.classList.contains('collapsed')) {
      markPushSeen(push);
      applyPushWidgetReadState(widget, push);
    }

  };

}

function applyPushWidgetReadState(widget, push) {

  if (!widget) {
    return;
  }

  const unread =
    isPushUnread(push);

  const card =
    document
      .getElementById('push-widget-content')
      ?.querySelector('.push-widget-card');

  card?.classList.toggle(
    'push-widget-card--unread',
    unread
  );

  if (unread) {

    widget.classList.remove('collapsed');

  } else {

    widget.classList.add('collapsed');

  }

}

function renderPush(target, push) {

  const unread =
    isPushUnread(push);

  const url =
    push.url && push.url !== '/'
      ? push.url
      : '';

  target.innerHTML = `

<div class="push-widget-card${
  unread ? ' push-widget-card--unread' : ''
}">

  <h3>${escapePushHtml(push.title)}</h3>

  <p>${escapePushHtml(push.body)}</p>

  ${
    url
      ? `<div class="push-widget-links">
  <a class="push-widget-more" href="${escapePushHtml(url)}">Mehr erfahren</a>
  </div>`
      : ''
  }

</div>

`;

  target
    .querySelectorAll('.push-widget-links a')
    .forEach((link) => {

      link.addEventListener('click', () => {
        markPushSeen(push);
        applyPushWidgetReadState(
          document.getElementById('push-widget'),
          push
        );
      });

    });

}

setupFooterProtection();

function setupFooterProtection() {

  const footer =
    document.querySelector('.site-footer');

  const widget =
    document.getElementById('push-widget');

  if (!footer || !widget) {
    return;
  }

  const observer =
    new IntersectionObserver(

      (entries) => {

        widget.classList.toggle(
          'footer-visible',
          entries[0].isIntersecting
        );

      },

      { threshold: 0.05 }

    );

  observer.observe(footer);

}
