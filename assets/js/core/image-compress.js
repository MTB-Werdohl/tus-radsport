function loadImageFromFileForCompress(
  file
) {

  return new Promise((resolve, reject) => {

    const url =
      URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {

      URL.revokeObjectURL(url);
      resolve(image);

    };

    image.onerror = () => {

      URL.revokeObjectURL(url);
      reject(
        new Error(
          'Bild konnte nicht gelesen werden.'
        )
      );

    };

    image.src = url;

  });

}

function buildWebpFileName(
  originalName
) {

  const raw =
    String(originalName || 'bild')
      .trim();

  const dotIndex =
    raw.lastIndexOf('.');

  const baseName =
    dotIndex > 0
      ? raw.slice(0, dotIndex)
      : raw;

  return `${baseName}.webp`;

}

function shouldCompressImageFile(
  file
) {

  if (!file || !file.type) {
    return false;
  }

  if (!file.type.startsWith('image/')) {
    return false;
  }

  const skipTypes = [
    'image/svg+xml',
    'image/gif'
  ];

  return !skipTypes.includes(file.type);

}

async function compressImageFileToWebp(
  file,
  options
) {

  if (!shouldCompressImageFile(file)) {
    return file;
  }

  const maxDimension =
    options?.maxDimension ?? 1920;

  const quality =
    options?.quality ?? 0.85;

  const image =
    await loadImageFromFileForCompress(file);

  const sourceWidth =
    image.naturalWidth
    || image.width;

  const sourceHeight =
    image.naturalHeight
    || image.height;

  if (
    !sourceWidth
    || !sourceHeight
  ) {
    throw new Error('Ungültige Bildgröße.');
  }

  const scale =
    Math.min(
      1,
      maxDimension / sourceWidth,
      maxDimension / sourceHeight
    );

  const targetWidth =
    Math.max(
      1,
      Math.round(sourceWidth * scale)
    );

  const targetHeight =
    Math.max(
      1,
      Math.round(sourceHeight * scale)
    );

  const canvas =
    document.createElement('canvas');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context =
    canvas.getContext('2d');

  if (!context) {
    throw new Error(
      'Bildverarbeitung nicht verfügbar.'
    );
  }

  context.drawImage(
    image,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const blob =
    await new Promise((resolve, reject) => {

      canvas.toBlob(
        (result) => {

          if (!result) {
            reject(
              new Error(
                'Bild konnte nicht konvertiert werden.'
              )
            );
            return;
          }

          resolve(result);

        },
        'image/webp',
        quality
      );

    });

  const fileName =
    buildWebpFileName(file.name);

  if (
    typeof File !== 'undefined'
  ) {

    return new File(
      [blob],
      fileName,
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );

  }

  blob.name = fileName;
  return blob;

}

window.compressImageFileToWebp =
  compressImageFileToWebp;

window.shouldCompressImageFile =
  shouldCompressImageFile;
