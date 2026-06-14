let pushWidgetLastLines = null;

let pushWidgetHasUnread = false;

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

  pushWidgetLastLines = null;
  pushWidgetHasUnread = false;

}

function showPushWidgetForClubMember(
  options = {}
) {

  const widget =
    document.getElementById('push-widget');

  if (!widget) {
    return;
  }

  widget.classList.remove('hidden');

  if (options.collapsed === true) {
    widget.classList.add('collapsed');
  } else if (options.collapsed === false) {
    widget.classList.remove('collapsed');
  }

}

function renderPushWidgetCardHtml(
  lines
) {

  if (!lines?.length) {

    return `

<div class="push-widget-card">

  <h3>🚴 Seit deinem letzten Besuch</h3>

  <p class="push-widget-empty">
    Keine Neuigkeiten seit deinem letzten Besuch.
  </p>

</div>

    `.trim();

  }

  const unreadClass =
    pushWidgetHasUnread
      ? ' push-widget-card--unread'
      : '';

  return `

<div class="push-widget-card${unreadClass}">

  <h3>🚴 Seit deinem letzten Besuch</h3>

  <ul class="push-widget-list">
    ${lines.join('')}
  </ul>

</div>

  `.trim();

}

function refreshPushWidgetContent(
  lines
) {

  const content =
    document.getElementById('push-widget-content');

  if (!content) {
    return;
  }

  const displayLines =
    lines?.length
      ? lines
      : pushWidgetLastLines;

  content.innerHTML =
    renderPushWidgetCardHtml(displayLines);

}

function showPushWidgetChangeSummary(
  lines,
  options = {}
) {

  const widget =
    document.getElementById('push-widget');

  const content =
    document.getElementById('push-widget-content');

  if (
    !widget
    || !content
  ) {
    return;
  }

  if (lines?.length) {
    pushWidgetLastLines = lines;
  }

  if (options.unread === true) {
    pushWidgetHasUnread = true;
  } else if (options.unread === false) {
    pushWidgetHasUnread = false;
  }

  refreshPushWidgetContent(lines);

  widget.classList.remove('hidden');

  if (options.open === true) {
    widget.classList.remove('collapsed');
  } else if (
    options.open === false
    || !lines?.length
  ) {
    widget.classList.add('collapsed');
  }

}

function markPushWidgetChangeSummarySeen() {

  pushWidgetHasUnread = false;

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

    const wasCollapsed =
      widget.classList.contains('collapsed');

    widget.classList.toggle('collapsed');

    if (
      !wasCollapsed
      && widget.classList.contains('collapsed')
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

  bindPushWidgetAuthListener();
  setupFooterProtection();

}

function bindPushWidgetAuthListener() {

  if (!window.supabaseClient?.auth) {
    return;
  }

  window.supabaseClient.auth.onAuthStateChange(
    (event) => {

      if (event === 'SIGNED_OUT') {
        hidePushWidget();
      }

    }
  );

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
