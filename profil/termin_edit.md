---
layout: default
title: Termin einreichen
permalink: /profil/termin_edit/
hide_title: true
---

<script>
(function () {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const id =
    params.get('id');

  let url =
    '/profil/?tab=termin';

  if (id) {
    url += `&id=${encodeURIComponent(id)}`;
  }

  window.location.replace(url);

})();
</script>

<p>
  Weiterleitung zum Tab Termin …
  <a href="/profil/?tab=termin">Klicken, falls nichts passiert</a>.
</p>
