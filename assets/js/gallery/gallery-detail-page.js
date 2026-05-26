async function loadGalleryDetail() {

  const slug =
    new URLSearchParams(window.location.search)
      .get('slug');

  const titleElement =
    document.getElementById('gallery-title');

  if (!slug) {

    titleElement.innerText =
      'Keine Galerie gefunden';

    return;

  }

  const gallery =
    await fetchGalleryBySlug(slug);

  if (!gallery) {

    titleElement.innerText =
      'Galerie nicht gefunden';

    return;

  }

  renderGalleryMeta(gallery);

  try {

    const images =
      await fetchGalleryImages(gallery.id);

    renderGalleryImages(images);

  } catch (error) {

    console.error(error);

    document.getElementById('gallery-images').innerHTML = `
      <p>Fehler beim Laden der Bilder.</p>
    `;

  }

}

loadGalleryDetail();
