async function loadActivityDetail() {

  let activityId =

    new URLSearchParams(
      window.location.search
    )

    .get('id');

  if (!activityId) {

    const parts =

      window.location.pathname
        .split('/')
        .filter(Boolean);

    const aktivitaetenIndex =
      parts.indexOf('aktivitaeten');

    if (
      aktivitaetenIndex >= 0
      && parts[aktivitaetenIndex + 1]
    ) {
      activityId =
        parts[aktivitaetenIndex + 1];
    }

  }

  if (!activityId) {
    renderActivityDetail(null);
    return;
  }

  try {

    const activity =
      await fetchPublicActivityDetail(
        activityId
      );

    if (activity) {

      document.title =
        `${activity.activity_name || 'Aktivität'} · MTB Werdohl`;

      window.history.replaceState(
        {},
        '',
        getActivityUrl(activity.id)
      );

    }

    renderActivityDetail(activity);

    const container =
      document.getElementById(
        'aktivitaeten-detail'
      );

    if (
      container
      && activity?.id
      && typeof loadActivityDetailStreamAnalysis
        === 'function'
    ) {
      loadActivityDetailStreamAnalysis(
        activity.id,
        container
      );
    }

  } catch (error) {

    console.error(error);
    renderActivityDetail(null);

  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadActivityDetail
);
