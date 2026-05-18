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

  const popup = document.createElement('div');

  popup.className = 'event-popup';

  popup.innerHTML = `
    <div class="event-popup-content">

      <button class="event-popup-close">
        ✕
      </button>

      <h2>${info.event.title}</h2>

      <p>
        📅
        ${info.event.start.toLocaleDateString('de-DE')}
      </p>

      <p>
        🕒
        ${info.event.start.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        })} Uhr
      </p>

      ${info.event.extendedProps.location
        ? `<p>📍 ${info.event.extendedProps.location}</p>`
        : ''
      }

      ${info.event.extendedProps.description
        ? `<p>${info.event.extendedProps.description}</p>`
        : ''
      }

      ${info.event.url
        ? `
          <a class="event-popup-button"
            href="${info.event.url}">
            Mehr Details
          </a>
        `
        : ''
      }

    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector('.event-popup-close')
    .addEventListener('click', () => {
      popup.remove();
    });

  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

}