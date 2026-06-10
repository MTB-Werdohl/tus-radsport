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
    news: 'News',
    galleries: 'galleries',
    galleryImages: 'gallery_images',
    siteState: 'site_state',
    members: 'members',
    boardDocuments: 'board_documents',
    feedbackModules: 'feedback_modules',
    feedbackAnswers: 'feedback_answers',
    activities: 'activities',
    memberStatsMonth: 'member_stats_month',
    memberStatsYear: 'member_stats_year',
    clubStatsMonth: 'club_stats_month',
    clubStatsYear: 'club_stats_year'
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
    media: 'media',
    avatars: 'avatars'
  },

  functions: {
    sendAdminEmail: 'send-admin-email',
    anonymizeMemberAccount: 'anonymize-member-account',
    stravaOAuthStart: 'strava-oauth-start',
    stravaOAuthCallback: 'strava-oauth-callback',
    stravaSync: 'strava-sync'
  },

  strava: {
    feedDays: 90
  },

  siteStateKeys: {
    lastPush: 'last_push'
  },

  visibility: {
    public: 'public',
    members: 'members',
    draft: 'draft'
  },

  adminJsVersion: '20260546'

};

window.getFunctionUrl = function (name) {

  const slug =
    window.siteConfig.functions[name]
    || name;

  return `${window.siteConfig.functionsUrl}/${slug}`;

};

window.getActivityUrl = function (id) {

  if (!id) {
    return '/aktivitaeten/';
  }

  return `/aktivitaeten/${encodeURIComponent(id)}/`;

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
