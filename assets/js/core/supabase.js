window.supabaseClient =
  supabase.createClient(

    window.siteConfig.supabaseUrl,

    window.siteConfig.supabaseAnonKey,

    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }

  );
