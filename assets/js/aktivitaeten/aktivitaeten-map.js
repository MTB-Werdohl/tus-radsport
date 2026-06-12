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

  addActivityRouteToMap(
    map,
    latLngs
  );

  window.requestAnimationFrame(() => {
    map.invalidateSize();
  });

}

function initActivityDetailHeroMap(node) {

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
      scrollWheelZoom: true,
      dragging: true,
      zoomControl: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      touchZoom: true,
      attributionControl: true
    });

  node.__activityDetailLeafletMap = map;

  addActivityRouteToMap(
    map,
    latLngs
  );

  window.requestAnimationFrame(() => {
    map.invalidateSize();
  });

}

function addActivityRouteToMap(
  map,
  latLngs
) {

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
      color: '#ed1c24',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

  const startPoint = latLngs[0];
  const endPoint = latLngs[latLngs.length - 1];

  L.circleMarker(startPoint, {
    radius: 6,
    color: '#ffffff',
    fillColor: '#2e8b57',
    fillOpacity: 1,
    weight: 2
  }).addTo(map);

  const finishIcon =
    L.divIcon({
      className: 'aktivitaeten-finish-flag',
      html: '<span class="aktivitaeten-finish-flag__pattern"></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

  L.marker(endPoint, {
    icon: finishIcon,
    interactive: false
  }).addTo(map);

  map.fitBounds(
    line.getBounds(),
    {
      padding: [18, 18]
    }
  );

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

function refreshActivityDetailMap(
  root = document
) {

  if (typeof L === 'undefined') {
    return;
  }

  root
    .querySelectorAll(
      '[data-activity-detail-map]:not([data-map-ready])'
    )
    .forEach((node) => {
      initActivityDetailHeroMap(node);
    });

}

function refreshActivityDetailMapSize(
  root = document
) {

  const mapNode =
    root?.querySelector?.(
      '[data-activity-detail-map][data-map-ready="true"]'
    );

  const map =
    mapNode?.__activityDetailLeafletMap;

  if (!map) {
    return;
  }

  window.requestAnimationFrame(() => {
    map.invalidateSize();
  });

}

function normalizeActivityStreamLatLng(
  latlng
) {

  if (
    !Array.isArray(latlng)
    || latlng.length < 2
  ) {
    return null;
  }

  const lat =
    Number(latlng[0]);

  const lng =
    Number(latlng[1]);

  if (
    !Number.isFinite(lat)
    || !Number.isFinite(lng)
  ) {
    return null;
  }

  return [lat, lng];

}

function createActivityDetailStreamMapSync(
  root
) {

  if (
    typeof L === 'undefined'
    || !root
  ) {
    return null;
  }

  const mapNode =
    root.querySelector(
      '[data-activity-detail-map][data-map-ready="true"]'
    );

  const map =
    mapNode?.__activityDetailLeafletMap;

  if (!map) {
    return null;
  }

  let profileMarker = null;
  let segmentLayer = null;

  function hideProfilePoint() {

    if (!profileMarker) {
      return;
    }

    map.removeLayer(profileMarker);
    profileMarker = null;

  }

  function showProfilePoint(
    latlng
  ) {

    const point =
      normalizeActivityStreamLatLng(
        latlng
      );

    if (!point) {
      hideProfilePoint();
      return;
    }

    if (!profileMarker) {

      profileMarker =
        L.circleMarker(point, {
          radius: 8,
          color: '#ffffff',
          fillColor: '#ed1c24',
          fillOpacity: 1,
          weight: 3,
          className:
            'activity-detail-map-sync-marker'
        }).addTo(map);

    } else {
      profileMarker.setLatLng(point);
    }

    profileMarker.bringToFront();

  }

  function clearSegmentHighlight() {

    if (!segmentLayer) {
      return;
    }

    map.removeLayer(segmentLayer);
    segmentLayer = null;

  }

  function showSegmentHighlight(
    startLatLng,
    endLatLng
  ) {

    const start =
      normalizeActivityStreamLatLng(
        startLatLng
      );

    const end =
      normalizeActivityStreamLatLng(
        endLatLng
      );

    if (
      !start
      || !end
    ) {
      return;
    }

    clearSegmentHighlight();
    hideProfilePoint();

    segmentLayer =
      L.layerGroup([
        L.polyline(
          [start, end],
          {
            color: '#111111',
            weight: 6,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }
        ),
        L.circleMarker(start, {
          radius: 5,
          color: '#ffffff',
          fillColor: '#2e8b57',
          fillOpacity: 1,
          weight: 2
        }),
        L.circleMarker(end, {
          radius: 5,
          color: '#ffffff',
          fillColor: '#111111',
          fillOpacity: 1,
          weight: 2
        })
      ]).addTo(map);

    map.fitBounds(
      segmentLayer.getBounds(),
      {
        padding: [36, 36],
        maxZoom: 15
      }
    );

  }

  return {
    showProfilePoint,
    hideProfilePoint,
    showSegmentHighlight,
    clearSegmentHighlight
  };

}
