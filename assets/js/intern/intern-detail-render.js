function renderInternNewsDetail(
  item
) {

  const backUrl =
    typeof getInternUrl === 'function'
      ? getInternUrl()
      : '/intern/';

  const wrapper =
    document.getElementById(
      'intern-detail'
    );

  if (
    !wrapper
    || !item
  ) {
    return;
  }

  const newsImage =
    typeof resolveNewsImage === 'function'
      ? resolveNewsImage(item)
      : item.image;

  const sortDate =
    typeof getInternNewsSortDate === 'function'
      ? getInternNewsSortDate(item)
      : null;

  const dateLine =
    sortDate
      ? sortDate.toLocaleDateString(
        'de-DE',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }
      )
      : '';

  document.title =
    `${item.title}
    · MTB Werdohl`;

  wrapper.innerHTML = `

<div class="event-page event-page--intern-detail">

<header class="event-header">

<div class="event-header__title">

<h1 class="event-title">

${formatContentCardTitle(
  item.title,
  item.sichtbarkeit
)}

</h1>

<div class="event-header__actions">

<a
  class="event-back-link"
  href="${backUrl}">

← Zurück

</a>

<div id="share"></div>

<div
  id="intern-vorstand-actions"
  class="news-vorstand-actions">

</div>

</div>

</div>

<div class="event-header__main">

<div class="event-header__when">

${
  dateLine
    ? `
<h2 class="event-date">

📅

${dateLine}

</h2>
`
    : ''
}

</div>

<div
  id="intern-feedback"
  class="event-header__feedback">

</div>

</div>

</header>

${

newsImage

?

`

<img

class="event-image"

src="${newsImage}"

>

`

:''

}

<div class="event-content">

${marked.parse(

item.content || ''

)}

</div>

<div class="event-back">

<a href="${backUrl}">

← Zurück zu Internes

</a>

</div>

</div>

`;

  wrapper.dataset.newsId =
    String(item.id);

  wrapper.dataset.newsTitle =
    item.title || '';

  wrapper.dataset.newsSlug =
    item.slug || '';

  if (
    typeof buildShareButton === 'function'
  ) {

    buildShareButton(
      'share',
      item.title
    );

  }

}
