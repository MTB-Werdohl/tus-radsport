---
layout: default
title: Mein Profil
permalink: /profil/
hide_title: true
member_profile: true
load_aktivitaeten_css: true
load_calendar_css: true
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
<script src="/assets/js/aktivitaeten/aktivitaeten-service.js"></script>
<script src="/assets/js/aktivitaeten/aktivitaeten-card-render.js"></script>
<script src="/assets/js/member/member-votes.js"></script>
<script src="/assets/js/member/member-render.js"></script>
<script src="/assets/js/member/member-account.js"></script>
<script src="/assets/js/member/member-page.js"></script>
{% endif %}
