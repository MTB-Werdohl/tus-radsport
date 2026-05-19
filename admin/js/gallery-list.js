import { supabase } from '/assets/js/calendar/config.js';

const galleryList = document.getElementById('gallery-list');

async function loadGalleries() {

  galleryList.innerHTML = '<p>Lade...</p>';

  const { data, error } = await supabase
    .from('galleries')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    console.error(error);

    galleryList.innerHTML = `
      <p>Fehler beim Laden der Galerien.</p>
    `;

    return;
  }

  if (!data || data.length === 0) {
    galleryList.innerHTML = `
      <p>Keine Galerien vorhanden.</p>
    `;

    return;
  }

  galleryList.innerHTML = '';

  data.forEach(gallery => {

    const item = document.createElement('div');

    item.className = 'gallery-item';

    item.innerHTML = `
      <div class="gallery-item-content">

        <div class="gallery-cover">
          <img src="${gallery.cover_image || '/assets/img/placeholder.jpg'}" alt="${gallery.title}">
        </div>

        <div class="gallery-meta">
          <h3>${gallery.title}</h3>

          <p>${formatDate(gallery.event_date)}</p>

          <small>${gallery.slug}</small>
        </div>

      </div>

      <div class="gallery-actions">
        <a href="/admin/galerie_edit.html?id=${gallery.id}">
          Bearbeiten
        </a>
      </div>
    `;

    galleryList.appendChild(item);

  });

}

function formatDate(dateString) {

  if (!dateString) return '';

  const date = new Date(dateString);

  return date.toLocaleDateString('de-DE');
}

loadGalleries();