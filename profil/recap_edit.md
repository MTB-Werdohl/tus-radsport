---
layout: default
title: Rückblick schreiben
permalink: /profil/recap_edit/
hide_title: true
load_member_content_edit_css: true
---

<section class="member-content-edit-section">

  <div class="member-content-edit-header">

    <div>

      <h1 id="form-title">
        Rückblick schreiben
      </h1>

      <p id="form-subtitle">
        Entwurf wird vom Vorstand geprüft und veröffentlicht.
      </p>

    </div>

    <a href="/profil/?tab=content"
       class="back-link member-logout-btn">

      ← Content

    </a>

  </div>

  <div class="member-content-edit-form">

    <label class="member-edit-field">
      Überschrift (optional)
      <input id="recapHeadline"
             placeholder="Leer = Termintitel">
    </label>

    <label class="member-edit-field">
      Bericht (Markdown)
      <textarea id="recapBody"
                rows="10"
                placeholder="Wie war die Veranstaltung?"></textarea>
    </label>

    <label class="member-edit-field">
      Bilder
      <input id="recapImageFile"
             type="file"
             accept="image/*"
             multiple>
    </label>

    <div id="recapImagesList"
         class="member-recap-images"></div>

    <p id="recapStatus"
       class="member-recap-status"
       hidden
       aria-live="polite"></p>

    <button id="save-recap-draft"
            type="button"
            class="member-edit-save">

      Entwurf speichern

    </button>

  </div>

</section>

<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/core/termin-dates.js"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/assets/js/core/image-compress.js"></script>
<script src="/assets/js/recap/recap-validation.js"></script>
<script src="/assets/js/recap/recap-service.js"></script>
<script src="/assets/js/member/member-edit-utils.js"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/member/member-recap-edit.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  void initMemberRecapEditPage();
});
</script>
