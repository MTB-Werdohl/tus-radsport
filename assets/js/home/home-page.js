const HOME_TERMINE_LIMIT = 3;

async function loadHomeTermineTeaser() {

  const start =
    new Date();

  start.setHours(0, 0, 0, 0);

  const end =
    new Date(start);

  end.setFullYear(
    end.getFullYear() + 1
  );

  await loadCards(
    start,
    end,
    {
      wrapperId:
        'home-termine-teaser',
      limit:
        HOME_TERMINE_LIMIT
    }
  );

}

async function loadHomeTeasers() {

  try {

    await loadHomeTermineTeaser();

  } catch (error) {

    console.error(
      'Home-Teaser Fehler:',
      error
    );

  }

}

async function initHomePage() {

  if (typeof waitForAuthSession === 'function') {

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

  await loadHomeTeasers();

}

document.addEventListener(
  'DOMContentLoaded',
  initHomePage
);
