function escapeMemberEmailLogText(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatMemberEmailLogTimestamp(value) {

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

function renderMemberEmailLogRecipients(recipients) {

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
          ? ' class="member-email-log-recipient-failed"'
          : '';

      const suffix =
        failed && recipient.error
          ? ` — ${escapeMemberEmailLogText(recipient.error)}`
          : '';

      const label =
        [
          recipient.name,
          recipient.email
        ]
          .filter(Boolean)
          .join(' · ');

      return `<li${className}>${escapeMemberEmailLogText(label)}${suffix}</li>`;

    })
      .join('');

  return `<ul>${items}</ul>`;

}

function renderMemberEmailLogEntry(entry) {

  const sentLabel =
    formatMemberEmailLogTimestamp(entry.sent_at);

  const countLabel =
    `${entry.sent_count || 0} von ${entry.recipient_count || 0} gesendet`;

  const summary =
    [
      sentLabel,
      escapeMemberEmailLogText(entry.sent_by_label || 'Vorstand'),
      escapeMemberEmailLogText(entry.audience_label || ''),
      countLabel
    ]
      .filter(Boolean)
      .join(' · ');

  return `
    <details class="member-email-log-entry">
      <summary class="member-email-log-summary">
        <p class="member-email-log-meta">${summary}</p>
        <p class="member-email-log-subject">${escapeMemberEmailLogText(entry.subject)}</p>
      </summary>
      <div class="member-email-log-recipients">
        <strong>Empfänger</strong>
        ${renderMemberEmailLogRecipients(entry.recipients)}
      </div>
      <pre class="member-email-log-body">${escapeMemberEmailLogText(entry.body)}</pre>
    </details>
  `;

}

async function loadMemberEmailLog() {

  const container =
    document.getElementById(
      'member-email-log-list'
    );

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
        '<p class="member-email-hint">Noch keine Einträge.</p>';

      return;

    }

    container.innerHTML =
      data
        .map(renderMemberEmailLogEntry)
        .join('');

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<p class="member-email-hint">Protokoll konnte nicht geladen werden.</p>';

  }

}
