const toggle = document.querySelector('.nav-toggle');
const navWrap = document.getElementById('header-nav-wrap');
const nav = document.getElementById('site-nav');

function closeNav() {

  if (navWrap) {
    navWrap.classList.remove('is-open');
  }

  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
  }

}

if (toggle && navWrap && nav) {

  const links = nav.querySelectorAll('a');

  toggle.addEventListener('click', () => {

    const open =
      navWrap.classList.toggle('is-open');

    toggle.setAttribute(
      'aria-expanded',
      String(open)
    );

  });

  links.forEach(link => {

    link.addEventListener('click', closeNav);

  });

  const memberAuth =
    document.getElementById('member-auth');

  if (memberAuth) {

    memberAuth.querySelectorAll('a, button').forEach(el => {

      el.addEventListener('click', closeNav);

    });

  }

}
