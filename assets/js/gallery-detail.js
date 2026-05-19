import { supabase } from '/assets/js/calendar/config.js';

const params = new URLSearchParams(window.location.search);

const slug = params.get('slug');

const titleElement =
  document.getElementById('gallery-title');

const dateElement =
  document.getElementById('gallery-date');

const descriptionElement =
  document.getElementById('gallery-description');

const imagesContainer =
  document.getElementById('gallery-images');

async function loadGallery() {

  if (!slug) {

    titleElement.innerText =
      'Keine Galerie gefunden';

    return;
  }

  const { data: gallery, error } = await supabase
    .from('galleries')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !gallery) {

    console.error(error);

    titleElement.innerText =
      'Galerie nicht gefunden';

    return;
  }

  renderGalleryMeta(gallery);

  loadImages(gallery.id);
}

function renderGalleryMeta(gallery) {

  document.title =
    `${gallery.title} | Galerie`;

  titleElement.innerText =
    gallery.title;

  descriptionElement.innerText =
    gallery.description || '';

  dateElement.innerText =
    formatDate(gallery.event_date);
}

async function loadImages(galleryId) {

  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('gallery_id', galleryId)
    .order('sort_order', { ascending: true });

  if (error) {

    console.error(error);

    imagesContainer.innerHTML = `
      <p>Fehler beim Laden der Bilder.</p>
    `;

    return;
  }

  if (!data || data.length === 0) {

    imagesContainer.innerHTML = `
      <p>Keine Bilder vorhanden.</p>
    `;

    return;
  }

  imagesContainer.innerHTML = '';

  data.forEach(image => {

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

function formatDate(dateString) {

  if (!dateString) return '';

  const date = new Date(dateString);

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

loadGallery();