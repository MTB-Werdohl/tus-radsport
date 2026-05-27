---
layout: default
title: Mein Profil
permalink: /profil/
hide_title: true
member_profile: true
---

<section class="member-profile-section">

  <h1>Mein Profil</h1>

  <div id="member-profile">
    <p>Profil wird geladen …</p>
  </div>

</section>

{% if page.member_profile %}
<script src="/assets/js/core/dates.js"></script>
<script src="/assets/js/member/member-render.js"></script>
<script src="/assets/js/push/push-subscription-service.js"></script>
<script src="/assets/js/member/member-page.js"></script>
{% endif %}
