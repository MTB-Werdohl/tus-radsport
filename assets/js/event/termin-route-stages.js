function getTerminRouteStagesTableName() {

  return (
    window.siteConfig?.tables
      ?.terminRouteStages
    || 'termin_route_stages'
  );

}

function getTerminRouteStageLabel(
  sortOrder
) {

  return `Tag ${sortOrder}`;

}

function normalizeTerminRouteStageRow(
  stage,
  index = 0
) {

  const sortOrder =
    Number(stage?.sort_order)
    || index + 1;

  const komoot =
    String(stage?.komoot || '')
      .trim();

  const gpxStoragePath =
    String(
      stage?.gpx_storage_path || ''
    ).trim();

  const gpx =
    String(stage?.gpx || '')
      .trim();

  if (
    !komoot
    && !gpxStoragePath
    && !gpx
  ) {
    return null;
  }

  return {
    sort_order: sortOrder,
    komoot: komoot || null,
    gpx_storage_path:
      gpxStoragePath || null,
    gpx: gpx || null
  };

}

function buildTerminRouteStagesFromLegacy(
  event
) {

  if (!event) {
    return [];
  }

  if (
    Array.isArray(event.route_stages)
    && event.route_stages.length
  ) {
    return event.route_stages
      .map(normalizeTerminRouteStageRow)
      .filter(Boolean);
  }

  const komoot =
    String(event.komoot || '')
      .trim();

  const gpxStoragePath =
    String(
      event.gpx_storage_path || ''
    ).trim();

  const gpx =
    String(event.gpx || '')
      .trim();

  if (
    !komoot
    && !gpxStoragePath
    && !gpx
  ) {
    return [];
  }

  return [{
    sort_order: 1,
    komoot: komoot || null,
    gpx_storage_path:
      gpxStoragePath || null,
    gpx: gpx || null
  }];

}

function resolveTerminRouteStageGpx(
  stage
) {

  if (!stage) {
    return null;
  }

  if (stage.gpx_storage_path) {

    return (
      resolveMediaPublicUrl(
        stage.gpx_storage_path
      )
      || stage.gpx
      || null
    );

  }

  return stage.gpx || null;

}

async function loadTerminRouteStages(
  terminId
) {

  if (!terminId) {
    return [];
  }

  const { data, error } =
    await window.supabaseClient
      .from(
        getTerminRouteStagesTableName()
      )
      .select(
        'id,sort_order,komoot,gpx_storage_path,gpx'
      )
      .eq('termin_id', terminId)
      .order('sort_order', {
        ascending: true
      });

  if (error) {

    console.error(error);

    return [];

  }

  return (data || [])
    .map(normalizeTerminRouteStageRow)
    .filter(Boolean);

}

async function saveTerminRouteStages(
  terminId,
  stages
) {

  if (!terminId) {
    return {
      ok: false,
      error: new Error(
        'Termin-ID fehlt'
      )
    };
  }

  const normalized =
    (stages || [])
      .map(normalizeTerminRouteStageRow)
      .filter(Boolean)
      .map((stage, index) => ({
        termin_id: terminId,
        sort_order: index + 1,
        komoot: stage.komoot,
        gpx_storage_path:
          stage.gpx_storage_path,
        gpx: stage.gpx
      }));

  const { error: deleteError } =
    await window.supabaseClient
      .from(
        getTerminRouteStagesTableName()
      )
      .delete()
      .eq('termin_id', terminId);

  if (deleteError) {

    console.error(deleteError);

    return {
      ok: false,
      error: deleteError
    };

  }

  if (!normalized.length) {
    return { ok: true };
  }

  const { error: insertError } =
    await window.supabaseClient
      .from(
        getTerminRouteStagesTableName()
      )
      .insert(normalized);

  if (insertError) {

    console.error(insertError);

    return {
      ok: false,
      error: insertError
    };

  }

  return { ok: true };

}

function renderTerminRouteStagesEditorShell() {

  return `
<fieldset class="member-edit-field termin-route-stages-field">

  <legend>
    Routen (Komoot / GPX)
  </legend>

  <p class="termin-route-stages-hint">
    Pro Fahrtag eine Zeile — z.&nbsp;B. Tag&nbsp;1, Tag&nbsp;2 …
  </p>

  <div
    class="termin-route-stages-editor"
    id="route-stages-editor"
    aria-live="polite">

  </div>

  <button
    type="button"
    id="route-stages-add"
    class="member-edit-btn member-edit-btn--secondary termin-route-stages-add">

    + Tag hinzufügen

  </button>

</fieldset>
  `.trim();

}

