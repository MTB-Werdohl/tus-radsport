document.addEventListener(
  'DOMContentLoaded',
  initPushWidget
);

function hidePushWidget() {

  const widget =
    document.getElementById('push-widget');

  if (widget) {
    widget.classList.add('hidden');
  }

}

function showPushWidgetChangeSummary(
  lines
) {

  const widget =
    document.getElementById('push-widget');

  const content =
    document.getElementById('push-widget-content');

  if (
    !widget
    || !content
    || !lines?.length
  ) {
    hidePushWidget();
    return;
  }

  widget.classList.remove('hidden');

  content.innerHTML = `

<div class="push-widget-card push-widget-card--unread">

  <h3>🚴 Seit deinem letzten Besuch</h3>

  <ul class="push-widget-list">
    ${lines.join('')}
  </ul>

</div>

  `.trim();

  widget.classList.remove('collapsed');

}

function markPushWidgetChangeSummarySeen() {

  const widget =
    document.getElementById('push-widget');

  const card =
    widget
      ?.querySelector('.push-widget-card');

  card?.classList.remove(
    'push-widget-card--unread'
  );

}

async function initPushWidget() {

  const widget =
    document.getElementById('push-widget');

  const toggle =
    document.getElementById('push-widget-toggle');

  if (!widget || !toggle) {
    return;
  }

  hidePushWidget();

  toggle.onclick = async () => {

    widget.classList.toggle('collapsed');

    if (
      widget.classList.contains('collapsed')
    ) {

      markPushWidgetChangeSummarySeen();

      if (
        typeof dismissMemberChangeSummary
          === 'function'
      ) {
        await dismissMemberChangeSummary();
      }

    }

  };

  setupFooterProtection();

}

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
