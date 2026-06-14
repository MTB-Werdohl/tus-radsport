---
layout: default
title: News einreichen
permalink: /profil/news_edit/
hide_title: true
load_member_content_edit_css: true
---

<section class="member-content-edit-section">

  <div class="member-content-edit-header">

    <div>

      <h1 id="form-title">
        News einreichen
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
             type="text"
             required
             placeholder="Titel">
    </label>

    <label class="member-edit-field">
      Kurztext
      <textarea id="excerpt"
                rows="3"
                placeholder="Kurztext"></textarea>
    </label>

    <label class="member-edit-field">
      Inhalt
      <textarea id="content"
                rows="8"
                placeholder="Inhalt"></textarea>
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

    <button id="save-news"
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
<script src="/assets/js/member/member-news-edit.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  void initMemberNewsEditPage();
});
</script>
