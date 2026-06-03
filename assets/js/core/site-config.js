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
    pushMessages: 'PushMessages',
    siteState: 'site_state',
    members: 'members',
    feedbackModules: 'feedback_modules',
    feedbackAnswers: 'feedback_answers'
  },

  feedback: {
    entityTypes: {
      event: 'event',
      news: 'news'
    },
    types: {
      yesMaybe: 'yes_maybe',
      yesNoComment: 'yes_no_comment',
      poll: 'poll'
    },
    answers: {
      yes: 'yes',
      maybe: 'maybe',
      no: 'no'
    }
  },

  storage: {
    media: 'media'
  },

  functions: {
    savePushSubscription: 'save-push-subscription',
    deletePushSubscription: 'delete-push-subscription',
    sendPush: 'send-push',
    anonymizeMemberAccount: 'anonymize-member-account'
  },

  siteStateKeys: {
    lastPush: 'last_push'
  },

  visibility: {
    public: 'public',
    members: 'members',
    draft: 'draft'
  },

  adminJsVersion: '20260531'

};

window.getFunctionUrl = function (name) {

  return `${window.siteConfig.functionsUrl}/${window.siteConfig.functions[name]}`;

};

window.getEventUrl = function (slug) {

  if (!slug) {
    return '/kalender/';
  }

  return `/kalender/${encodeURIComponent(slug)}/`;

};

window.getNewsUrl = function (slug) {

  if (!slug) {
    return '/news/';
  }

  return `/news/${encodeURIComponent(slug)}/`;

};
