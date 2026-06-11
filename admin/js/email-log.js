function escapeEmailLogText(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatEmailLogTimestamp(value) {

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

}

function renderEmailLogRecipients(recipients) {

  const rows =
    Array.isArray(recipients)
      ? recipients
      : [];

  if (rows.length === 0) {
    return '<p>Keine Empfänger gespeichert.</p>';
  }

  const items =
    rows.map((recipient) => {

      const failed =
        recipient.status === 'failed';

      const className =
        failed
          ? ' class="admin-email-log-recipient-failed"'
          : '';

      const suffix =
        failed && recipient.error
          ? ` — ${escapeEmailLogText(recipient.error)}`
          : '';

      const label =
        [
          recipient.name,
          recipient.email
        ]
          .filter(Boolean)
          .join(' · ');

      return `<li${className}>${escapeEmailLogText(label)}${suffix}</li>`;

    })
      .join('');

  return `<ul>${items}</ul>`;

}

function renderEmailLogEntry(entry) {

  const sentLabel =
    formatEmailLogTimestamp(entry.sent_at);

  const countLabel =
    `${entry.sent_count || 0} von ${entry.recipient_count || 0} gesendet`;

  const summary =
    [
      sentLabel,
      escapeEmailLogText(entry.sent_by_label || 'Vorstand'),
      escapeEmailLogText(entry.audience_label || ''),
      countLabel
    ]
      .filter(Boolean)
      .join(' · ');

  return `
    <details class="admin-email-log-entry">
      <summary class="admin-email-log-summary">
        <p class="admin-email-log-meta">${summary}</p>
        <p class="admin-email-log-subject">${escapeEmailLogText(entry.subject)}</p>
      </summary>
      <div class="admin-email-log-recipients">
        <strong>Empfänger</strong>
        ${renderEmailLogRecipients(entry.recipients)}
      </div>
      <pre class="admin-email-log-body">${escapeEmailLogText(entry.body)}</pre>
    </details>
  `;

}

async function loadAdminEmailLog() {

  const container =
    document.getElementById('email-log-list');

  if (!container) {
    return;
  }

  try {

    const { data, error } =
      await window.supabaseClient
        .from('admin_email_log')
        .select(`
          id,
          sent_at,
          sent_by_label,
          audience_label,
          subject,
          body,
          recipient_count,
          sent_count,
          recipients
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

    if (error) {
      throw error;
    }

    if (!data?.length) {

      container.innerHTML =
        '<p class="admin-email-hint">Noch keine Einträge.</p>';

      return;

    }

    container.innerHTML =
      data
        .map(renderEmailLogEntry)
        .join('');

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<p class="admin-email-hint">Protokoll konnte nicht geladen werden.</p>';

  }

}

async function initAdminEmailLogPage() {

  await loadAdminEmailLog();

}
