---
layout: default
title: Internes bearbeiten
permalink: /intern-bearbeiten/
hide_title: true
hide_site_chrome: true
body_class: member-intern-editor-page site-chrome-hidden
load_events_css: true
load_member_content_edit_css: true
member_intern_editor: true
---

<div id="member-intern-editor">

  <p class="member-termin-editor-loading">
    Beitrag wird geladen …
  </p>

</div>

{% if page.member_intern_editor %}
<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/core/content-creator.js"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/assets/js/intern/member-intern-editor-nav.js"></script>
<script src="/assets/js/admin/media-storage-lib.js"></script>
<script src="/assets/js/admin/media-picker.js"></script>
<script src="/assets/js/member/member-edit-utils.js"></script>
<script src="/assets/js/admin/admin-utils.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/admin/admin-auth.js"></script>
<script src="/assets/js/admin/auth-guard.js"></script>
<script src="/assets/js/intern/news-loader.js"></script>
<script src="/assets/js/intern/member-intern-edit.js?v={{ site.vorstand_js_version }}"></script>
<script>
document.addEventListener(
  'DOMContentLoaded',
  () => {
    requireVorstandSession(
      initMemberInternEditPage
    );
  }
);
</script>
{% endif %}
