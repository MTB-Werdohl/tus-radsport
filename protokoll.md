---
layout: default
title: Protokoll
permalink: /protokoll/
hide_title: true
load_member_content_edit_css: true
load_vorstand_css: true
member_verwaltung_page: true
---

<section class="member-verwaltung-page">

  <div id="vorstand-page">

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
          href="/profil/?tab=verwaltung&section=protokolle"
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
<script src="/assets/js/admin/admin-utils.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/admin-auth.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/auth-guard.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/protocol-utils.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/protocol-folder-ui.js?v={{ site.vorstand_js_version }}"></script>
<script src="/assets/js/admin/protocol-view.js?v={{ site.vorstand_js_version }}"></script>
<script>
requireVorstandSession(initProtocolView);
</script>
{% endif %}
