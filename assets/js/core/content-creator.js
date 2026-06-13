function escapeContentCreatorHtml(
  value
) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function collectContentCreatorIds(
  rows
) {

  return [
    ...new Set(
      (rows || [])
        .map((row) => row?.created_by)
        .filter((id) => id != null)
    )
  ];

}

async function fetchContentCreatorLabels(
  memberIds
) {

  const ids =
    [
      ...new Set(
        (memberIds || [])
          .filter((id) => id != null)
      )
    ];

  if (!ids.length) {
    return {};
  }

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_content_creator_labels',
      {
        p_member_ids: ids
      }
    );

  if (error) {

    console.warn(
      'get_content_creator_labels:',
      error.message
    );

    return {};

  }

  return data || {};

}

function applyContentCreatorLabels(
  rows,
  labelMap
) {

  return (rows || []).map((row) => {

    if (!row?.created_by) {
      return row;
    }

    const creatorLabel =
      labelMap?.[String(row.created_by)]
      || labelMap?.[row.created_by]
      || null;

    if (!creatorLabel) {
      return row;
    }

    return {
      ...row,
      creator_label: creatorLabel
    };

  });

}

async function enrichContentRowsWithCreators(
  rows
) {

  const labelMap =
    await fetchContentCreatorLabels(
      collectContentCreatorIds(rows)
    );

  return applyContentCreatorLabels(
    rows,
    labelMap
  );

}

async function enrichContentRowWithCreator(
  row
) {

  if (!row) {
    return row;
  }

  const [enriched] =
    await enrichContentRowsWithCreators([
      row
    ]);

  return enriched || row;

}

function renderContentCreatorMeta(
  creatorLabel,
  options
) {

  if (!creatorLabel) {
    return '';
  }

  const prefix =
    options?.prefix
    || 'Eingestellt von';

  const className =
    options?.className
    || 'content-creator-meta';

  return `
<p class="${className}">
  ${escapeContentCreatorHtml(prefix)}
  ${escapeContentCreatorHtml(creatorLabel)}
</p>
  `.trim();

}

function renderContentCreatorInline(
  creatorLabel
) {

  if (!creatorLabel) {
    return '';
  }

  return `
 · 👤 ${escapeContentCreatorHtml(creatorLabel)}
  `.trim();

}
