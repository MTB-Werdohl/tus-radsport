function formatMediaMigrationReport(
  data
) {

  if (!data) {
    return '(keine Daten)';
  }

  return JSON.stringify(
    data,
    null,
    2
  );

}

function renderMediaMigrationStatus(
  counts
) {

  const statusEl =
    document.getElementById(
      'media-migration-status'
    );

  if (
    !statusEl
    || !counts
  ) {
    return;
  }

  statusEl.innerHTML = `
<ul class="admin-media-migration__stats">
  <li>
    Termine ohne Bild-Pfad:
    <strong>${counts.termine_image || 0}</strong>
  </li>
  <li>
    Termine ohne GPX-Pfad:
    <strong>${counts.termine_gpx || 0}</strong>
  </li>
  <li>
    News ohne Bild-Pfad:
    <strong>${counts.news_image || 0}</strong>
  </li>
  <li>
    Pfade außerhalb shared/:
    <strong>${counts.legacy_paths || 0}</strong>
  </li>
</ul>
  `.trim();

}

async function loadMediaMigrationStatus() {

  const statusEl =
    document.getElementById(
      'media-migration-status'
    );

  if (!statusEl) {
    return;
  }

  statusEl.textContent =
    'Status wird geladen …';

  try {

    const { data, error } =
      await window.supabaseClient
        .rpc(
          'count_media_backfill_candidates'
        );

    if (error) {
      throw error;
    }

    renderMediaMigrationStatus(
      data
    );

  } catch (error) {

    console.error(error);

    statusEl.innerHTML = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error.message
    || 'Status konnte nicht geladen werden.'
  )}
</p>
    `.trim();

  }

}

async function runMediaMigrationBackfill(
  dryRun
) {

  const moveShared =
    document
      .getElementById(
        'media-migration-move-shared'
      )
      ?.checked || false;

  const reportEl =
    document.getElementById(
      'media-migration-report'
    );

  if (!reportEl) {
    return;
  }

  if (
    !dryRun
    && !window.confirm(
      moveShared
        ? 'Backfill ausführen und Legacy-Dateien nach shared/ verschieben?'
        : 'Backfill ausführen und *_storage_path setzen?'
    )
  ) {
    return;
  }

  reportEl.hidden = false;
  reportEl.textContent =
    dryRun
      ? 'Vorschau wird erstellt …'
      : 'Backfill läuft …';

  try {

    const { data, error } =
      await window.supabaseClient
        .rpc(
          'backfill_media_storage_paths',
          {
            p_move_legacy_to_shared:
              moveShared,
            p_dry_run: dryRun
          }
        );

    if (error) {
      throw error;
    }

    reportEl.textContent =
      formatMediaMigrationReport(
        data
      );

    if (!dryRun) {
      await loadMediaMigrationStatus();
    }

  } catch (error) {

    console.error(error);

    reportEl.textContent =
      error.message
      || 'Backfill fehlgeschlagen.';

  }

}

async function loadMediaMigrationOrphans() {

  const reportEl =
    document.getElementById(
      'media-migration-orphans-report'
    );

  if (!reportEl) {
    return;
  }

  reportEl.hidden = false;
  reportEl.textContent =
    'Waisen werden gesucht …';

  try {

    const { data, error } =
      await window.supabaseClient
        .rpc(
          'list_media_storage_orphans'
        );

    if (error) {
      throw error;
    }

    reportEl.textContent =
      formatMediaMigrationReport(
        data
      );

  } catch (error) {

    console.error(error);

    reportEl.textContent =
      error.message
      || 'Waisen konnten nicht geladen werden.';

  }

}

function initMediaMigration() {

  loadMediaMigrationStatus();

  document
    .getElementById(
      'media-migration-preview'
    )
    ?.addEventListener('click', () => {

      runMediaMigrationBackfill(
        true
      );

    });

  document
    .getElementById(
      'media-migration-run'
    )
    ?.addEventListener('click', () => {

      runMediaMigrationBackfill(
        false
      );

    });

  document
    .getElementById(
      'media-migration-orphans'
    )
    ?.addEventListener('click', () => {

      loadMediaMigrationOrphans();

    });

}
