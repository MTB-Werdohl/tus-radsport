---
layout: default
title: Fahr nicht allein. Fahr mit uns.
hide_title: true
load_calendar_css: true
load_news_css: true
description: Radsportabteilung TuS Jahn Werdohl — gemeinsam MTB, Gravel & E-Bike fahren. Jeden Dienstag 18:00 After-Work Tour. Gäste willkommen!
---

<div class="home-page">

<section class="home-hero">
  <picture class="home-hero-picture">
    <source
      media="(max-width: 800px)"
      srcset="{{ '/assets/images/hero-mobile.jpeg' | relative_url }}">
    <img
      class="home-hero-image"
      src="{{ '/assets/images/hero.jpeg' | relative_url }}"
      alt="Gemeinsam auf dem Rad"
      width="1793"
      height="762"
      fetchpriority="high">
  </picture>

  <div class="home-hero-overlay">
    <h1 class="home-title">Fahr nicht allein. Fahr mit uns.</h1>

    <p class="home-lead">
      Radsportabteilung TuS Jahn Werdohl — gemeinsam fahren, niemand bleibt zurück.
      MTB, Gravel oder E-Bike: Gäste sind willkommen.
    </p>

    <a
      class="cta-btn home-hero-cta"
      href="https://wa.me/491608226897?text=Hallo%2C%20ich%20w%C3%BCrde%20gern%20mal%20bei%20euch%20mitfahren.%20Passt%20Dienstag%2018%3A00%20am%20Br%C3%BCninghausplatz%3F"
      rel="noopener noreferrer"
      target="_blank">
      Jetzt anfragen (WhatsApp)
    </a>

    <p class="home-quick-facts" id="home-quick-facts">
      <strong>After-Work Tour · jeden Dienstag 18:00 · Brüninghausplatz, Werdohl</strong>
    </p>
  </div>
</section>

<section class="home-section home-section-intro">
  <h2>Neu dabei?</h2>
  <ol class="home-steps">
    <li>Kurz per WhatsApp melden</li>
    <li>Unverbindlich mitfahren</li>
    <li>Passt's? Komm wieder.</li>
  </ol>
  <p>
    Touren im Sauerland, Tempo nach der Gruppe, <strong>Helm Pflicht</strong> und
    Ersatzschlauch empfohlen.
  </p>
</section>

<section class="home-section">
  <h2>Aktuell im Verein</h2>

  <h3 class="home-teaser-heading">News</h3>
  <div id="home-news-teaser" class="home-teaser-stack"></div>

  <h3 class="home-teaser-heading">Termine</h3>
  <div id="home-termine-teaser" class="home-teaser-stack"></div>
</section>

<section class="home-discover">
  <h2>Mehr entdecken</h2>

  <div class="home-discover-grid">

    <a class="card" href="{{ '/verein/' | relative_url }}?tab=about">
      <h3>Über uns</h3>
      <p>Wer wir sind, wie wir ticken und warum bei uns Gemeinschaft vor Leistung steht.</p>
    </a>

    <a class="card" href="{{ '/verein/' | relative_url }}?tab=ausfahrt">
      <h3>Ausfahrt</h3>
      <p>Wann wir unterwegs sind, wo wir starten und was dich auf unseren Ausfahrten erwartet.</p>
    </a>

  </div>
</section>

</div>

<script src="/assets/js/calendar/categories.js"></script>
<script src="/assets/js/core/termin-dates.js"></script>
<script src="/assets/js/calendar/card-dates.js"></script>
<script src="/assets/js/calendar/termine-loader.js"></script>
<script src="/assets/js/calendar/event-cards.js"></script>
<script src="/assets/js/core/visibility.js"></script>
<script src="/assets/js/news/news-service.js"></script>
<script src="/assets/js/home/home-page.js"></script>
