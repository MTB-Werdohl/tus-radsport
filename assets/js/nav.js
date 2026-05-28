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

  if (
    typeof closeMemberAuthPanel === 'function'
  ) {
    closeMemberAuthPanel();
  }

}

function markActiveNavLinks() {

  if (!nav) {
    return;
  }

  const path =
    window.location.pathname;

  nav.querySelectorAll('a').forEach((link) => {

    const href =
      link.pathname;

    const isActive =
      path === href
      || (
        href !== '/'
        && path.startsWith(
          href.endsWith('/')
            ? href
            : `${href}/`
        )
      );

    link.classList.toggle(
      'is-active',
      isActive
    );

  });

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

      el.addEventListener('click', (event) => {

        if (
          el.id === 'member-auth-trigger'
        ) {
          return;
        }

        closeNav();

      });

    });

  }

}

markActiveNavLinks();
