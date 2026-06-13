let mediaBrowserCurrentRoot =
  'shared';

let mediaBrowserCurrentPath =
  'shared';

let mediaBrowserCurrentFilter =
  'all';

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

  document
    .getElementById('media-browser-filter')
    ?.addEventListener('change', async (event) => {

      mediaBrowserCurrentFilter =
        event.target.value || 'all';

      invalidateMediaBrowserTreeCache();
      await renderMediaBrowserTree();

    });

  await renderMediaBrowserTree();

}
