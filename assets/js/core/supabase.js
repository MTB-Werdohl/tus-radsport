window.supabaseClient =
  supabase.createClient(

    window.siteConfig.supabaseUrl,

    window.siteConfig.supabaseAnonKey

  );
