const params =
  new URLSearchParams(
    window.location.search
  );

const editId =
  params.get('id');

async function loadNews() {

  if (!editId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'News bearbeiten';

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .eq('id', editId)
      .single();

  if (error) {

    console.error(error);

    return;

  }

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('slug').value =
    data.slug || '';

  document.getElementById('excerpt').value =
    data.excerpt || '';

  document.getElementById('content').value =
    data.content || '';

  document.getElementById('published').checked =
    data.published || false;

  if (data.image) {

    document
      .getElementById('currentImage')
      .innerHTML = `

        <p>Aktuelles Bild:</p>

        <img src="${data.image}"
             class="preview-image">

      `;

  }

}

async function saveNews() {

  const title =
    document
      .getElementById('title')
      .value;

  const slugInput =
    document
      .getElementById('slug')
      .value;

  const excerpt =
    document
      .getElementById('excerpt')
      .value;

  const content =
    document
      .getElementById('content')
      .value;

  const published =
    document
      .getElementById('published')
      .checked;

  const imageFile =
    document
      .getElementById('imageFile')
      .files[0];

  const slug =
    slugInput && slugInput !== ''
      ? slugInput
      : title
          .toLowerCase()
          .replaceAll(' ', '-')
          .replace(/[^\w-]+/g, '');

  let image = null;

  if (editId) {

    const { data } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .select('image')
        .eq('id', editId)
        .single();

    image =
      data?.image || null;

  }

  if (imageFile) {

    const imageName =
      Date.now() +
      '-' +
      imageFile.name;

    const { error } =
      await window.supabaseClient
        .storage
        .from(window.siteConfig.storage.media)
        .upload(
          imageName,
          imageFile
        );

    if (!error) {

      const {
        data: imageData
      } =
        window.supabaseClient
          .storage
          .from(window.siteConfig.storage.media)
          .getPublicUrl(imageName);

      image =
        imageData.publicUrl;

    }

  }

  const payload = {

    title,
    slug,
    excerpt,
    content,
    published,
    updated_at:
      new Date().toISOString()

  };

  if (image) {
    payload.image = image;
  }

  let error;

  if (editId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .update(payload)
        .eq('id', editId));

  } else {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.news)
        .insert([payload]));

  }

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  window.location.href =
    '/admin/news.html';

}

document
  .getElementById('save-news')
  ?.addEventListener('click', saveNews);
