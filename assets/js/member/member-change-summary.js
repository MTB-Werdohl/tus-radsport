let memberChangeSummaryInitialized =
  false;

let memberChangeSummaryPending =
  false;

function escapeChangeSummaryHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function formatChangeSummaryCountLine(
  count,
  singular,
  plural
) {

  const safeCount =
    Math.max(
      0,
      Number(count) || 0
    );

  if (safeCount <= 0) {
    return '';
  }

  const label =
    safeCount === 1
      ? singular
      : plural;

  return `
<li>
  ${safeCount}
  ${escapeChangeSummaryHtml(label)}
</li>
  `.trim();

}

function shouldIncludeAktivitaetenInChangeSummary() {

  return (
    typeof isAktivitaetenPublicEnabled === 'function'
    && isAktivitaetenPublicEnabled()
  );

}

function hasMemberChangeSummaryItems(
  summary
) {

  if (!summary) {
    return false;
  }

  const includeAktivitaeten =
    shouldIncludeAktivitaetenInChangeSummary();

  return (
    (
      includeAktivitaeten
      && (
        (Number(summary.activities_own) || 0) > 0
        || (Number(summary.activities_feed) || 0) > 0
      )
    )
    || (Number(summary.termine) || 0) > 0
    || (Number(summary.news) || 0) > 0
    || (Number(summary.abstimmungen) || 0) > 0
  );

}

function buildMemberChangeSummaryLines(
  summary
) {

  const lines = [];

  if (shouldIncludeAktivitaetenInChangeSummary()) {

    const ownLine =
      formatChangeSummaryCountLine(
        summary.activities_own,
        'neue Aktivität von dir',
        'neue Aktivitäten von dir'
      );

    if (ownLine) {
      lines.push(ownLine);
    }

    const feedLine =
      formatChangeSummaryCountLine(
        summary.activities_feed,
        'neue Aktivität im Verein',
        'neue Aktivitäten im Verein'
      );

    if (feedLine) {
      lines.push(feedLine);
    }

  }

  const termineLine =
    formatChangeSummaryCountLine(
      summary.termine,
      'neuer Termin',
      'neue Termine'
    );

  if (termineLine) {
    lines.push(termineLine);
  }

  const newsLine =
    formatChangeSummaryCountLine(
      summary.news,
      'neues Internes',
      'neues Internes'
    );

  if (newsLine) {
    lines.push(newsLine);
  }

  const abstimmungenLine =
    formatChangeSummaryCountLine(
      summary.abstimmungen,
      'neue Abstimmung',
      'neue Abstimmungen'
    );

  if (abstimmungenLine) {
    lines.push(abstimmungenLine);
  }

  return lines;

}

async function fetchMemberChangeSummary() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'get_member_change_summary'
    );

  if (error) {
    throw error;
  }

  return data || {};

}

async function touchMemberChangeSummarySeen() {

  const { data, error } =
    await window.supabaseClient.rpc(
      'touch_member_change_summary_seen'
    );

  if (error) {
    throw error;
  }

  return data;

}

async function dismissMemberChangeSummary() {

  try {
    await touchMemberChangeSummarySeen();
  } catch (error) {
    console.error(error);
  }

}

function waitForDocumentReady() {

  if (
    document.readyState === 'complete'
    || document.readyState === 'interactive'
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {

    document.addEventListener(
      'DOMContentLoaded',
      resolve,
      { once: true }
    );

  });

}

function waitForSiteContentInit() {

  if (window.__siteContentInitComplete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {

    window.addEventListener(
      'site-content-init-complete',
      resolve,
      { once: true }
    );

    setTimeout(resolve, 12000);

  });

}

function waitForSiteOverlaySequence() {

  return new Promise((resolve) => {

    const dialog =
      document.getElementById(
        'site-content-overlay'
      );

    if (
      !dialog
      || typeof dialog.open !== 'boolean'
      || !dialog.open
    ) {
      resolve();
      return;
    }

    const finish = () => {
      resolve();
    };

    dialog.addEventListener(
      'close',
      finish,
      { once: true }
    );

    window.addEventListener(
      'site-overlay-dismissed',
      finish,
      { once: true }
    );

  });

}

function shouldSkipMemberChangeSummary() {

  return false;

}

async function runMemberChangeSummaryFlow(
  member
) {

  if (
    !member?.id
    || typeof isClubMember !== 'function'
    || !isClubMember(member)
  ) {

    if (typeof hidePushWidget === 'function') {
      hidePushWidget();
    }

    return;

  }

  if (
    typeof showPushWidgetForClubMember
      === 'function'
  ) {
    showPushWidgetForClubMember({
      collapsed: true
    });
  }

  await waitForDocumentReady();
  await waitForSiteContentInit();
  await waitForSiteOverlaySequence();

  let summary;

  try {
    summary =
      await fetchMemberChangeSummary();
  } catch (error) {
    console.error(error);

    if (
      typeof showPushWidgetForClubMember
        === 'function'
    ) {
      showPushWidgetForClubMember({
        collapsed: true
      });

      if (
        typeof refreshPushWidgetContent
          === 'function'
      ) {
        refreshPushWidgetContent([]);
      }
    }

    return;

  }

  const lines =
    buildMemberChangeSummaryLines(
      summary
    );

  const hasItems =
    hasMemberChangeSummaryItems(
      summary
    );

  if (
    typeof showPushWidgetChangeSummary
      === 'function'
  ) {

    if (hasItems) {

      showPushWidgetChangeSummary(
        lines,
        {
          open: true,
          unread: true
        }
      );

    } else {

      showPushWidgetChangeSummary(
        [],
        {
          open: false,
          unread: false
        }
      );

    }

  }

}

function queueMemberChangeSummary(
  member
) {

  if (
    memberChangeSummaryInitialized
    || memberChangeSummaryPending
    || !member?.id
  ) {
    return;
  }

  memberChangeSummaryPending = true;

  runMemberChangeSummaryFlow(member)
    .finally(() => {

      memberChangeSummaryInitialized = true;
      memberChangeSummaryPending = false;

    });

}

window.addEventListener(
  'member-session-ready',
  () => {

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    queueMemberChangeSummary(member);

  }
);

document.addEventListener(
  'site-overlay-dismissed',
  () => {

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    if (!member?.id) {
      return;
    }

    const widget =
      document.getElementById('push-widget');

    if (
      memberChangeSummaryInitialized
      && widget
      && !widget.classList.contains('hidden')
    ) {
      return;
    }

    memberChangeSummaryInitialized = false;
    memberChangeSummaryPending = false;

    queueMemberChangeSummary(member);

  }
);

window.addEventListener(
  'load',
  () => {

    if (
      memberChangeSummaryInitialized
      || memberChangeSummaryPending
    ) {
      return;
    }

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    queueMemberChangeSummary(member);

  }
);
