function renderGalleryGrid(galleries) {

  const galleryGrid =
    document.getElementById('gallery-grid');

  if (!galleryGrid) {
    return;
  }

  if (!galleries.length) {

    galleryGrid.innerHTML = `
      <p>Keine Galerien vorhanden.</p>
    `;

    return;

  }

  galleryGrid.innerHTML = '';

  galleries.forEach(gallery => {

    const imageCount =
      gallery.gallery_images?.[0]?.count || 0;

    const article =
      document.createElement('article');

    article.className = 'gallery-card';

    const coverImage =
      gallery.cover_image
        ? `
        <div class="gallery-image">
          <img
            src="${gallery.cover_image}"
            alt="${gallery.title || 'Galerie'}"
            loading="lazy"
          >
        </div>
      `
        : '';

    article.innerHTML = `
      <a
        href="/galerie-detail.html?slug=${gallery.slug}"
        class="gallery-link"
      >
        ${coverImage}
        <div class="gallery-content">
          <h2>${gallery.title || 'Ohne Titel'}</h2>
          <p class="gallery-date">
            ${formatDateLong(gallery.event_date)}
          </p>
          <p class="gallery-description">
            ${gallery.description || ''}
          </p>
          <span class="gallery-count">
            ${imageCount} Bilder
          </span>
        </div>
      </a>
    `;

    galleryGrid.appendChild(article);

  });

}

function renderGalleryMeta(gallery) {

  document.title = `${gallery.title} | Galerie`;

  document.getElementById('gallery-title').innerText =
    gallery.title;

  document.getElementById('gallery-description').innerText =
    gallery.description || '';

  document.getElementById('gallery-date').innerText =
    formatDateLong(gallery.event_date);

}

function renderGalleryImages(images) {

  const imagesContainer =
    document.getElementById('gallery-images');

  if (!images.length) {

    imagesContainer.innerHTML = `
      <p>Keine Bilder vorhanden.</p>
    `;

    return;

  }

  imagesContainer.innerHTML = '';

  images.forEach(image => {

    const figure = document.createElement('figure');

    figure.className = 'gallery-image';

    figure.innerHTML = `
      <a href="${image.image_path}" target="_blank">
        <img
          src="${image.image_path}"
          alt="${image.caption || ''}"
          loading="lazy"
        >
      </a>
      ${
        image.caption
          ? `<figcaption>${image.caption}</figcaption>`
          : ''
      }
    `;

    imagesContainer.appendChild(figure);

  });

}
