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

  <div class="member-content-edit-form member-admin-form">

    <label class="admin-field">
      Titel
      <input id="title"
             placeholder="Titel">
    </label>

    <div class="row">

      <label class="admin-field">
        Datum
        <input id="date"
               type="date">
      </label>

      <label class="admin-field">
        Uhrzeit
        <input id="startTime"
               type="time">
      </label>

    </div>

    <label class="admin-field">
      Ort
      <input id="location"
             placeholder="Ort">
    </label>

    <label class="admin-field">
      Bild
      <input id="imageStoragePathPick"
             type="hidden">
      <div class="admin-media-field-actions">
        <button id="pick-image-btn"
                type="button"
                class="secondary-button">
          Aus Mediathek
        </button>
      </div>
      <div id="currentImage"></div>
    </label>

    <label class="admin-field">
      GPX
      <input id="gpxStoragePathPick"
             type="hidden">
      <div class="admin-media-field-actions">
        <button id="pick-gpx-btn"
                type="button"
                class="secondary-button">
          Aus Mediathek
        </button>
      </div>
      <div id="currentGpx"></div>
    </label>

    <label class="admin-field">
      Komoot Link
      <input id="komoot"
             placeholder="Komoot Link">
    </label>

    <label class="admin-field">
      Inhalt
      <textarea id="content"
                rows="8"
                placeholder="Inhalt"></textarea>
    </label>

    <button id="save-event"
            type="button"
            class="admin-form-save">

      Speichern

    </button>

  </div>

</section>

<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/admin/js/admin-utils.js"></script>
<script src="/admin/js/media-storage-lib.js"></script>
<script src="/admin/js/media-picker.js"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/member/member-termin-edit.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  void initMemberTerminEditPage();
});
</script>
