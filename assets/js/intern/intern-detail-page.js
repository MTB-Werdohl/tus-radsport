function resolveInternNewsDetailSlug() {

  let slug =

    new URLSearchParams(
      window.location.search
    )

    .get('slug');

  if (slug) {
    return slug;
  }

  const parts =

    window.location.pathname
      .split('/')
      .filter(Boolean);

  if (
    parts.length >= 2
    && parts[0] === 'intern'
  ) {
    return parts[parts.length - 1];
  }

  return null;

}

async function loadInternNewsDetail() {

  const slug =
    resolveInternNewsDetailSlug();

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
      kind: 'intern',
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

  renderInternNewsDetail(item);

  const isVorstandUser =
    typeof isVorstand === 'function'
    && isVorstand(member);

  if (
    isVorstandUser
    && typeof initInternDetailVorstand
      === 'function'
  ) {

    initInternDetailVorstand(
      item,
      member
    );

  }

  if (
    typeof initFeedbackModule === 'function'
  ) {

    await initFeedbackModule({
      entityType:
        window.siteConfig.feedback.entityTypes.news,
      entityId: item.id,
      entityVisibility:
        item.sichtbarkeit,
      container: 'intern-feedback',
      member
    });

  }

  window.reloadAfterInternNewsSave =
    (savedMeta) => {

      if (
        savedMeta?.slug
        && typeof getInternNewsUrl === 'function'
      ) {

        window.location.href =
          getInternNewsUrl(savedMeta.slug);

        return;

      }

      void loadInternNewsDetail();

    };

  const detailUrl =
    typeof getInternNewsUrl === 'function'
      ? getInternNewsUrl(item.slug)
      : `/intern/${encodeURIComponent(item.slug)}/`;

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