function getTerminRouteStageRowElements(
  row
) {

  return {
    komoot:
      row.querySelector(
        '.termin-route-stage-komoot'
      ),
    gpxPath:
      row.querySelector(
        '.termin-route-stage-gpx-path'
      ),
    gpxPreview:
      row.querySelector(
        '.termin-route-stage-gpx-preview'
      )
  };

}

function renumberTerminRouteStageRows(
  editor
) {

  if (!editor) {
    return;
  }

  editor
    .querySelectorAll(
      '.termin-route-stage-row'
    )
    .forEach((row, index) => {

      const sortOrder = index + 1;

      row.dataset.stageIndex =
        String(index);

      const label =
        row.querySelector(
          '.termin-route-stage-row__label'
        );

      if (label) {
        label.textContent =
          getTerminRouteStageLabel(
            sortOrder
          );
      }

      const removeButton =
        row.querySelector(
          '.termin-route-stage-remove'
        );

      if (removeButton) {
        removeButton.hidden =
          editor.querySelectorAll(
            '.termin-route-stage-row'
          ).length <= 1;
      }

    });

}

function createTerminRouteStageRow(
  index,
  stage = {}
) {

  const sortOrder = index + 1;
  const hiddenId =
    `route-stage-gpx-path-${index}`;
  const previewId =
    `route-stage-gpx-preview-${index}`;
  const pickButtonId =
    `route-stage-pick-gpx-${index}`;

  const row =
    document.createElement('div');

  row.className =
    'termin-route-stage-row';

  row.dataset.stageIndex =
    String(index);

  row.innerHTML = `
<div class="termin-route-stage-row__label">
  ${getTerminRouteStageLabel(sortOrder)}
</div>

<label class="termin-route-stage-komoot-field">
  <span class="visually-hidden">
    Komoot ${getTerminRouteStageLabel(sortOrder)}
  </span>
  <input
    type="url"
    class="termin-route-stage-komoot"
    placeholder="Komoot-Link"
    value="">
</label>

<div class="termin-route-stage-gpx-field">
  <input
    type="hidden"
    class="termin-route-stage-gpx-path"
    id="${hiddenId}"
    value="">
  <button
    type="button"
    id="${pickButtonId}"
    class="member-edit-btn member-edit-btn--secondary termin-route-stage-pick-gpx">
    GPX aus Mediathek
  </button>
  <div
    class="termin-route-stage-gpx-preview"
    id="${previewId}">
  </div>
</div>

<button
  type="button"
  class="termin-route-stage-remove"
  aria-label="Tag entfernen"
  title="Tag entfernen">

  ×

</button>
  `.trim();

  const {
    komoot,
    gpxPath
  } =
    getTerminRouteStageRowElements(row);

  if (komoot) {
    komoot.value =
      stage.komoot || '';
  }

  if (gpxPath) {
    gpxPath.value =
      stage.gpx_storage_path || '';
  }

  if (
    stage.gpx_storage_path
    && typeof applyMemberEditMediaSelection
      === 'function'
  ) {

    applyMemberEditMediaSelection(
      previewId,
      'gpx',
      stage.gpx_storage_path,
      hiddenId
    );

  }

  row
    .querySelector(
      '.termin-route-stage-remove'
    )
    ?.addEventListener('click', () => {

      const editor =
        row.closest(
          '#route-stages-editor'
        );

      if (
        !editor
        || editor.querySelectorAll(
          '.termin-route-stage-row'
        ).length <= 1
      ) {
        return;
      }

      row.remove();
      renumberTerminRouteStageRows(
        editor
      );

      bindTerminRouteStagePickers(
        editor,
        {
          pickerMode:
            window
              .terminRouteStagesPickerMode
            || 'vorstand'
        }
      );

    });

  return row;

}

function bindTerminRouteStagePickers(
  editor,
  options = {}
) {

  if (
    !editor
    || typeof bindMediaPickerButton
      !== 'function'
  ) {
    return;
  }

  editor
    .querySelectorAll(
      '.termin-route-stage-row'
    )
    .forEach((row, index) => {

      const pickButton =
        row.querySelector(
          '.termin-route-stage-pick-gpx'
        );

      const {
        gpxPath,
        gpxPreview
      } =
        getTerminRouteStageRowElements(
          row
        );

      if (
        !pickButton
        || !gpxPath
        || !gpxPreview
      ) {
        return;
      }

      const hiddenId =
        `route-stage-gpx-path-${index}`;
      const previewId =
        `route-stage-gpx-preview-${index}`;
      const pickButtonId =
        `route-stage-pick-gpx-${index}`;

      gpxPath.id = hiddenId;
      gpxPreview.id = previewId;
      pickButton.id = pickButtonId;

      bindMediaPickerButton(
        pickButtonId,
        {
          kind: 'gpx',
          hiddenInputId: hiddenId,
          previewContainerId: previewId,
          title:
            `GPX ${getTerminRouteStageLabel(index + 1)}`,
          pickerMode:
            options.pickerMode
            || 'vorstand'
        }
      );

    });

}

