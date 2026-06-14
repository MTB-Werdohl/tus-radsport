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

function hasMemberChangeSummaryItems(
  summary
) {

  if (!summary) {
    return false;
  }

  return (
    (Number(summary.activities_own) || 0) > 0
    || (Number(summary.activities_feed) || 0) > 0
    || (Number(summary.termine) || 0) > 0
    || (Number(summary.news) || 0) > 0
    || (Number(summary.abstimmungen) || 0) > 0
  );

}

function buildMemberChangeSummaryLines(
  summary
) {

  const lines = [];

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

    setTimeout(resolve, 4000);

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

  const path =
    window.location.pathname || '';

  return (
    path.startsWith('/admin')
    || path.includes('/admin/')
  );

}

function removeMemberChangeSummaryDialog() {

  document
    .getElementById(
      'member-change-summary-dialog'
    )
    ?.remove();

}

async function dismissMemberChangeSummaryDialog() {

  removeMemberChangeSummaryDialog();

  try {
    await touchMemberChangeSummarySeen();
  } catch (error) {
    console.error(error);
  }

}

function renderMemberChangeSummaryDialog(
  summary
) {

  removeMemberChangeSummaryDialog();

  const lines =
    buildMemberChangeSummaryLines(
      summary
    );

  if (!lines.length) {
    return;
  }

  const dialog =
    document.createElement('dialog');

  dialog.id =
    'member-change-summary-dialog';

  dialog.className =
    'site-content-overlay member-change-summary-dialog';

  dialog.innerHTML = `
<form
  method="dialog"
  class="site-content-overlay__form member-change-summary-dialog__form">

  <button
    type="button"
    class="member-change-summary-dialog__close-icon"
    aria-label="Schließen"
    data-change-summary-dismiss>

    ✕

  </button>

  <div class="site-content-overlay__inner">

    <h2 class="site-content-overlay__title">
      🚴 Seit deinem letzten Besuch
    </h2>

    <ul class="member-change-summary-dialog__list">
      ${lines.join('')}
    </ul>

    <div class="member-change-summary-dialog__actions">

      <button
        type="button"
        class="site-content-overlay__close member-change-summary-dialog__primary"
        data-change-summary-dismiss>

        👍 Super

      </button>

    </div>

  </div>

</form>
  `.trim();

  document.body.appendChild(dialog);

  dialog
    .querySelectorAll(
      '[data-change-summary-dismiss]'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        async (event) => {

          event.preventDefault();

          await dismissMemberChangeSummaryDialog();

          if (
            typeof dialog.close === 'function'
          ) {
            dialog.close();
          }

          dialog.remove();

        }
      );

    });

  if (
    typeof dialog.showModal === 'function'
  ) {
    dialog.showModal();
  }

}

async function runMemberChangeSummaryFlow(
  member
) {

  if (
    !member?.id
    || shouldSkipMemberChangeSummary()
    || typeof isClubMember !== 'function'
    || !isClubMember(member)
  ) {
    return;
  }

  await waitForDocumentReady();
  await waitForSiteContentInit();
  await waitForSiteOverlaySequence();

  if (
    !member.last_change_summary_seen_at
  ) {

    try {
      await touchMemberChangeSummarySeen();
    } catch (error) {
      console.error(error);
    }

    return;

  }

  let summary;

  try {
    summary =
      await fetchMemberChangeSummary();
  } catch (error) {
    console.error(error);
    return;
  }

  if (
    !hasMemberChangeSummaryItems(
      summary
    )
  ) {
    return;
  }

  renderMemberChangeSummaryDialog(
    summary
  );

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

    if (
      memberChangeSummaryInitialized
      || !member?.id
    ) {
      return;
    }

    queueMemberChangeSummary(member);

  }
);
