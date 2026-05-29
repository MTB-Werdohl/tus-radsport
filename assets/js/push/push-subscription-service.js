async function getBrowserPushEndpoint() {

  if (!('serviceWorker' in navigator)) {
    return null;
  }

  if (!('PushManager' in window)) {
    return null;
  }

  try {

    await ensurePushServiceWorker();

  } catch (error) {

    return null;

  }

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration
      .pushManager
      .getSubscription();

  return subscription?.endpoint || null;

}

async function fetchMemberPushSubscription(
  memberId,
  endpoint
) {

  if (!memberId || !endpoint) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.pushSubscriptions
      )
      .select(
        'id, created_at, device_name, endpoint, active'
      )
      .eq('member_id', memberId)
      .eq('endpoint', endpoint)
      .eq('active', 'true')
      .maybeSingle();

  if (error) {

    console.error(
      'Push subscription lookup:',
      error
    );

    return null;

  }

  return data;

}

async function resolveMemberPushState(member) {

  if (!member?.id) {

    return {
      supported: false,
      active: false
    };

  }

  if (
    !('serviceWorker' in navigator)
    || !('PushManager' in window)
  ) {

    return {
      supported: false,
      active: false
    };

  }

  const endpoint =
    await getBrowserPushEndpoint();

  if (!endpoint) {

    return {
      supported: true,
      active: false
    };

  }

  const row =
    await fetchMemberPushSubscription(
      member.id,
      endpoint
    );

  if (!row) {

    return {
      supported: true,
      active: false
    };

  }

  return {
    supported: true,
    active: true,
    device_name:
      row.device_name || 'Unbekanntes Gerät',
    created_at: row.created_at || ''
  };

}
