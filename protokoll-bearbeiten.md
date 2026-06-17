---
layout: default
title: Protokoll bearbeiten
permalink: /protokoll-bearbeiten/
hide_title: true
load_member_content_edit_css: true
member_verwaltung_page: true
---

<section class="member-verwaltung-page">

  <div id="admin">

    <div class="page-header">

      <div>

        <h1 id="form-title">
          Neues Protokoll
        </h1>

        <p>
          Protokoll, Hauptversammlung oder Information anlegen oder bearbeiten
        </p>

      </div>

      <a href="/profil/?tab=verwaltung"
         class="back-button">

        ← Protokolle

      </a>

    </div>

    <div class="member-admin-form">

      <label>
        Sitzungsdatum
        <input id="meeting_date" type="date" required>
      </label>

      <label>
        Art
        <select id="meeting_label"></select>
      </label>

      <label>
        Bereich
        <select id="scope">
          <option value="abteilung">Abteilung (Radsport)</option>
          <option value="hauptverein">Hauptverein / Beirat</option>
        </select>
      </label>

      <label>
        Inhalt
        <input
          id="subject"
          type="text"
          maxlength="120"
          placeholder="z. B. Trikots"
        >
      </label>

      <label>
        Text (Markdown)
        <textarea id="content" rows="12"></textarea>
      </label>

      <section class="admin-protocol-files">

        <h2>Dateien</h2>

        <p class="admin-hint">
          Zu jedem Eintrag wird automatisch ein Ordner angelegt.
          Dateien kannst du per Drag-and-Drop strukturieren, löschen und ergänzen —
          Änderungen an Dateien werden sofort gespeichert.
          Der Button „Speichern“ gilt nur für Text und Metadaten.
        </p>

        <div id="protocol-folder-tree"></div>

        <p
          id="protocol-folder-pending"
          class="admin-hint admin-protocol-folder-pending"
        ></p>

        <label>
          Datei hinzufügen
          <input
            id="protocol-add-file"
            type="file"
            multiple
          >
        </label>

        <label>
          Ordner hochladen (wird ergänzt)
          <input
            id="protocol-add-folder"
            type="file"
            webkitdirectory
            multiple
          >
        </label>

      </section>

      <button id="save-protocol" type="button">
        Speichern
      </button>

    </div>

  </div>

</section>

{% if page.member_verwaltung_page %}
<script src="/admin/js/admin-utils.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/admin-auth.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/auth-guard.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-utils.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-manifest.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-folder-ui.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-edit.js?v={{ site.admin_js_version }}"></script>
<script>
requireAdminSession(initProtocolEdit);
</script>
{% endif %}
