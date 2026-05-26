async function loadGalleries() {

  const galleryGrid =
    document.getElementById('gallery-grid');

  if (!galleryGrid) {
    return;
  }

  galleryGrid.innerHTML = `
    <p>Galerien werden geladen ...</p>
  `;

  try {

    const galleries =
      await fetchGalleries();

    renderGalleryGrid(galleries);

  } catch (error) {

    console.error(error);

    galleryGrid.innerHTML = `
      <p>Fehler beim Laden der Galerien.</p>
    `;

  }

}

loadGalleries();
