function escapeAktivitaetenHtml(value) {

  return escapeActivityCardHtml(value);

}

function renderActivityFeed(
  activities,
  feedDays
) {

  const container =
    document.getElementById(
      'aktivitaeten-feed'
    );

  if (!container) {
    return;
  }

  if (!activities?.length) {

    container.innerHTML = `
<div class="aktivitaeten-section">

  <p class="aktivitaeten-hint">
    Noch keine öffentlichen Aktivitäten in den letzten ${feedDays} Tagen.
  </p>

  <p class="aktivitaeten-hint aktivitaeten-hint--cta">
    Mitglieder: Strava im <a href="/profil/">Profil</a> verbinden und
    „Im Feed veröffentlichen“ aktivieren.
  </p>

</div>
    `;

    return;

  }

  const cards =
    activities.map((activity) => {

      return renderActivityCardHtml(
        activity,
        {
          url: getActivityUrl(activity.id)
        }
      );

    }).join('');

  container.innerHTML = `
<div class="aktivitaeten-section">

  <div class="aktivitaeten-feed-list">
    ${cards}
  </div>

</div>
  `;

}

function renderRankingsTable(
  rankings,
  title
) {

  if (!rankings?.length) {

    return `
<p class="aktivitaeten-hint">
  Für ${escapeAktivitaetenHtml(title)} liegen noch keine
  Rankings vor.
</p>
    `;

  }

  const rows =
    rankings.map((row) => `
<tr>
  <td class="aktivitaeten-rank">
    ${escapeAktivitaetenHtml(String(row.rank))}
  </td>
  <td class="aktivitaeten-rank-member">

    ${renderActivityMemberAvatar(
      row,
      'member-avatar--sm'
    )}

    <span>
      ${escapeAktivitaetenHtml(
        row.member_name || 'Mitglied'
      )}
    </span>

  </td>
  <td>
    ${escapeAktivitaetenHtml(
      formatActivityDistance(
        row.total_distance_m
      )
    )}
  </td>
  <td>
    ${escapeAktivitaetenHtml(
      formatActivityElevation(
        row.total_elevation_m
      )
    )}
  </td>
  <td>
    ${escapeAktivitaetenHtml(
      String(row.activity_count || 0)
    )}
  </td>
</tr>
    `).join('');

  return `
<div class="aktivitaeten-table-wrap">
  <h3>${escapeAktivitaetenHtml(title)}</h3>
  <table class="aktivitaeten-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Distanz</th>
        <th>Höhenmeter</th>
        <th>Touren</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>
  `;

}

function renderMemberRankings(
  monthRankings,
  yearRankings,
  period
) {

  const container =
    document.getElementById(
      'aktivitaeten-rankings'
    );

  if (!container) {
    return;
  }

  const monthTitle =
    formatGermanMonthYear(
      period.year,
      period.month
    );

  const yearTitle =
    `Gesamt ${period.year}`;

  container.innerHTML = `
<div class="aktivitaeten-section">

  ${renderRankingsTable(
    monthRankings,
    monthTitle
  )}

  ${renderRankingsTable(
    yearRankings,
    yearTitle
  )}

</div>
  `;

}

function renderClubStats(
  monthStats,
  yearStats,
  period
) {

  const container =
    document.getElementById(
      'aktivitaeten-club'
    );

  if (!container) {
    return;
  }

  function renderBlock(
    stats,
    label
  ) {

    if (!stats) {

      return `
<div class="aktivitaeten-club-block">
  <h3>${escapeAktivitaetenHtml(label)}</h3>
  <p class="aktivitaeten-hint">Noch keine Vereinsdaten.</p>
</div>
      `;

    }

    return `
<div class="aktivitaeten-club-block">
  <h3>${escapeAktivitaetenHtml(label)}</h3>
  <dl class="aktivitaeten-club-stats">
    <div>
      <dt>Gesamtdistanz</dt>
      <dd>${escapeAktivitaetenHtml(
        formatActivityDistance(
          stats.total_distance_m
        )
      )}</dd>
    </div>
    <div>
      <dt>Höhenmeter</dt>
      <dd>${escapeAktivitaetenHtml(
        formatActivityElevation(
          stats.total_elevation_m
        )
      )}</dd>
    </div>
    <div>
      <dt>Aktivitäten</dt>
      <dd>${escapeAktivitaetenHtml(
        String(stats.activity_count || 0)
      )}</dd>
    </div>
    <div>
      <dt>Aktive Mitglieder</dt>
      <dd>${escapeAktivitaetenHtml(
        String(stats.active_member_count || 0)
      )}</dd>
    </div>
  </dl>
</div>
    `;

  }

  container.innerHTML = `
<div class="aktivitaeten-section">

  ${renderBlock(
    monthStats,
    formatGermanMonthYear(
      period.year,
      period.month
    )
  )}

  ${renderBlock(
    yearStats,
    `Gesamt ${period.year}`
  )}

</div>
  `;

}

function renderActivityDetail(activity) {

  const container =
    document.getElementById(
      'aktivitaeten-detail'
    );

  if (!container) {
    return;
  }

  if (!activity) {

    container.innerHTML = `
<section class="aktivitaeten-section">

  <h1>Aktivität nicht gefunden</h1>

  <p class="aktivitaeten-hint">
    Diese Aktivität ist nicht öffentlich sichtbar oder
    liegt außerhalb des Feed-Zeitraums.
  </p>

  <p>
    <a href="/aktivitaeten/">Zurück zum Aktivitätsportal</a>
  </p>

</section>
    `;

    return;

  }

  const cardHtml =
    renderActivityCardHtml(
      activity,
      {
        mapOptions: {
          detail: true,
          height: 220
        }
      }
    );

  container.innerHTML = `
<section class="aktivitaeten-section aktivitaeten-detail">

  <p class="aktivitaeten-back">
    <a href="/aktivitaeten/">← Aktivitäten</a>
  </p>

  ${cardHtml}

</section>
  `;

}
