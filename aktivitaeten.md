---
layout: default
title: Aktivitäten
permalink: /aktivitaeten/
hide_title: true
load_aktivitaeten_css: true
description: "Aktivitätsfeed, Rankings und Vereinsstatistiken der MTB-Abteilung TuS Jahn Werdohl."
---

<section class="aktivitaeten-hero">

  <h1>Aktivitäten</h1>

  <p class="aktivitaeten-lead">
    Ausfahrten und Statistiken unserer Mitglieder — freiwillig
    geteilt über Strava.
  </p>

</section>

<div id="aktivitaeten-portal">

  <div
    class="aktivitaeten-tabs"
    role="tablist"
    aria-label="Aktivitäten-Bereiche">

    <button
      type="button"
      class="aktivitaeten-tab is-active"
      id="aktivitaeten-tab-btn-feed"
      data-aktivitaeten-tab="feed"
      role="tab"
      aria-selected="true"
      aria-controls="aktivitaeten-panel-feed">

      Feed

    </button>

    <button
      type="button"
      class="aktivitaeten-tab"
      id="aktivitaeten-tab-btn-ranking"
      data-aktivitaeten-tab="ranking"
      role="tab"
      aria-selected="false"
      aria-controls="aktivitaeten-panel-ranking">

      Ranking

    </button>

    <button
      type="button"
      class="aktivitaeten-tab"
      id="aktivitaeten-tab-btn-club"
      data-aktivitaeten-tab="club"
      role="tab"
      aria-selected="false"
      aria-controls="aktivitaeten-panel-club">

      Vereinsziele

    </button>

  </div>

  <div
    id="aktivitaeten-panel-feed"
    class="aktivitaeten-tab-panel"
    data-aktivitaeten-panel="feed"
    role="tabpanel"
    aria-labelledby="aktivitaeten-tab-btn-feed">

    <div id="aktivitaeten-feed"></div>

  </div>

  <div
    id="aktivitaeten-panel-ranking"
    class="aktivitaeten-tab-panel"
    data-aktivitaeten-panel="ranking"
    role="tabpanel"
    aria-labelledby="aktivitaeten-tab-btn-ranking"
    hidden>

    <div id="aktivitaeten-rankings"></div>

  </div>

  <div
    id="aktivitaeten-panel-club"
    class="aktivitaeten-tab-panel"
    data-aktivitaeten-panel="club"
    role="tabpanel"
    aria-labelledby="aktivitaeten-tab-btn-club"
    hidden>

    <div id="aktivitaeten-club"></div>

  </div>

</div>

<script src="/assets/js/core/dates.js"></script>
<script src="/assets/js/aktivitaeten/aktivitaeten-service.js"></script>
<script src="/assets/js/aktivitaeten/aktivitaeten-render.js"></script>
<script src="/assets/js/aktivitaeten/aktivitaeten-page.js"></script>
