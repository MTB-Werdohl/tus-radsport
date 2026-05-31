async function loadNews() {

  try {

    const member =
      await ensureContentViewerMember();

    const data =
      await fetchNewsForViewer(member);

    renderNewsCards(data);

  } catch (error) {

    console.error('News Fehler:', error);

  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadNews
);
