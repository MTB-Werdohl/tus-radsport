---
layout: default
title: Mitfahren
permalink: /mitfahren/
hide_title: true
mitfahren_layout: true
load_mitfahren_css: true
description: "Unverbindlich mitfahren — jeden Dienstag 18:00 am Brüninghausplatz, Werdohl. MTB, Gravel oder E-Bike. Kostenlos ausprobieren, keine Mitgliedschaft nötig."
---

{% assign wa = "https://wa.me/491608226897?text=Hallo%2C%20ich%20w%C3%BCrde%20gern%20mal%20bei%20euch%20mitfahren.%20Passt%20Dienstag%2018%3A00%20am%20Br%C3%BCninghausplatz%3F" %}

<div class="mitfahren-page">

<section class="mitfahren-hero" aria-labelledby="mitfahren-hero-title">
  <div class="mitfahren-hero__media">
    <img
      class="mitfahren-hero__image"
      src="{{ '/assets/images/mitfahren/header.png' | relative_url }}"
      alt=""
      width="1792"
      height="768"
      fetchpriority="high">
  </div>

  <div class="mitfahren-hero__overlay">
    <h1 class="mitfahren-hero__title" id="mitfahren-hero-title">
      Fahr nicht allein. Fahr mit uns.
    </h1>

    <p class="mitfahren-hero__lead">
      Mountainbike, Gravel oder E-Bike. Komm einfach vorbei und fahr eine Runde mit.
    </p>

    <ul class="mitfahren-hero__perks">
      <li>
        <span aria-hidden="true">✅</span>
        Kostenlos ausprobieren
      </li>
      <li>
        <span aria-hidden="true">✅</span>
        Keine Vereinsmitgliedschaft nötig
      </li>
      <li>
        <span aria-hidden="true">✅</span>
        Niemand bleibt zurück
      </li>
    </ul>

    <a
      class="cta-btn mitfahren-hero__cta"
      href="{{ wa }}"
      rel="noopener noreferrer"
      target="_blank">
      Per WhatsApp melden
    </a>

    <p class="mitfahren-hero__hint">
      Eine Anmeldung ist nicht erforderlich. Wenn du uns vorher kurz schreibst, freuen wir uns.
    </p>
  </div>
</section>

<section class="mitfahren-cards" aria-label="So einfach geht's">
  <div class="mitfahren-cards__grid">

    <article class="mitfahren-card">
      <span class="mitfahren-card__icon" aria-hidden="true">🚴</span>
      <h2 class="mitfahren-card__title">Einfach mitfahren</h2>
      <p class="mitfahren-card__text">
        Dienstags um 18:00 Uhr am Brüninghausplatz in Werdohl.
      </p>
    </article>

    <article class="mitfahren-card">
      <span class="mitfahren-card__icon" aria-hidden="true">🤝</span>
      <h2 class="mitfahren-card__title">Für jedes Niveau</h2>
      <p class="mitfahren-card__text">
        Wir fahren gemeinsam. Tempo und Strecke richten sich nach der Gruppe.
      </p>
    </article>

    <article class="mitfahren-card">
      <span class="mitfahren-card__icon" aria-hidden="true">📱</span>
      <h2 class="mitfahren-card__title">Kurz Bescheid geben</h2>
      <p class="mitfahren-card__text">
        Nicht notwendig, hilft uns aber bei der Planung.
      </p>
    </article>

  </div>
</section>

<section class="mitfahren-emotion">
  <figure class="mitfahren-emotion__figure">
    <img
      class="mitfahren-emotion__image"
      src="{{ '/assets/images/mitfahren/group-placeholder.svg' | relative_url }}"
      alt=""
      width="1200"
      height="800"
      loading="lazy">
  </figure>

  <div class="mitfahren-emotion__body">
    <p class="mitfahren-emotion__quote">
      Bei uns geht es nicht um Bestzeiten. Sondern um gemeinsame Touren, neue Leute und Spaß auf dem Rad.
    </p>

    <a
      class="cta-btn cta-btn--secondary mitfahren-emotion__cta"
      href="{{ wa }}"
      rel="noopener noreferrer"
      target="_blank">
      Kurz per WhatsApp melden
    </a>
  </div>
</section>

<section class="mitfahren-faq" aria-labelledby="mitfahren-faq-title">
  <h2 class="mitfahren-faq__title" id="mitfahren-faq-title">
    Kurz gefragt
  </h2>

  <div class="mitfahren-faq__list">

    <details class="mitfahren-faq__item">
      <summary>Muss ich Vereinsmitglied sein?</summary>
      <p class="mitfahren-faq__answer">
        Nein. Du kannst jederzeit unverbindlich mitfahren.
      </p>
    </details>

    <details class="mitfahren-faq__item">
      <summary>Kann ich einfach kommen?</summary>
      <p class="mitfahren-faq__answer">
        Ja. Komm einfach vorbei und fahr mit.
      </p>
    </details>

    <details class="mitfahren-faq__item">
      <summary>Welches Fahrrad brauche ich?</summary>
      <p class="mitfahren-faq__answer">
        Mountainbike, Gravelbike oder E-Bike.
      </p>
    </details>

    <details class="mitfahren-faq__item">
      <summary>Wie fit muss ich sein?</summary>
      <p class="mitfahren-faq__answer">
        Keine Sorge. Niemand wird stehen gelassen.
      </p>
    </details>

  </div>
</section>