function populateTerminRouteStagesEditor(
  stages = [],
  options = {}
) {

  const editor =
    document.getElementById(
      'route-stages-editor'
    );

  if (!editor) {
    return;
  }

  editor.innerHTML = '';

  const rows =
    stages.length
      ? stages
      : [{}];

  rows.forEach((stage, index) => {

    editor.appendChild(
      createTerminRouteStageRow(
        index,
        stage
      )
    );

  });

  renumberTerminRouteStageRows(
    editor
  );

  bindTerminRouteStagePickers(
    editor,
    options
  );

}

function collectTerminRouteStagesFromEditor() {

  const editor =
    document.getElementById(
      'route-stages-editor'
    );

  if (!editor) {
    return [];
  }

  const stages = [];

  editor
    .querySelectorAll(
      '.termin-route-stage-row'
    )
    .forEach((row, index) => {

      const {
        komoot,
        gpxPath
      } =
        getTerminRouteStageRowElements(
          row
        );

      let gpxStoragePath =
        gpxPath?.value?.trim() || '';

      if (
        typeof resolveMediaPickerSelectionForSave
          === 'function'
      ) {

        const picked =
          resolveMediaPickerSelectionForSave(
            gpxPath?.id,
            gpxStoragePath,
            null
          );

        gpxStoragePath =
          picked.storagePath || '';

      }

      const normalized =
        normalizeTerminRouteStageRow({
          sort_order: index + 1,
          komoot:
            komoot?.value || '',
          gpx_storage_path:
            gpxStoragePath
        }, index);

      if (normalized) {
        stages.push(normalized);
      }

    });

  return stages;

}

function initTerminRouteStagesEditor(
  options = {}
) {

  window.terminRouteStagesPickerMode =
    options.pickerMode || 'vorstand';

  populateTerminRouteStagesEditor(
    options.stages || [],
    options
  );

  const addButton =
    document.getElementById(
      'route-stages-add'
    );

  if (
    addButton
    && addButton.dataset.bound
      !== 'true'
  ) {

    addButton.dataset.bound = 'true';

    addButton.addEventListener(
      'click',
      () => {

        const editor =
          document.getElementById(
            'route-stages-editor'
          );

        if (!editor) {
          return;
        }

        const index =
          editor.querySelectorAll(
            '.termin-route-stage-row'
          ).length;

        editor.appendChild(
          createTerminRouteStageRow(
            index
          )
        );

        renumberTerminRouteStageRows(
          editor
        );

        bindTerminRouteStagePickers(
          editor,
          options
        );

      }
    );

  }

}

function resetTerminRouteStagesEditor(
  options = {}
) {

  populateTerminRouteStagesEditor(
    [],
    options
  );

}

function renderTerminRouteStagesTable(
  stages
) {

  const rows =
    (stages || [])
      .map(normalizeTerminRouteStageRow)
      .filter(Boolean);

  if (!rows.length) {
    return '';
  }

  const body =
    rows.map((stage) => {

      const label =
        getTerminRouteStageLabel(
          stage.sort_order
        );

      const komootUrl =
        stage.komoot || '';

      const gpxUrl =
        resolveTerminRouteStageGpx(
          stage
        );

      const komootCell =
        komootUrl
          ? `
<a
  href="${komootUrl}"
  target="_blank"
  rel="noopener noreferrer"
  class="event-button event-route-stage-button">

  Komoot

</a>
          `.trim()
          : `
<span class="event-route-stage-empty">
  —
</span>
          `.trim();

      const gpxCell =
        gpxUrl
          ? `
<a
  href="${gpxUrl}"
  target="_blank"
  rel="noopener noreferrer"
  class="event-button event-route-stage-button"
  download>

  GPX

</a>
          `.trim()
          : `
<span class="event-route-stage-empty">
  —
</span>
          `.trim();

      return `
<tr>
  <th scope="row">
    ${label}
  </th>
  <td>
    ${komootCell}
  </td>
  <td>
    ${gpxCell}
  </td>
</tr>
      `.trim();

    }).join('');

  return `
<div class="event-route-stages">

<table class="event-route-stages-table">

<caption class="visually-hidden">
  Routen pro Tag
</caption>

<thead>

<tr>

<th scope="col">
  Tag
</th>

<th scope="col">
  Komoot
</th>

<th scope="col">
  GPX
</th>

</tr>

</thead>

<tbody>

${body}

</tbody>

</table>

</div>
  `.trim();

}
