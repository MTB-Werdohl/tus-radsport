const supabase =
  window.supabaseClient;

const form = document.getElementById('gallery-form');

const imagesInput = document.getElementById('images');

const imagesContainer = document.getElementById('gallery-images');

const params = new URLSearchParams(window.location.search);

const galleryId = params.get('id');

let currentGallery = null;

async function loadGallery() {

  if (!galleryId) return;

  const { data, error } = await supabase
    .from(window.siteConfig.tables.galleries)
    .select('*')
    .eq('id', galleryId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  currentGallery = data;

  document.getElementById('title').value = data.title || '';
  document.getElementById('slug').value = data.slug || '';
  document.getElementById('event_date').value = data.event_date || '';
  document.getElementById('description').value = data.description || '';

  loadImages();
}

async function loadImages() {

  const { data, error } = await supabase
    .from(window.siteConfig.tables.galleryImages)
    .select('*')
    .eq('gallery_id', galleryId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  imagesContainer.innerHTML = '';

  data.forEach(image => {

    const div = document.createElement('div');

    div.className = 'gallery-image-item';

    div.innerHTML = `
      <img src="${image.image_path}" alt="" />

      <button data-id="${image.id}">
        Löschen
      </button>
    `;

    const button = div.querySelector('button');

    button.addEventListener('click', () => {
      deleteImage(image);
    });

    imagesContainer.appendChild(div);

  });

}

async function deleteImage(image) {

  const confirmed = confirm('Bild löschen?');

  if (!confirmed) return;

  const path = extractStoragePath(image.image_path);

  await supabase.storage
    .from(window.siteConfig.storage.media)
    .remove([path]);

  await supabase
    .from(window.siteConfig.tables.galleryImages)
    .delete()
    .eq('id', image.id);

  loadImages();
}

function extractStoragePath(url) {

  const split = url.split('/storage/v1/object/public/media/');

  return split[1];
}

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const title = document.getElementById('title').value;
  const slug = document.getElementById('slug').value;
  const eventDate = document.getElementById('event_date').value;
  const description = document.getElementById('description').value;

  let savedGalleryId = galleryId;

  if (!galleryId) {

    const { data, error } = await supabase
      .from(window.siteConfig.tables.galleries)
      .insert([
        {
          title,
          slug,
          event_date: eventDate,
          description
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    savedGalleryId = data.id;

  } else {

    const { error } = await supabase
      .from(window.siteConfig.tables.galleries)
      .update({
        title,
        slug,
        event_date: eventDate,
        description
      })
      .eq('id', galleryId);

    if (error) {
      console.error(error);
      return;
    }
  }

  const files = imagesInput.files;

  if (files.length > 0) {

    const year = new Date().getFullYear();

    for (let i = 0; i < files.length; i++) {

      const file = files[i];

      const extension = file.name.split('.').pop();

      const filename = `${Date.now()}-${i}.${extension}`;

      const storagePath =
        `galleries/${year}/${slug}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from(window.siteConfig.storage.media)
        .upload(storagePath, file);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(window.siteConfig.storage.media)
        .getPublicUrl(storagePath);

      await supabase
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

  alert('Galerie gespeichert');

  window.location.href =
    `/admin/galerie_edit.html?id=${savedGalleryId}`;
});

loadGallery();