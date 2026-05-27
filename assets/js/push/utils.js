function urlBase64ToUint8Array(base64String) {

  const padding = '='.repeat(
    (4 - base64String.length % 4) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(char => char.charCodeAt(0))
  );

}

function getDeviceName() {

  const ua =
    navigator.userAgent || '';

  let platform = '';
  let browser = '';

  if (navigator.userAgentData?.platform) {

    platform =
      navigator.userAgentData.platform;

  } else if (/iPhone|iPad|iPod/.test(ua)) {

    platform = 'iPhone';

  } else if (/Android/.test(ua)) {

    platform = 'Android';

  } else if (/Mac/.test(navigator.platform || ua)) {

    platform = 'macOS';

  } else if (/Win/.test(navigator.platform || ua)) {

    platform = 'Windows';

  } else if (/Linux/.test(navigator.platform || ua)) {

    platform = 'Linux';

  }

  if (/Edg\//.test(ua)) {

    browser = 'Edge';

  } else if (/OPR\//.test(ua) || /Opera/.test(ua)) {

    browser = 'Opera';

  } else if (/Firefox\//.test(ua)) {

    browser = 'Firefox';

  } else if (/CriOS\//.test(ua)) {

    browser = 'Chrome';

  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {

    browser = 'Chrome';

  } else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {

    browser = 'Safari';

  }

  if (platform && browser) {

    return `${platform} ${browser}`;

  }

  if (platform) {
    return platform;
  }

  if (browser) {
    return browser;
  }

  return 'Unbekanntes Gerät';

}
