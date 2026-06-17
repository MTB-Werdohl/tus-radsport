---
layout: default
title: Mein Profil
permalink: /profil/
hide_title: true
member_profile: true
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
<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/feedback/feedback-types.js"></script>
<script src="/assets/js/feedback/feedback-service.js"></script>
<script src="/assets/js/core/content-creator.js"></script>
<script src="/assets/js/admin/admin-utils.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/feedback-results.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/feedback/feedback-admin-participants.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/site/site-content-state.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/site-content-admin.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/member-pdf.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/members-list.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/protocol-utils.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/protocols-list.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/member/member-email-log.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/member/member-email.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/member/member-verwaltung.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/member/member-render.js"></script>
<script src="/assets/js/member/member-account.js"></script>
<script src="/assets/js/member/member-page.js"></script>
{% endif %}
