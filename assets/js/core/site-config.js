window.siteConfig = {

  supabaseUrl:
    'https://eazizesytrnknbgrnggj.supabase.co',

  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVheml6ZXN5dHJua25iZ3JuZ2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDM2NDcsImV4cCI6MjA5NDYxOTY0N30.fLTAzJvNurXru8maAZYkD5MjgArZ3l_KRnVrb_ftR-o',

  vapidPublicKey:
    'BK1Qb1ac1BWx72ahU6lCrqJ0SUW9gWoTiREwX3KPbRlgkjpyvsedbHwfuYUI0oEpq2A_FT2RNLPYgJ9Cu9bvJSI',

  siteUrl:
    'https://www.mtb-werdohl.de',

  functionsUrl:
    'https://eazizesytrnknbgrnggj.supabase.co/functions/v1',

  tables: {
    termine: 'Termine',
    news: 'News',
    galleries: 'galleries',
    galleryImages: 'gallery_images',
    pushSubscriptions: 'PushSubscriptions',
    siteState: 'site_state',
    members: 'members'
  },

  storage: {
    media: 'media'
  },

  functions: {
    savePushSubscription: 'save-push-subscription',
    deletePushSubscription: 'delete-push-subscription',
    sendPush: 'send-push'
  },

  siteStateKeys: {
    lastPush: 'last_push'
  },

  visibility: {
    public: 'public',
    members: 'members',
    draft: 'draft'
  }

};

window.getFunctionUrl = function (name) {

  return `${window.siteConfig.functionsUrl}/${window.siteConfig.functions[name]}`;

};
