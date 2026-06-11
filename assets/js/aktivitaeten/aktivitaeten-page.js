async function loadAktivitaetenPortal() {

  bindAktivitaetenTabEvents();

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

function switchAktivitaetenTab(tabId) {

  document
    .querySelectorAll('[data-aktivitaeten-tab]')
    .forEach((button) => {

      const isActive =
        button.dataset.aktivitaetenTab === tabId;

      button.classList.toggle(
        'is-active',
        isActive
      );

      button.setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );

    });

  document
    .querySelectorAll('[data-aktivitaeten-panel]')
    .forEach((panel) => {

      panel.hidden =
        panel.dataset.aktivitaetenPanel !== tabId;

      if (
        !panel.hidden
        && panel.dataset.aktivitaetenPanel === 'feed'
      ) {
        refreshActivityMaps(panel);
      }

    });

}

function bindAktivitaetenTabEvents() {

  document
    .querySelectorAll('[data-aktivitaeten-tab]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          switchAktivitaetenTab(
            button.dataset.aktivitaetenTab
          );

        }
      );

    });

}
