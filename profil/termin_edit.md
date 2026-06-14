---
layout: default
title: Termin einreichen
permalink: /profil/termin_edit/
hide_title: true
load_member_content_edit_css: true
---

<section class="member-content-edit-section">

  <div class="member-content-edit-header">

    <div>

      <h1 id="form-title">
        Termin einreichen
      </h1>

      <p>
        Wird als Entwurf an den Vorstand übermittelt.
      </p>

    </div>

    <a href="/profil/?tab=content"
       class="back-link member-logout-btn">

      ← Content

    </a>

  </div>

  <div class="member-content-edit-form">

    <label class="member-edit-field member-edit-field--required">
      Titel
      <input id="title"
             required
             placeholder="Titel">
    </label>

    <div class="member-edit-row">

      <label class="member-edit-field member-edit-field--required">
        Datum
        <input id="date"
               type="date"
               required>
      </label>

      <label class="member-edit-field member-edit-field--required">
        Uhrzeit
        <input id="startTime"
               type="time"
               required>
      </label>

    </div>

    <label class="member-edit-field member-edit-field--required">
      Ort
      <input id="location"
             required
             placeholder="Ort">
    </label>

    <label class="member-edit-field">
      Bild
      <input id="imageStoragePathPick"
             type="hidden">
      <div class="member-edit-media-actions">
        <button id="pick-image-btn"
                type="button"
                class="member-edit-btn member-edit-btn--secondary">
          Aus Mediathek
        </button>
      </div>
      <div id="currentImage"></div>
    </label>

    <label class="member-edit-field">
      GPX
      <input id="gpxStoragePathPick"
             type="hidden">
      <div class="member-edit-media-actions">
        <button id="pick-gpx-btn"
                type="button"
                class="member-edit-btn member-edit-btn--secondary">
          Aus Mediathek
        </button>
      </div>
      <div id="currentGpx"></div>
    </label>

    <label class="member-edit-field">
      Komoot Link
      <input id="komoot"
             placeholder="Komoot Link">
    </label>

    <label class="member-edit-field">
      Inhalt
      <textarea id="content"
                rows="8"
                placeholder="Inhalt"></textarea>
    </label>

    <button id="save-event"
            type="button"
            class="member-edit-save">

      Speichern

    </button>

  </div>

</section>

<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/assets/js/core/image-compress.js"></script>
<script src="/assets/js/member/member-edit-utils.js"></script>
<script src="/admin/js/media-storage-lib.js"></script>
<script src="/admin/js/media-picker.js"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/member/member-termin-edit.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  void initMemberTerminEditPage();
});
</script>
