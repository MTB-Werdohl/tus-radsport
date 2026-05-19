import { supabase } from '/assets/js/calendar/config.js';

const galleryGrid = document.getElementById('gallery-grid');

async function loadGalleries() {

  const { data, error } = await supabase
    .from('galleries')
    .select(`
      *,
      gallery_images(count)
    `)
    .order('event_date', { ascending: false });

  if (error) {
    console.error(error);

    galleryGrid.innerHTML = `
      <p>Fehler beim Laden der Galerien.</p>
    `;

    return;
  }

  if (!data || data.length === 0) {

    galleryGrid.innerHTML = `
      <p>Keine Galerien vorhanden.</p>
    `;

    return;
  }

  galleryGrid.innerHTML = '';

  data.forEach(gallery => {

    const imageCount =
      gallery.gallery_images?.[0]?.count || 0;

    const article = document.createElement('article');

    article.className = 'gallery-card';

    article.innerHTML = `
      <a href="/galerie-detail.html?slug=${gallery.slug}" class="gallery-link">

        <div class="gallery-image">

          <img
            src="${gallery.cover_image || '/assets/img/placeholder.jpg'}"
            alt="${gallery.title}"
            loading="lazy"
          >

        </div>

        <div class="gallery-content">

          <h2>${gallery.title}</h2>

          <p class="gallery-date">
            ${formatDate(gallery.event_date)}
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

function formatDate(dateString) {

  if (!dateString) return '';

  const date = new Date(dateString);

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

loadGalleries();