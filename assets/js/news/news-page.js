async function loadNews() {

  try {

    const data =
      await fetchPublishedNews();

    renderNewsCards(data);

  } catch (error) {

    console.error('News Fehler:', error);

  }

}

loadNews();
