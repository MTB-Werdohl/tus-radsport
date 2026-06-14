async function loadNews() {

  try {

    const member =
      await ensureContentViewerMember();

    if (
      typeof canAccessNewsSection === 'function'
      && !canAccessNewsSection(member)
    ) {

      renderContentAccessDenied({
        containerId: 'news-cards',
        kind: 'news',
        visibility:
          window.siteConfig.visibility.members,
        member,
        backUrl: '/',
        backLabel: '← Zurück zur Startseite'
      });

      document.title =
        `${getNewsSectionLabel()} · MTB Werdohl`;

      return;

    }

    const data =
      await fetchNewsForViewer(member);

    renderNewsCards(data);

    document.title =
      `${getNewsSectionLabel()} · MTB Werdohl`;

  } catch (error) {

    console.error(
      `${getNewsSectionLabel()} Fehler:`,
      error
    );

  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadNews
);
