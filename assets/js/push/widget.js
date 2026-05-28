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

  const push =
    await getLastPush();

  if (!push) {
    return;
  }

  const pushId =
    push.sent_at;

  const stored =
    getLastSeenPushAt();

  const collapsed =
    localStorage.getItem('pushCollapsed');

  widget.classList.remove('hidden');

  renderPush(content, push);

  if (stored !== pushId) {

    widget.classList.remove('collapsed');

  } else if (collapsed === 'true') {

    widget.classList.add('collapsed');

  }

  toggle.onclick = () => {

    widget.classList.toggle('collapsed');

    localStorage.setItem(
      'pushCollapsed',
      widget.classList.contains('collapsed')
    );

    markPushSeen(pushId);

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

  ${
    url
      ? `<a href="${escapePushHtml(url)}">Mehr erfahren</a>`
      : ''
  }

  <a class="push-widget-archive"
     href="/mitteilungen/">

    ältere Mitteilungen

  </a>

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
