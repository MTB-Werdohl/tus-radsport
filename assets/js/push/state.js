const PUSH_SEEN_STORAGE_KEY = 'lastSeenPush';

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

function normalizePushMessage(value) {

  if (!value) {
    return null;
  }

  return {
    title: value.title || '',
    body: value.body || '',
    url: value.url || '/',
    sent_at: value.sent_at || ''
  };

}

function normalizePushTimestamp(value) {

  if (!value) {
    return 0;
  }

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;

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

  return normalizePushTimestamp(push.sent_at)
    > normalizePushTimestamp(lastSeen);

}

function markPushSeen(pushOrSentAt) {

  const push =
    typeof pushOrSentAt === 'object'
      ? pushOrSentAt
      : { sent_at: pushOrSentAt };

  const sentAt =
    push?.sent_at;

  if (!sentAt) {
    return;
  }

  const date =
    new Date(sentAt);

  if (Number.isNaN(date.getTime())) {
    return;
  }

  const normalizedSentAt =
    date.toISOString();

  const current =
    getLastSeenPushAt();

  if (
    !current
    || normalizePushTimestamp(sentAt)
      >= normalizePushTimestamp(current)
  ) {
    localStorage.setItem(
      PUSH_SEEN_STORAGE_KEY,
      normalizedSentAt
    );
  }

}

async function saveLastPush(
  title,
  body,
  url
) {

  const payload = {
    title,
    body,
    url: url || '/',
    sent_at: new Date().toISOString()
  };

  const { error } =
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

  if (error) {

    console.error(error);

    return false;

  }

  return true;

}

async function getLastPush() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.siteState)
      .select('value')
      .eq(
        'key',
        window.siteConfig.siteStateKeys.lastPush
      )
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  return normalizePushMessage(data?.value);

}
