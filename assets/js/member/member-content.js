function renderMemberTerminEditPanelShell(
  options
) {

  const isVorstandUser =
    options?.isVorstand === true;

  const lead =
    isVorstandUser
      ? 'Termin anlegen oder bearbeiten.'
      : 'Entwurf (nur Vorstand) — wird nach Prüfung veröffentlicht.';

  const sichtbarkeitField =
    isVorstandUser
      ? `
    <label class="member-edit-field">
      Sichtbarkeit
      <select id="member-termin-sichtbarkeit">

        <option value="draft">
          Entwurf (nur Vorstand)
        </option>

        <option value="public">
          Öffentlich
        </option>

        <option value="members">
          Nur Mitglieder
        </option>

      </select>
    </label>
      `.trim()
      : '';

  return `
<section class="member-profile-section-block member-content-panel">

  <h2 id="form-title">
    Termin
  </h2>

  <p class="member-content-lead">
    ${lead}
  </p>

  <div class="member-content-edit-form member-content-edit-form--tab">

    <label class="member-edit-field member-edit-field--required">
      Titel
      <input id="title"
             type="text"
             required
             placeholder="Titel">
    </label>

    <div class="member-edit-row">

      <label class="member-edit-field member-edit-field--required">
        Datum
        <input id="date"
               type="date"
               required>
      </label>

      <label class="member-edit-field">
        Ende (optional)
        <input id="endDate"
               type="date">
      </label>

      <label class="member-edit-field member-edit-field--required">
        Uhrzeit
        <input id="startTime"
               type="time"
               required>
      </label>

    </div>

    <p class="member-edit-hint">
      Enddatum leer lassen für eintägige Termine.
      Für Mehrtages-Termine z.&nbsp;B. Fr–So Enddatum setzen.
    </p>

    <label class="member-edit-field member-edit-field--required">
      Ort
      <input id="location"
             type="text"
             required
             placeholder="Ort">
    </label>

    <label class="member-edit-field">
      Bild
      <input id="imageStoragePathPick"
             type="hidden">
      <div class="member-edit-media-actions">
        <button id="pick-image-btn"
                type="button"
                class="member-edit-btn member-edit-btn--secondary">
          Aus Mediathek
        </button>
      </div>
      <div id="currentImage"></div>
    </label>

    <label class="member-edit-field">
      GPX
      <input id="gpxStoragePathPick"
             type="hidden">
      <div class="member-edit-media-actions">
        <button id="pick-gpx-btn"
                type="button"
                class="member-edit-btn member-edit-btn--secondary">
          Aus Mediathek
        </button>
      </div>
      <div id="currentGpx"></div>
    </label>

    <label class="member-edit-field">
      Komoot Link
      <input id="komoot"
             type="text"
             placeholder="Komoot Link">
    </label>

    <label class="member-edit-field">
      Inhalt
      <textarea id="content"
                rows="8"
                placeholder="Inhalt"></textarea>
    </label>

    ${sichtbarkeitField}

    <button id="save-event"
            type="button"
            class="member-edit-save">

      Speichern

    </button>

  </div>

</section>
  `.trim();

}

function initMemberEditUnsavedGuard() {

  let dirty = false;

  const root =
    document.querySelector(
      '.member-content-edit-form'
    );

  if (!root) {
    return { markClean() {} };
  }

  function markDirty() {
    dirty = true;
  }

  root.addEventListener('input', markDirty);
  root.addEventListener('change', markDirty);

  window.addEventListener('beforeunload', (event) => {

    if (!dirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';

  });

  return {
    markClean() {
      dirty = false;
    }
  };

}
