---
layout: default
title: Termin bearbeiten
permalink: /termin-bearbeiten/
hide_title: true
hide_site_chrome: true
body_class: member-termin-editor-page site-chrome-hidden
load_events_css: true
load_feedback_css: true
load_member_content_edit_css: true
member_termin_editor: true
---

<div id="member-termin-editor">

  <p class="member-termin-editor-loading">
    Termin wird geladen …
  </p>

</div>

{% if page.member_termin_editor %}
<script src="/assets/js/core/dates.js"></script>
<script src="/assets/js/core/termin-dates.js"></script>
<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/feedback/feedback-types.js"></script>
<script src="/assets/js/feedback/feedback-service.js"></script>
<script src="/assets/js/core/content-creator.js"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/assets/js/core/image-compress.js"></script>
<script src="/assets/js/admin/media-storage-lib.js"></script>
<script src="/assets/js/admin/media-picker.js"></script>
<script src="/assets/js/member/member-edit-utils.js"></script>
<script src="/assets/js/admin/admin-utils.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/feedback-module-form.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/member/member-termin-edit.js?v={{ site.vorstand_js_version }}"></script>
<script>
document.addEventListener(
  'DOMContentLoaded',
  () => {
    void initMemberTerminEditPage();
  }
);
</script>
{% endif %}
