window.siteConfig = {

  supabaseUrl:
    'https://eazizesytrnknbgrnggj.supabase.co',

  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVheml6ZXN5dHJua25iZ3JuZ2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDM2NDcsImV4cCI6MjA5NDYxOTY0N30.fLTAzJvNurXru8maAZYkD5MjgArZ3l_KRnVrb_ftR-o',

  siteUrl:
    'https://www.mtb-werdohl.de',

  functionsUrl:
    'https://eazizesytrnknbgrnggj.supabase.co/functions/v1',

  tables: {
    termine: 'Termine',
    terminRouteStages: 'termin_route_stages',
    news: 'News',
    siteState: 'site_state',
    members: 'members',
    boardDocuments: 'board_documents',
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
    sendAdminEmail: 'send-admin-email',
    anonymizeMemberAccount: 'anonymize-member-account'
  },

  siteStateKeys: {
    lastPush: 'last_push',
    siteBanner: 'site_banner',
    saisonMode: 'saison_mode',
    landingHints: 'landing_hints',
    siteOverlay: 'site_overlay'
  },

  visibility: {
    public: 'public',
    members: 'members',
    draft: 'draft'
  }

};

window.getFunctionUrl = function (name) {

  const slug =
    window.siteConfig.functions[name]
    || name;

  return `${window.siteConfig.functionsUrl}/${slug}`;

};

window.getEventUrl = function (slug) {

  if (!slug) {
    return '/kalender/';
  }

  return `/kalender/${encodeURIComponent(slug)}/`;

};

window.getInternUrl = function () {

  return '/intern/';

};

window.getInternNewsUrl = function (slug) {

  if (!slug) {
    return '/intern/';
  }

  return `/intern-detail.html?slug=${encodeURIComponent(slug)}`;

};
