---
layout: default
title: Protokoll
permalink: /protokoll/
hide_title: true
load_member_content_edit_css: true
member_verwaltung_page: true
---

<section class="member-verwaltung-page">

  <div id="admin">

    <div class="page-header">

      <div>

        <h1 id="protocol-view-title">
          Protokoll
        </h1>

        <p id="protocol-view-scope">
          —
        </p>

      </div>

      <div class="admin-draft-preview-actions">

        <a
          id="protocol-view-edit"
          href="/profil/?tab=verwaltung"
          class="back-button"
        >
          ✏ Bearbeiten
        </a>

        <a
          href="/profil/?tab=verwaltung"
          class="back-button"
        >
          ← Protokolle
        </a>

      </div>

    </div>

    <article class="admin-draft-preview admin-protocol-view">

      <div
        id="protocol-file-buttons"
        class="admin-protocol-file-buttons"
      ></div>

      <div
        id="protocol-view-body"
        class="admin-draft-preview__body"
      >
        <p class="admin-hint">
          Inhalt wird geladen …
        </p>
      </div>

    </article>

  </div>

</section>

{% if page.member_verwaltung_page %}
<script src="/assets/js/marked/marked.min.js"></script>
<script src="/admin/js/admin-utils.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/admin-auth.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/auth-guard.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-utils.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-folder-ui.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/protocol-view.js?v={{ site.admin_js_version }}"></script>
<script>
requireAdminSession(initProtocolView);
</script>
{% endif %}
