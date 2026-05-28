function formatPushMessageDate(sentAt) {

  if (!sentAt) {
    return '';
  }

  const date =
    new Date(sentAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    'de-DE',
    {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  );

}

function renderPushMessageCard(message) {

  const unread =
    isPushUnread(message);

  const titlePrefix =
    unread ? '• ' : '';

  const card =
    document.createElement('article');

  card.className =
    'push-message-card'
    + (unread ? ' push-message-card--unread' : '');

  const url =
    message.url
    && message.url !== '/'
      ? message.url
      : '';

  card.innerHTML = `

<a
  href="${url || '#'}"
  ${url ? '' : 'class="push-message-card__static"'}
>

<div>

<h2 class="push-message-card__title">

${titlePrefix}${escapePushHtml(message.title)}

</h2>

<p class="push-message-card__body">

${escapePushHtml(message.body)}

</p>

<p class="push-message-card__meta">

${formatPushMessageDate(message.sent_at)}

</p>

${
  url
    ? '<span class="push-message-card__link">Mehr erfahren</span>'
    : ''
}

</div>

</a>

`;

  const link =
    card.querySelector('a');

  if (link && !url) {

    link.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
      }
    );

  }

  return card;

}

async function loadPushMessagesPage() {

  const wrapper =
    document.getElementById('push-messages');

  if (!wrapper) {
    return;
  }

  wrapper.innerHTML =
    '<p class="push-messages-loading">Mitteilungen werden geladen …</p>';

  const messages =
    await getPushMessages();

  wrapper.innerHTML = '';

  if (!messages.length) {

    wrapper.innerHTML =
      '<p class="push-messages-empty">Noch keine Mitteilungen vorhanden.</p>';

    return;

  }

  messages.forEach((message) => {

    wrapper.appendChild(
      renderPushMessageCard(message)
    );

  });

  markAllPushesSeen(messages);

}

document.addEventListener(
  'DOMContentLoaded',
  loadPushMessagesPage
);
