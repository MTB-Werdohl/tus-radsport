document.addEventListener(
  'DOMContentLoaded',
  initPushWidget
);

navigator
  .serviceWorker
  ?.addEventListener(
    'message',
    async (event) => {

      if (event.data?.type !== 'PUSH_OPENED') {
        return;
      }

      await initPushWidget();

    }
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

  if (window.location.pathname.startsWith('/mitteilungen')) {
    widget.classList.add('hidden');
    return;
  }

  const push =
    await getLastPush();

  if (!push) {
    return;
  }

  widget.classList.remove('hidden');

  renderPush(content, push);

  if (isPushUnread(push)) {

    widget.classList.remove('collapsed');

  } else {

    widget.classList.add('collapsed');

  }

  toggle.onclick = () => {

    widget.classList.toggle('collapsed');

    if (widget.classList.contains('collapsed')) {
      markPushSeen(push);
    }

  };

}

function renderPush(target, push) {

  const url =
    push.url && push.url !== '/'
      ? push.url
      : '';

  target.innerHTML = `

<div class="push-widget-card">

  <h3>${escapePushHtml(push.title)}</h3>

  <p>${escapePushHtml(push.body)}</p>

  <div class="push-widget-links">

  ${
    url
      ? `<a class="push-widget-more" href="${escapePushHtml(url)}">Mehr erfahren</a>`
      : ''
  }

  <a class="push-widget-archive"
     href="/mitteilungen/">

    ältere Mitteilungen

  </a>

  </div>

</div>

`;

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
