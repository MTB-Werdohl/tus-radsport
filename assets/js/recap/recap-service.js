function getRecapTables() {

  return {
    recaps:
      window.siteConfig?.tables?.terminRecaps
      || 'termin_recaps',
    images:
      window.siteConfig?.tables?.terminRecapImages
      || 'termin_recap_images'
  };

}

function sortRecapImages(images) {

  return [...(images || [])]
    .sort((a, b) => {

      const orderDiff =
        (a.sort_order || 0)
        - (b.sort_order || 0);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return (a.id || 0) - (b.id || 0);

    });

}

function resolveRecapImageUrl(image) {

  if (!image?.storage_path) {
    return null;
  }

  return typeof resolveMediaPublicUrl === 'function'
    ? resolveMediaPublicUrl(image.storage_path)
    : null;

}

async function loadRecapByTerminId(
  terminId
) {

  if (!terminId) {
    return null;
  }

  const tables =
    getRecapTables();

  const { data, error } =
    await window.supabaseClient
      .from(tables.recaps)
      .select(`
        *,
        termin_recap_images (
          id,
          recap_id,
          storage_path,
          sort_order,
          created_at
        )
      `)
      .eq('termin_id', terminId)
      .maybeSingle();

  if (error) {

    console.error(error);

    return null;

  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    images:
      sortRecapImages(
        data.termin_recap_images
      )
  };

}

async function loadPublishedRecapByTerminId(
  terminId
) {

  const recap =
    await loadRecapByTerminId(
      terminId
    );

  if (
    !recap
    || recap.status !== 'published'
  ) {
    return null;
  }

  return recap;

}

async function saveRecapDraft(recap) {

  const tables =
    getRecapTables();

  const payload = {
    termin_id: recap.termin_id,
    headline:
      recap.headline
        ? String(recap.headline).trim()
        : null,
    body:
      recap.body != null
        ? String(recap.body)
        : '',
    status: 'draft'
  };

  if (recap.id) {

    const { data, error } =
      await window.supabaseClient
        .from(tables.recaps)
        .update(payload)
        .eq('id', recap.id)
        .select('*')
        .single();

    return { data, error };

  }

  const { data, error } =
    await window.supabaseClient
      .from(tables.recaps)
      .upsert(
        payload,
        { onConflict: 'termin_id' }
      )
      .select('*')
      .single();

  return { data, error };

}

async function listRecapImages(recapId) {

  if (!recapId) {
    return [];
  }

  const tables =
    getRecapTables();

  const { data, error } =
    await window.supabaseClient
      .from(tables.images)
      .select('*')
      .eq('recap_id', recapId)
      .order('sort_order', {
        ascending: true
      })
      .order('id', {
        ascending: true
      });

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];

}

async function addRecapImage(
  recapId,
  storagePath,
  sortOrder
) {

  const tables =
    getRecapTables();

  const { data, error } =
    await window.supabaseClient
      .from(tables.images)
      .insert([{
        recap_id: recapId,
        storage_path: storagePath,
        sort_order:
          Number.isFinite(sortOrder)
            ? sortOrder
            : 0
      }])
      .select('*')
      .single();

  return { data, error };

}

async function deleteRecapImage(imageId) {

  const tables =
    getRecapTables();

  const { data: image, error: loadError } =
    await window.supabaseClient
      .from(tables.images)
      .select('id, storage_path')
      .eq('id', imageId)
      .maybeSingle();

  if (loadError) {
    return { error: loadError };
  }

  if (!image) {
    return {
      error: new Error(
        'Bild nicht gefunden.'
      )
    };
  }

  const bucket =
    window.siteConfig?.storage?.media
    || 'media';

  if (image.storage_path) {

    const { error: storageError } =
      await window.supabaseClient
        .storage
        .from(bucket)
        .remove([image.storage_path]);

    if (storageError) {

      console.warn(
        'Recap-Storage-Löschung:',
        storageError.message
      );

    }

  }

  const { error } =
    await window.supabaseClient
      .from(tables.images)
      .delete()
      .eq('id', imageId);

  return { error };

}

async function uploadRecapImage(
  terminId,
  file
) {

  if (!file) {

    return {
      error: new Error('Keine Datei'),
      storagePath: null,
      publicUrl: null
    };

  }

  let uploadFile = file;

  if (
    typeof compressImageFileToWebp
      === 'function'
  ) {

    uploadFile =
      await compressImageFileToWebp(file);

  }

  const storagePath =
    `recaps/${terminId}/${Date.now()}.webp`;

  const bucket =
    window.siteConfig?.storage?.media
    || 'media';

  const uploadOptions =
    uploadFile.type === 'image/webp'
      ? {
        contentType: 'image/webp',
        cacheControl: '3600'
      }
      : undefined;

  const { error } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .upload(
        storagePath,
        uploadFile,
        uploadOptions
      );

  if (error) {

    return {
      error,
      storagePath: null,
      publicUrl: null
    };

  }

  const publicUrl =
    typeof resolveMediaPublicUrl === 'function'
      ? resolveMediaPublicUrl(storagePath)
      : null;

  return {
    error: null,
    storagePath,
    publicUrl
  };

}

