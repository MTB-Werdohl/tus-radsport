window.supabaseClient =
  supabase.createClient(

    window.siteConfig.supabaseUrl,

    window.siteConfig.supabaseAnonKey,

    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }

  );
