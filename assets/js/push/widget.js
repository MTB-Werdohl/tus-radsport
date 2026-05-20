document.addEventListener(
  'DOMContentLoaded',
  initPushWidget
);

async function initPushWidget(){

  const widget =
    document.getElementById(
      'push-widget'
    );

  const content =
    document.getElementById(
      'push-widget-content'
    );

  const toggle =
    document.getElementById(
      'push-widget-toggle'
    );

  if(
    !widget ||
    !content
  ){
    return;
  }

  const push =
    await getLastPush();

  if(!push){
    return;
  }

  const pushId =
    push.sent_at;

  const stored =
    localStorage.getItem(
      'lastSeenPush'
    );

  const collapsed =
    localStorage.getItem(
      'pushCollapsed'
    );

  widget.classList.remove(
    'hidden'
  );

  renderPush(
    content,
    push
  );

  if(
    stored !== pushId
  ){

    widget.classList.remove(
      'collapsed'
    );

  } else {

    if(
      collapsed === 'true'
    ){

      widget.classList.add(
        'collapsed'
      );

    }

  }

  toggle.addEventListener(
    'click',
    () => {

      widget.classList.toggle(
        'collapsed'
      );

      localStorage.setItem(

        'pushCollapsed',

        widget.classList.contains(
          'collapsed'
        )

      );

      localStorage.setItem(
        'lastSeenPush',
        pushId
      );

    }
  );

}

function renderPush(
  target,
  push
){

  target.innerHTML = `

    <div
      class="push-widget-card"
    >

      <h3>

        📢
        ${push.title}

      </h3>

      <p>

        ${push.body}

      </p>

      ${
        push.url

        ?

        `

        <a
          href="${push.url}"
        >

          Mehr erfahren

        </a>

        `

        :

        ''

      }

    </div>

  `;

}