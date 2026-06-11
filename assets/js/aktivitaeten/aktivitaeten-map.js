function initSingleActivityMap(node) {

  if (
    typeof L === 'undefined'
    || !node
    || node.dataset.mapReady === 'true'
  ) {
    return;
  }

  const encoded =
    node.getAttribute('data-polyline');

  if (!encoded) {
    return;
  }

  const points =
    decodeActivityPolyline(encoded);

  if (points.length < 2) {
    return;
  }

  node.dataset.mapReady = 'true';

  const latLngs =
    points.map((point) => [
      point.lat,
      point.lng
    ]);

  const map =
    L.map(node, {
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true
    });

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19
    }
  ).addTo(map);

  const line =
    L.polyline(latLngs, {
      color: '#ffffff',
      weight: 3,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

  map.fitBounds(
    line.getBounds(),
    {
      padding: [10, 10]
    }
  );

  window.requestAnimationFrame(() => {
    map.invalidateSize();
  });

}

function initActivityMaps(
  root = document
) {

  if (typeof L === 'undefined') {
    return;
  }

  root
    .querySelectorAll('[data-activity-map]')
    .forEach((node) => {
      initSingleActivityMap(node);
    });

}

function observeActivityMaps(
  root = document
) {

  if (
    typeof IntersectionObserver === 'undefined'
  ) {

    initActivityMaps(root);

    return;

  }

  const pending =
    root.querySelectorAll(
      '[data-activity-map]:not([data-map-ready])'
    );

  if (!pending.length) {
    return;
  }

  const observer =
    new IntersectionObserver(
      (entries, obs) => {

        entries.forEach((entry) => {

          if (!entry.isIntersecting) {
            return;
          }

          initSingleActivityMap(
            entry.target
          );

          obs.unobserve(entry.target);

        });

      },
      {
        rootMargin: '120px 0px',
        threshold: 0.05
      }
    );

  pending.forEach((node) => {
    observer.observe(node);
  });

}

function refreshActivityMaps(
  root = document
) {

  observeActivityMaps(root);

}
