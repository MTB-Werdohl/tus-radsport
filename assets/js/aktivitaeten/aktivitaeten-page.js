async function loadAktivitaetenPortal() {

  const feedDays =
    getActivityFeedDays();

  const period =
    getCurrentStatsPeriod();

  try {

    const [
      feed,
      monthRankings,
      yearRankings,
      monthClub,
      yearClub
    ] =
      await Promise.all([
        fetchPublicActivityFeed(),
        fetchPublicMemberRankings(
          period.year,
          period.month
        ),
        fetchPublicMemberRankings(
          period.year,
          null
        ),
        fetchPublicClubStats(
          period.year,
          period.month
        ),
        fetchPublicClubStats(
          period.year,
          null
        )
      ]);

    renderActivityFeed(
      feed,
      feedDays
    );

    renderMemberRankings(
      monthRankings,
      yearRankings,
      period
    );

    renderClubStats(
      monthClub,
      yearClub,
      period
    );

  } catch (error) {

    console.error(error);

    const message =
      String(error?.message || '');

    const hint =
      message.includes('Could not find the function')
      || error?.code === 'PGRST202'
        ? 'Das Aktivitätsportal ist serverseitig noch nicht eingerichtet. Bitte docs/supabase-strava-public.sql im SQL Editor ausführen.'
        : 'Aktivitäten konnten nicht geladen werden.';

    const portal =
      document.getElementById(
        'aktivitaeten-portal'
      );

    if (portal) {
      portal.innerHTML = `
<p class="aktivitaeten-hint aktivitaeten-hint--error">
  ${hint}
</p>
      `;
    }

  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadAktivitaetenPortal
);
