const supabaseUrl = 'https://eazizesytrnknbgrnggj.supabase.co';

const supabaseKey = 'sb_publishable_Bz-kKI-XUf9Y1sM3hWIfAw_4l8fIPQr';

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

const currentYear = new Date().getFullYear();

const validFrom = `${currentYear}-01-01`;

const validTo = `${currentYear + 1}-12-31`;