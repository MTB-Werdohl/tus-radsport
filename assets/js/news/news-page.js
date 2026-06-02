async function loadNews() {

  try {

    if (
      typeof waitForAuthSession === 'function'
    ) {

      const session =
        await waitForAuthSession();

      if (
        session
        && typeof validateMemberSession === 'function'
      ) {

        await validateMemberSession(
          session,
          { strict: false }
        );

      }

    }

    const data =
      await fetchNewsList();

    renderNewsCards(data);

  } catch (error) {

    console.error('News Fehler:', error);

  }

}

document.addEventListener(
  'DOMContentLoaded',
  loadNews
);
