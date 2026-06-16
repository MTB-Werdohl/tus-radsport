---
layout: default
title: Mein Profil
permalink: /profil/
hide_title: true
member_profile: true
load_calendar_css: true
load_events_css: true
load_feedback_css: true
load_member_content_edit_css: true
---

<section class="member-profile-section">

  <h1>Mein Profil</h1>

  <div id="member-profile">
    <p>Profil wird geladen …</p>
  </div>

</section>

{% if page.member_profile %}
<script src="/assets/js/core/dates.js"></script>
<script src="/assets/js/core/termin-dates.js"></script>
<script src="/assets/js/calendar/card-dates.js"></script>
<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/feedback/feedback-types.js"></script>
<script src="/assets/js/feedback/feedback-service.js"></script>
<script src="/assets/js/member/member-votes.js"></script>
<script src="/assets/js/core/content-creator.js"></script>
<script src="/assets/js/core/content-drafts.js?v={{ site.admin_js_version }}"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/admin/js/media-storage-lib.js"></script>
<script src="/admin/js/media-picker.js"></script>
<script src="/assets/js/member/member-edit-utils.js"></script>
<script src="/admin/js/admin-utils.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/feedback-module-form.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/feedback-results.js?v={{ site.admin_js_version }}"></script>
<script src="/assets/js/feedback/feedback-admin-participants.js?v={{ site.admin_js_version }}"></script>
<script src="/assets/js/event/event-detail-vorstand.js"></script>
<script src="/assets/js/member/member-vorstand-drafts.js?v={{ site.admin_js_version }}"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/member/member-render.js"></script>
<script src="/assets/js/member/member-account.js"></script>
<script src="/assets/js/member/member-page.js"></script>
{% endif %}
