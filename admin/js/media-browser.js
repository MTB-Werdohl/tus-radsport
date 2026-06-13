let mediaBrowserCurrentRoot =
  'shared';

let mediaBrowserCurrentPath =
  'shared';

let mediaBrowserCurrentFilter =
  'all';

let mediaBrowserSelectedFilePath =
  null;

async function copyTextToClipboard(
  value,
  successMessage
) {

  try {

    await navigator.clipboard.writeText(
      value
    );

    if (successMessage) {
      window.alert(successMessage);
    }

  } catch (error) {

    console.error(error);

    window.prompt(
      'Kopieren:',
      value
    );

  }

}

async function initMediaBrowser() {

  bindMediaBrowserUploadControl();
  bindMediaBrowserExplorerRoot(
    document.getElementById(
      'media-browser-explorer'
    )
  );

  renderMediaBrowserDetail();

  await ensureMediaStorageReferenceIndex();
  await renderMediaBrowserTree();

}
