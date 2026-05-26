let termineCache = null;
let terminePromise = null;

async function fetchTermine() {

  if (termineCache) {
    return termineCache;
  }

  if (terminePromise) {
    return terminePromise;
  }

  terminePromise = (async () => {

    const { data, error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .select('*');

    if (error) {
      throw error;
    }

    termineCache = data || [];

    return termineCache;

  })();

  return terminePromise;

}
