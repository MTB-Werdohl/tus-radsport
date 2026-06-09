---
layout: default
title: Verein
permalink: /verein/
hide_title: true
center_prose: true
load_verein_css: true
description: "Radsportabteilung TuS Jahn Werdohl — Über uns, Ausfahrten und unser Kodex."
---

<figure class="page-header-image">
  <img
    id="verein-header-img"
    src="{{ '/assets/images/header/ueberuns.png' | relative_url }}"
    alt="Über uns"
    width="1792"
    height="256"
    fetchpriority="high">
</figure>

<section class="verein-hero">

  <h1>Verein</h1>

</section>

<div id="verein-portal">

  <div
    class="verein-tabs"
    role="tablist"
    aria-label="Verein-Bereiche">

    <button
      type="button"
      class="verein-tab is-active"
      id="verein-tab-btn-about"
      data-verein-tab="about"
      role="tab"
      aria-selected="true"
      aria-controls="verein-panel-about">

      Über uns

    </button>

    <button
      type="button"
      class="verein-tab"
      id="verein-tab-btn-ausfahrt"
      data-verein-tab="ausfahrt"
      role="tab"
      aria-selected="false"
      aria-controls="verein-panel-ausfahrt">

      Ausfahrt

    </button>

    <button
      type="button"
      class="verein-tab"
      id="verein-tab-btn-kodex"
      data-verein-tab="kodex"
      role="tab"
      aria-selected="false"
      aria-controls="verein-panel-kodex">

      Kodex

    </button>

  </div>

  <div
    id="verein-panel-about"
    class="verein-tab-panel"
    data-verein-panel="about"
    role="tabpanel"
    aria-labelledby="verein-tab-btn-about">

    {% include verein/about-content.html %}

  </div>

  <div
    id="verein-panel-ausfahrt"
    class="verein-tab-panel"
    data-verein-panel="ausfahrt"
    role="tabpanel"
    aria-labelledby="verein-tab-btn-ausfahrt"
    hidden>

    {% include verein/ausfahrt-content.html %}

  </div>

  <div
    id="verein-panel-kodex"
    class="verein-tab-panel"
    data-verein-panel="kodex"
    role="tabpanel"
    aria-labelledby="verein-tab-btn-kodex"
    hidden>

    {% include verein/kodex-content.html %}

  </div>

</div>

<script src="{{ '/assets/js/verein/verein-page.js' | relative_url }}"></script>
