function renderNewsDetail(
  data
) {

  const wrapper =
    document.getElementById(
      'news'
    );

  if (
    !wrapper
    || !data
  ) {
    return;
  }

  wrapper.innerHTML = `

<article class="news-page event-page">

<header class="event-header news-header">

<div class="news-header__intro">

<h1 class="news-title">

${formatContentCardTitle(
  data.title,
  data.sichtbarkeit
)}

</h1>

<div class="event-header__actions">

<a
  class="event-back-link"
  href="/news/">

← Zurück

</a>

<div id="share"></div>

</div>

</div>

<div
  id="news-feedback"
  class="event-header__feedback">

</div>

</header>

${

data.image

?

`

<img

src="${data.image}"

class="news-hero"

alt="${data.title}"

>

`

:''

}

<div class="news-body">

${

marked.parse(

data.content || ''

)

}

</div>

<div class="event-back">

<a href="/news/">

← Zurück zur Newsübersicht

</a>

</div>

</article>

`;

  buildShareButton(
    'share',
    data.title
  );

}
