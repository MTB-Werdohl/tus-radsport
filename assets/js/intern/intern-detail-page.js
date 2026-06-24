async function loadInternNewsDetail() {

  let slug =

    new URLSearchParams(
      window.location.search
    )

    .get('slug');

  if (!slug) {
    return;
  }

  const member =
    await ensureContentViewerMember();

  const item =

    await getInternNewsItem(
      slug,
      member
    );

  if (!item) {

    await handleContentUnavailable({
      kind: 'news',
      slug,
      member,
      containerId: 'intern-detail',
      backUrl:
        typeof getInternUrl === 'function'
          ? getInternUrl()
          : '/intern/',
      backLabel: '← Zurück zu Internes'
    });

    return;

  }

  if (
    !canViewerAccessVisibility(
      item.sichtbarkeit,
      member
    )
  ) {

    renderContentAccessDenied({
      containerId: 'intern-detail',
      kind: 'intern',
      visibility:
        item.sichtbarkeit,
      member,
      backUrl:
        typeof getInternUrl === 'function'
          ? getInternUrl()
          : '/intern/',
      backLabel: '← Zurück zu Internes'
    });

    return;

  }

  const isVorstandUser =
    typeof isVorstand === 'function'
    && isVorstand(member);

  renderInternNewsDetail(
    item,
    {
      isVorstand: isVorstandUser
    }
  );

  const detailUrl =
    typeof getInternNewsUrl === 'function'
      ? getInternNewsUrl(item.slug)
      : `/intern-detail.html?slug=${encodeURIComponent(item.slug)}`;

  window.history.replaceState(
    {},
    '',
    detailUrl
  );

}

document.addEventListener(
  'DOMContentLoaded',
  loadInternNewsDetail
);
