---
layout: null
title: Termin bearbeiten
permalink: /termin-bearbeiten/
---

<!doctype html>

<html lang="de">

<head>

{% include member-termin-head.html %}

</head>

<body class="member-termin-editor-page">

<main class="member-termin-editor-main">

  <div id="member-termin-editor">

    <p class="member-termin-editor-loading">
      Termin wird geladen …
    </p>

  </div>

</main>

<script src="/assets/js/core/dates.js"></script>
<script src="/assets/js/core/termin-dates.js"></script>
<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/feedback/feedback-types.js"></script>
<script src="/assets/js/feedback/feedback-service.js"></script>
<script src="/assets/js/core/content-creator.js"></script>
<script src="/assets/js/core/media-url.js"></script>
<script src="/assets/js/core/image-compress.js"></script>
<script src="/admin/js/media-storage-lib.js"></script>
<script src="/admin/js/media-picker.js"></script>
<script src="/assets/js/member/member-edit-utils.js"></script>
<script src="/admin/js/admin-utils.js?v={{ site.admin_js_version }}"></script>
<script src="/admin/js/feedback-module-form.js?v={{ site.admin_js_version }}"></script>
<script src="/assets/js/member/member-content.js"></script>
<script src="/assets/js/member/member-termin-edit.js?v={{ site.admin_js_version }}"></script>
<script>
document.addEventListener(
  'DOMContentLoaded',
  () => {
    void initMemberTerminEditPage();
  }
);
</script>

</body>

</html>
