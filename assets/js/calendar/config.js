import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://eazizesytrnknbgrnggj.supabase.co';

const supabaseKey = 'sb_publishable_Bz-kKI-XUf9Y1sM3hWIfAw_4l8fIPQr';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export const currentYear = new Date().getFullYear();

export const validFrom = `${currentYear}-01-01`;

export const validTo = `${currentYear + 1}-12-31`;