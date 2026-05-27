const form =
  document.getElementById('gallery-form');

const imagesInput =
  document.getElementById('images');

const imagesContainer =
  document.getElementById('gallery-images');

const imagesSection =
  document.getElementById('gallery-images-section');

const params =
  new URLSearchParams(window.location.search);

const galleryId =
  params.get('id');

let currentGallery = null;

function formatDateInputValue(value) {

  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);

}

async function loadGallery() {

  if (!galleryId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'Galerie bearbeiten';

  imagesSection
    .classList.remove('hidden');

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleries)
      .select('*')
      .eq('id', galleryId)
      .single();

  if (error) {

    console.error(error);

    alert(
      'Galerie konnte nicht geladen werden: '
      + error.message
    );

    return;

  }

  currentGallery = data;

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('slug').value =
    data.slug || '';

  document.getElementById('event_date').value =
    formatDateInputValue(data.event_date);

  document.getElementById('description').value =
    data.description || '';

  loadImages();

}

async function loadImages() {

  if (!galleryId) {
    return;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleryImages)
      .select('*')
      .eq('gallery_id', galleryId)
      .order('sort_order', { ascending: true });

  if (error) {

    console.error(error);

    return;

  }

  imagesContainer.innerHTML = '';

  (data || []).forEach(image => {

    const div =
      document.createElement('div');

    div.className = 'gallery-image-item';

    div.innerHTML = `
      <img src="${safeMediaUrl(image.image_path)}" alt="">
      <button type="button" class="delete-button" data-id="${image.id}">
        Löschen
      </button>
    `;

    div.querySelector('button').addEventListener('click', () => {
      deleteImage(image);
    });

    imagesContainer.appendChild(div);

  });

}

async function deleteImage(image) {

  const confirmed =
    confirm('Bild löschen?');

  if (!confirmed) {
    return;
  }

  const path =
    extractStoragePath(image.image_path);

  if (path) {

    await window.supabaseClient
      .storage
      .from(window.siteConfig.storage.media)
      .remove([path]);

  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleryImages)
      .delete()
      .eq('id', image.id);

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  loadImages();

}

form.addEventListener('submit', async (event) => {

  event.preventDefault();

  const title =
    document.getElementById('title').value;

  const slug =
    document.getElementById('slug').value;

  const eventDate =
    document.getElementById('event_date').value;

  const description =
    document.getElementById('description').value;

  let savedGalleryId =
    galleryId;

  if (!galleryId) {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.galleries)
        .insert([
          {
            title,
            slug,
            event_date: eventDate || null,
            description
          }
        ])
        .select()
        .single();

    if (error) {

      console.error(error);

      alert(error.message);

      return;

    }

    savedGalleryId = data.id;

  } else {

    const { error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.galleries)
        .update({
          title,
          slug,
          event_date: eventDate || null,
          description
        })
        .eq('id', galleryId);

    if (error) {

      console.error(error);

      alert(error.message);

      return;

    }

  }

  const files =
    imagesInput.files;

  if (files.length > 0) {

    const year =
      new Date().getFullYear();

    for (let i = 0; i < files.length; i++) {

      const file =
        files[i];

      const extension =
        file.name.split('.').pop();

      const filename =
        `${Date.now()}-${i}.${extension}`;

      const storagePath =
        `galleries/${year}/${slug}/${filename}`;

      const { error: uploadError } =
        await window.supabaseClient
          .storage
          .from(window.siteConfig.storage.media)
          .upload(storagePath, file);

      if (uploadError) {

        console.error(uploadError);

        continue;

      }

      const { data: publicUrlData } =
        window.supabaseClient
          .storage
          .from(window.siteConfig.storage.media)
          .getPublicUrl(storagePath);

      await window.supabaseClient
        .from(window.siteConfig.tables.galleryImages)
        .insert([
          {
            gallery_id: savedGalleryId,
            image_path: publicUrlData.publicUrl,
            sort_order: i
          }
        ]);

    }

  }

  window.location.href =
    '/admin/galerie_edit.html?id=' + savedGalleryId;

});

async function initGalleryEdit() {

  await loadGallery();

}
