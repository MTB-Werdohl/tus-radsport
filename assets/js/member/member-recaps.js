function normalizeMemberRecapNestedRow(
  value
) {

  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;

}

function getMemberTerminRecapRow(
  termin
) {

  return normalizeMemberRecapNestedRow(
    termin?.termin_recaps
  );

}

function memberTerminIsDraft(
  termin
) {

  const draft =
    window.siteConfig?.visibility?.draft
    || 'draft';

  return termin?.sichtbarkeit === draft;

}

function memberTerminAllowsRecapAction(
  termin
) {

  if (!termin || memberTerminIsDraft(termin)) {
    return false;
  }

  if (
    typeof terminAllowsRecapClient
      === 'function'
    && !terminAllowsRecapClient(termin)
  ) {
    return false;
  }

  return true;

}

function memberTerminRecapEditUrl(
  terminId
) {

  return `/profil/recap_edit/?termin_id=${terminId}`;

}

function memberTerminEventUrl(
  termin
) {

  if (!termin?.slug) {
    return null;
  }

  return typeof getEventUrl === 'function'
    ? getEventUrl(termin.slug)
    : `/kalender/${termin.slug}/`;

}

function renderMemberTerminRecapMeta(
  termin
) {

  if (!memberTerminAllowsRecapAction(termin)) {
    return {
      statusHtml: '',
      actionHtml: ''
    };
  }

  const recap =
    getMemberTerminRecapRow(termin);

  const editUrl =
    memberTerminRecapEditUrl(termin.id);

  if (!recap) {

    return {
      statusHtml: `
<span class="member-content-status member-content-status--recap-pending">
  Rückblick fehlt
</span>
      `.trim(),
      actionHtml: `
<a
  class="member-content-item-edit"
  href="${editUrl}">

  Rückblick schreiben

</a>
      `.trim()
    };

  }

  if (recap.status === 'draft') {

    return {
      statusHtml: `
<span class="member-content-status member-content-status--pending">
  Rückblick in Bearbeitung
</span>
      `.trim(),
      actionHtml: `
<a
  class="member-content-item-edit"
  href="${editUrl}">

  Rückblick bearbeiten

</a>
      `.trim()
    };

  }

  if (recap.status === 'published') {

    const eventUrl =
      memberTerminEventUrl(termin);

    return {
      statusHtml: `
<span class="member-content-status member-content-status--approved">
  Rückblick veröffentlicht
</span>
      `.trim(),
      actionHtml:
        eventUrl
          ? `
<a
  class="member-content-item-edit"
  href="${eventUrl}">

  Ansehen

</a>
          `.trim()
          : ''
    };

  }

  return {
    statusHtml: '',
    actionHtml: ''
  };

}
