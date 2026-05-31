function renderNewsDetail(
  data
){

  const wrapper=

    document.getElementById(
      'news'
    );

  wrapper.innerHTML=`

<article
class="news-page"
>

<h1
class="news-title"
>

${formatContentCardTitle(
  data.title,
  data.sichtbarkeit
)}

</h1>

<div
id="share"
></div>

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

<div
class="news-body"
>

${

marked.parse(

data.content || ''

)

}

</div>

<div
class="event-back"
>

<a
href="/news/"
>

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