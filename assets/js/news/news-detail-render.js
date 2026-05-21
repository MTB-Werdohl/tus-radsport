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

${data.title}

</h1>

<div
id="share"
></div>

...

</article>

`;

  buildShareButton(

    'share',

    data.title

  );

}