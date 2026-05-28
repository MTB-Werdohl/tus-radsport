const PUSH_SEEN_STORAGE_KEY = 'lastSeenPush';

const PUSH_HISTORY_LIMIT = 15;

function escapePushHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function normalizePushMessage(row) {

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    url: row.url || '/',
    sent_at: row.sent_at || ''
  };

}

function getLastSeenPushAt() {

  return localStorage.getItem(
    PUSH_SEEN_STORAGE_KEY
  ) || '';

}

function isPushUnread(push) {

  if (!push?.sent_at) {
    return false;
  }

  const lastSeen =
    getLastSeenPushAt();

  if (!lastSeen) {
    return true;
  }

  return push.sent_at > lastSeen;

}

function markPushSeen(sentAt) {

  if (!sentAt) {
    return;
  }

  const current =
    getLastSeenPushAt();

  if (!current || sentAt > current) {
    localStorage.setItem(
      PUSH_SEEN_STORAGE_KEY,
      sentAt
    );
  }

}

function markAllPushesSeen(messages) {

  if (!messages?.length) {
    return;
  }

  markPushSeen(messages[0].sent_at);

}

async function savePushMessage(
  title,
  body,
  url
) {

  const sentAt =
    new Date().toISOString();

  const payload = {
    title,
    body,
    url: url || '/',
    sent_at: sentAt
  };

  const { error: insertError } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.pushMessages
      )
      .insert([payload]);

  if (insertError) {

    console.error(insertError);

    return false;

  }

  const { error: stateError } =
    await window.supabaseClient
      .from(window.siteConfig.tables.siteState)
      .upsert(
        {
          key:
            window.siteConfig.siteStateKeys.lastPush,
          value: payload
        },
        { onConflict: 'key' }
      );

  if (stateError) {

    console.error(stateError);

  }

  return true;

}

async function getLastPush() {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.pushMessages
      )
      .select('id, title, body, url, sent_at')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  if (!error && data) {
    return normalizePushMessage(data);
  }

  if (error) {
    console.error(error);
  }

  const { data: legacy, error: legacyError } =
    await window.supabaseClient
      .from(window.siteConfig.tables.siteState)
      .select('value')
      .eq(
        'key',
        window.siteConfig.siteStateKeys.lastPush
      )
      .maybeSingle();

  if (legacyError) {

    console.error(legacyError);

    return null;

  }

  return normalizePushMessage(legacy?.value);

}

function dedupePushMessages(messages) {

  const seen =
    new Set();

  return messages.filter((message) => {

    const key = [
      message.title,
      message.body,
      message.url || '/'
    ].join('\0');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;

  });

}

async function getPushMessages(
  limit = PUSH_HISTORY_LIMIT
) {

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.pushMessages
      )
      .select('id, title, body, url, sent_at')
      .order('sent_at', { ascending: false })
      .limit(limit);

  if (error) {

    console.error(error);

    return [];

  }

  return dedupePushMessages(
    (data || [])
      .map(normalizePushMessage)
      .filter(Boolean)
  );

}

async function saveLastPush(
  title,
  body,
  url
) {

  return savePushMessage(
    title,
    body,
    url
  );

}