async function publishRecap(recapId) {

  const tables =
    getRecapTables();

  const { data: recap, error: loadError } =
    await window.supabaseClient
      .from(tables.recaps)
      .select('*')
      .eq('id', recapId)
      .single();

  if (loadError) {
    return { data: null, error: loadError };
  }

  const images =
    await listRecapImages(recapId);

  const validation =
    validateRecapForPublish(
      recap,
      images.length
    );

  if (!validation.valid) {

    return {
      data: null,
      error: new Error(
        formatRecapValidationErrors(
          validation
        )
      )
    };

  }

  const { data, error } =
    await window.supabaseClient
      .from(tables.recaps)
      .update({ status: 'published' })
      .eq('id', recapId)
      .select('*')
      .single();

  return { data, error };

}

async function unpublishRecap(recapId) {

  const tables =
    getRecapTables();

  const { data, error } =
    await window.supabaseClient
      .from(tables.recaps)
      .update({ status: 'draft' })
      .eq('id', recapId)
      .select('*')
      .single();

  return { data, error };

}

async function deleteRecapDraft(recapId) {

  const tables =
    getRecapTables();

  const images =
    await listRecapImages(recapId);

  for (const image of images) {

    await deleteRecapImage(image.id);

  }

  const { error } =
    await window.supabaseClient
      .from(tables.recaps)
      .delete()
      .eq('id', recapId);

  return { error };

}

async function fetchRecapDraftsForAdmin() {

  const tables =
    getRecapTables();

  const termineTable =
    window.siteConfig.tables.termine;

  const { data, error } =
    await window.supabaseClient
      .from(tables.recaps)
      .select(`
        id,
        termin_id,
        headline,
        status,
        updated_at,
        created_at,
        created_by,
        ${termineTable} (
          id,
          title,
          slug,
          date
        )
      `)
      .eq('status', 'draft')
      .order('updated_at', {
        ascending: false,
        nullsFirst: false
      });

  if (error) {
    throw error;
  }

  return data || [];

}

async function fetchPublishedRecapsForErlebtes() {

  const tables =
    getRecapTables();

  const termineTable =
    window.siteConfig.tables.termine;

  const { data, error } =
    await window.supabaseClient
      .from(tables.recaps)
      .select(`
        id,
        headline,
        body,
        status,
        published_at,
        termin_recap_images (
          id,
          storage_path,
          sort_order
        ),
        ${termineTable}!inner (
          id,
          title,
          slug,
          date,
          endDate,
          location,
          image,
          image_storage_path,
          sichtbarkeit,
          recurring
        )
      `)
      .eq('status', 'published')
      .eq(
        `${termineTable}.sichtbarkeit`,
        window.siteConfig.visibility.public
      );

  if (error) {
    throw error;
  }

  return (data || []).map((row) => {

    const termin =
      row[termineTable]
      || row.Termine;

    return {
      ...row,
      termin,
      images:
        sortRecapImages(
          row.termin_recap_images
        )
    };

  });

}

function resolveRecapPreviewImage(
  recap,
  termin
) {

  const firstImage =
    recap?.images?.[0]
    || recap?.termin_recap_images?.[0];

  const recapUrl =
    resolveRecapImageUrl(firstImage);

  if (recapUrl) {
    return recapUrl;
  }

  if (
    typeof resolveTerminImage === 'function'
  ) {
    return resolveTerminImage(termin);
  }

  return termin?.image || null;

}

window.loadRecapByTerminId =
  loadRecapByTerminId;

window.loadPublishedRecapByTerminId =
  loadPublishedRecapByTerminId;

window.saveRecapDraft =
  saveRecapDraft;

window.listRecapImages =
  listRecapImages;

window.addRecapImage =
  addRecapImage;

window.deleteRecapImage =
  deleteRecapImage;

window.uploadRecapImage =
  uploadRecapImage;

window.publishRecap =
  publishRecap;

window.unpublishRecap =
  unpublishRecap;

window.deleteRecapDraft =
  deleteRecapDraft;

window.fetchRecapDraftsForAdmin =
  fetchRecapDraftsForAdmin;

window.fetchPublishedRecapsForErlebtes =
  fetchPublishedRecapsForErlebtes;

window.resolveRecapImageUrl =
  resolveRecapImageUrl;

window.resolveRecapPreviewImage =
  resolveRecapPreviewImage;
