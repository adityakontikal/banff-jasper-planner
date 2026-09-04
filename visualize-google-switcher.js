/* visualize-google-switcher.js
 * Renderer switch + Google 3D drive controller.
 *
 * Open World remains the default/free MapLibre renderer. Google 3D is optional,
 * loads only after explicit selection, and gets its own route driver so Drive
 * never falls through to the free-world camera implementation.
 */
(function (root) {
  'use strict';

  if (!root || !root.Visualize3D || typeof document === 'undefined') return;
  if (root.__ROCKIES_GOOGLE_SWITCHER_LOADED) return;
  root.__ROCKIES_GOOGLE_SWITCHER_LOADED = true;

  const googleObject = root.Visualize3D;
  const rawGoogleOnActivate = googleObject.onVisualizeTabActivated;
  const rawGoogleChooseDay = googleObject.chooseVisualizeDay;
  const rawGoogleCancelFlight = googleObject.cancelRouteFlyThrough;
  const rawGoogleToggleMapOnly = googleObject.toggleMapOnly;
  const rawGoogleFitRoute = googleObject.fitActiveRoute;

  let freeApi = null;
  let renderer = 'open';
  let rememberedDay = null;
  let observer = null;
  let wireTimer = 0;
  let rememberedMap3D = null;
  let routeOverlay = null;
  let routeOverlayDay = null;
  let vehicleMarker = null;

  const GOOGLE_RIGS = {
    road: {
      range: 55,
      tilt: 84,
      fov: 55,
      focusLead: 24,
      headingWindow: 35,
      headingRate: 1.7,
      bearingDeadband: 1.15,
      maxTurnRate: 11,
      targetLift: 2.5,
      minDistanceScale: 0.55,
      maxDistanceScale: 4.0,
      panMetersPerPixel: 0.16,
      maxPanMeters: 300
    },
    scenic: {
      range: 1500,
      tilt: 74,
      fov: 45,
      focusLead: 220,
      headingWindow: 280,
      headingRate: 0.48,
      bearingDeadband: 2.2,
      maxTurnRate: 3.2,
      targetLift: 30,
      minDistanceScale: 0.45,
      maxDistanceScale: 3.0,
      panMetersPerPixel: 1.4,
      maxPanMeters: 4500
    },
    aerial: {
      range: 9500,
      tilt: 55,
      fov: 35,
      focusLead: 1100,
      headingWindow: 1200,
      headingRate: 0.20,
      bearingDeadband: 3.4,
      maxTurnRate: 1.5,
      targetLift: 110,
      minDistanceScale: 0.42,
      maxDistanceScale: 2.8,
      panMetersPerPixel: 6.0,
      maxPanMeters: 18000
    }
  };

  const googleDrive = {
    active: false,
    paused: false,
    frame: 0,
    lastAt: 0,
    progress: 0,
    speed: 1,
    mode: 'road',
    route: [],
    cumulative: [],
    totalMeters: 0,
    baseDurationMs: 600000,
    autoBearing: null,
    dayData: null,
    elevationAnchors: [],
    stopFractions: []
  };

  const controls = {
    yawDeg: 0,
    lookDeg: 0,
    distanceScale: 1,
    panRightMeters: 0,
    panForwardMeters: 0,
    pointerActive: false,
    pointerId: null,
    pointerX: 0,
    pointerY: 0,
    rotatePointer: false,
    gestureScale: 1,
    gestureRotation: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function normalizeHeading(value) {
    const n = Number(value) || 0;
    return ((n % 360) + 360) % 360;
  }

  function shortestHeadingDelta(from, to) {
    return ((normalizeHeading(to) - normalizeHeading(from) + 540) % 360) - 180;
  }

  function selectedDay() {
    try {
      const active = document.querySelector('#visualizeview [data-free-day].on, #visualizeview [data-day].on, #visualizeview .vis-daybtn.on');
      const value = active && (active.dataset.freeDay || active.dataset.day || active.textContent);
      if (value && String(value).trim() && String(value).trim() !== 'All Days') return String(value).trim();
    } catch (_) {}
    try {
      if (typeof S !== 'undefined' && S && S.selectedDay && S.selectedDay !== 'all') return String(S.selectedDay);
    } catch (_) {}
    return rememberedDay || 'Sep 27';
  }

  function captureMapFromNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.id === 'rockiesMap3D') rememberedMap3D = node;
    if (!rememberedMap3D && typeof node.querySelector === 'function') {
      const nested = node.querySelector('#rockiesMap3D');
      if (nested) rememberedMap3D = nested;
    }
  }

  function captureCurrentMap() {
    const live = document.getElementById('rockiesMap3D');
    if (live) rememberedMap3D = live;
    return rememberedMap3D;
  }

  function ensureGoogleMapAttached() {
    if (renderer !== 'google') return captureCurrentMap();
    const container = document.getElementById('visualizeMapContainer');
    const map = captureCurrentMap();
    if (container && map && map.parentNode !== container) {
      container.innerHTML = '';
      container.appendChild(map);
    }
    if (map) {
      map.style.width = '100%';
      map.style.height = '100%';
      try { map.defaultUIHidden = false; } catch (_) {}
      try { map.maxTilt = 88; } catch (_) {}
      installGoogleDriveInteractions(container || map);
    }
    return map;
  }

  function haversineMeters(a, b) {
    const rad = Math.PI / 180;
    const lat1 = Number(a[1]) * rad;
    const lat2 = Number(b[1]) * rad;
    const dLat = lat2 - lat1;
    const dLng = (Number(b[0]) - Number(a[0])) * rad;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function bearingBetween(a, b) {
    const rad = Math.PI / 180;
    const lat1 = Number(a[1]) * rad;
    const lat2 = Number(b[1]) * rad;
    const dLng = (Number(b[0]) - Number(a[0])) * rad;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return normalizeHeading(Math.atan2(y, x) / rad);
  }

  function movePoint(point, bearing, meters) {
    const R = 6371008.8;
    const d = Number(meters || 0) / R;
    const brng = Number(bearing || 0) * Math.PI / 180;
    const lat1 = Number(point[1]) * Math.PI / 180;
    const lng1 = Number(point[0]) * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
    return [lng2 * 180 / Math.PI, lat2 * 180 / Math.PI];
  }

  function buildRoute(coords) {
    const route = (coords || []).map(function (coord) {
      return [Number(coord[0]), Number(coord[1])];
    }).filter(function (coord) {
      return Number.isFinite(coord[0]) && Number.isFinite(coord[1]);
    });
    const cumulative = route.length ? [0] : [];
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      total += haversineMeters(route[i - 1], route[i]);
      cumulative.push(total);
    }
    return { route: route, cumulative: cumulative, total: total };
  }

  function sampleRoute(distanceMeters) {
    const route = googleDrive.route;
    const cumulative = googleDrive.cumulative;
    const total = googleDrive.totalMeters;
    if (!route.length) return null;
    if (route.length === 1 || total <= 0) return route[0].slice();
    const d = clamp(distanceMeters, 0, total);
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (cumulative[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = Math.max(1e-6, cumulative[hi] - cumulative[lo]);
    const t = clamp((d - cumulative[lo]) / span, 0, 1);
    return [
      route[lo][0] + (route[hi][0] - route[lo][0]) * t,
      route[lo][1] + (route[hi][1] - route[lo][1]) * t
    ];
  }

  function nearestRouteDistance(lng, lat) {
    if (!googleDrive.route.length) return 0;
    let bestIndex = 0;
    let best = Infinity;
    for (let i = 0; i < googleDrive.route.length; i++) {
      const p = googleDrive.route[i];
      const score = Math.pow(p[0] - Number(lng), 2) + Math.pow(p[1] - Number(lat), 2);
      if (score < best) {
        best = score;
        bestIndex = i;
      }
    }
    return googleDrive.cumulative[bestIndex] || 0;
  }

  function buildElevationAndStopAnchors(dayData) {
    const anchors = [];
    const stops = [];
    (dayData.activeStops || []).forEach(function (stop) {
      const distance = nearestRouteDistance(stop.lng, stop.lat);
      let elevation = 1500;
      try {
        if (googleObject.getLandmarkCameraProfile) {
          const profile = googleObject.getLandmarkCameraProfile(stop);
          if (profile && Number.isFinite(Number(profile.elevation))) elevation = Number(profile.elevation);
        }
      } catch (_) {}
      anchors.push({ distance: distance, elevation: elevation });
      stops.push({ distance: distance, fraction: googleDrive.totalMeters ? distance / googleDrive.totalMeters : 0, stop: stop });
    });
    anchors.sort(function (a, b) { return a.distance - b.distance; });
    stops.sort(function (a, b) { return a.distance - b.distance; });
    if (anchors.length) {
      if (anchors[0].distance > 0) anchors.unshift({ distance: 0, elevation: anchors[0].elevation });
      if (anchors[anchors.length - 1].distance < googleDrive.totalMeters) {
        anchors.push({ distance: googleDrive.totalMeters, elevation: anchors[anchors.length - 1].elevation });
      }
    } else {
      anchors.push({ distance: 0, elevation: 1500 }, { distance: googleDrive.totalMeters, elevation: 1500 });
    }
    googleDrive.elevationAnchors = anchors;
    googleDrive.stopFractions = stops;
  }

  function elevationAtDistance(distance) {
    const anchors = googleDrive.elevationAnchors;
    if (!anchors.length) return 1500;
    const d = clamp(distance, 0, googleDrive.totalMeters);
    if (d <= anchors[0].distance) return anchors[0].elevation;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1];
      const b = anchors[i];
      if (d <= b.distance) {
        const span = Math.max(1, b.distance - a.distance);
        const t = clamp((d - a.distance) / span, 0, 1);
        return a.elevation + (b.elevation - a.elevation) * t;
      }
    }
    return anchors[anchors.length - 1].elevation;
  }

  function smoothBearing(previous, target, dt, rig) {
    const targetHeading = normalizeHeading(target);
    if (!Number.isFinite(previous)) return targetHeading;
    let delta = shortestHeadingDelta(previous, targetHeading);
    if (Math.abs(delta) <= rig.bearingDeadband) return normalizeHeading(previous);
    delta -= Math.sign(delta) * rig.bearingDeadband;
    const alpha = 1 - Math.exp(-rig.headingRate * clamp(dt, 0.008, 0.12));
    let step = delta * alpha;
    const maxStep = rig.maxTurnRate * clamp(dt, 0.008, 0.12);
    step = clamp(step, -maxStep, maxStep);
    return normalizeHeading(previous + step);
  }

  function resetManualControls() {
    controls.yawDeg = 0;
    controls.lookDeg = 0;
    controls.distanceScale = 1;
    controls.panRightMeters = 0;
    controls.panForwardMeters = 0;
  }

  function activeRig() {
    return GOOGLE_RIGS[googleDrive.mode] || GOOGLE_RIGS.road;
  }

  function applyPan(point, viewBearing, rig) {
    let shifted = movePoint(point, viewBearing, clamp(controls.panForwardMeters, -rig.maxPanMeters, rig.maxPanMeters));
    shifted = movePoint(shifted, viewBearing + 90, clamp(controls.panRightMeters, -rig.maxPanMeters, rig.maxPanMeters));
    return shifted;
  }

  function applyGoogleDriveFrame(force) {
    const map = ensureGoogleMapAttached();
    if (!map || !googleDrive.route.length) return;
    const rig = activeRig();
    const distance = googleDrive.totalMeters * googleDrive.progress;
    const point = sampleRoute(distance);
    const ahead = sampleRoute(Math.min(googleDrive.totalMeters, distance + rig.headingWindow));
    if (!point || !ahead) return;

    const targetHeading = bearingBetween(point, ahead);
    const dt = force ? 0.016 : 0.016;
    googleDrive.autoBearing = smoothBearing(googleDrive.autoBearing, targetHeading, dt, rig);
    const viewBearing = normalizeHeading(googleDrive.autoBearing + controls.yawDeg);
    const yawFromRoad = Math.abs(shortestHeadingDelta(googleDrive.autoBearing, viewBearing));
    const leadFactor = clamp(Math.cos(Math.min(90, yawFromRoad) * Math.PI / 180), 0, 1);
    let focus = movePoint(point, googleDrive.autoBearing, rig.focusLead * leadFactor);
    focus = applyPan(focus, viewBearing, rig);

    const baseElevation = elevationAtDistance(distance);
    const range = clamp(rig.range * controls.distanceScale, rig.range * rig.minDistanceScale, rig.range * rig.maxDistanceScale);
    const tilt = clamp(rig.tilt + controls.lookDeg, 20, 88);

    try {
      map.center = { lat: focus[1], lng: focus[0], altitude: baseElevation + rig.targetLift };
      map.range = range;
      map.tilt = tilt;
      map.heading = viewBearing;
      if ('fov' in map) map.fov = rig.fov;
    } catch (_) {}

    if (vehicleMarker) {
      try { vehicleMarker.position = { lat: point[1], lng: point[0], altitude: 2 }; } catch (_) {}
    }
    updateGoogleHud(distance);
  }

  function animationLoop(now) {
    if (!googleDrive.active) return;
    const delta = googleDrive.lastAt ? Math.min(90, now - googleDrive.lastAt) : 0;
    googleDrive.lastAt = now;
    if (!googleDrive.paused && delta > 0) {
      googleDrive.progress = clamp(
        googleDrive.progress + (delta * googleDrive.speed) / googleDrive.baseDurationMs,
        0,
        1
      );
    }
    const rig = activeRig();
    const distance = googleDrive.totalMeters * googleDrive.progress;
    const point = sampleRoute(distance);
    const ahead = sampleRoute(Math.min(googleDrive.totalMeters, distance + rig.headingWindow));
    if (point && ahead) {
      const targetHeading = bearingBetween(point, ahead);
      const dtSeconds = delta > 0 ? delta / 1000 : 0.016;
      googleDrive.autoBearing = smoothBearing(googleDrive.autoBearing, targetHeading, dtSeconds, rig);
      const viewBearing = normalizeHeading(googleDrive.autoBearing + controls.yawDeg);
      const yawFromRoad = Math.abs(shortestHeadingDelta(googleDrive.autoBearing, viewBearing));
      const leadFactor = clamp(Math.cos(Math.min(90, yawFromRoad) * Math.PI / 180), 0, 1);
      let focus = movePoint(point, googleDrive.autoBearing, rig.focusLead * leadFactor);
      focus = applyPan(focus, viewBearing, rig);
      const baseElevation = elevationAtDistance(distance);
      const map = ensureGoogleMapAttached();
      if (map) {
        try {
          map.center = { lat: focus[1], lng: focus[0], altitude: baseElevation + rig.targetLift };
          map.range = clamp(rig.range * controls.distanceScale, rig.range * rig.minDistanceScale, rig.range * rig.maxDistanceScale);
          map.tilt = clamp(rig.tilt + controls.lookDeg, 20, 88);
          map.heading = viewBearing;
          if ('fov' in map) map.fov = rig.fov;
        } catch (_) {}
      }
      if (vehicleMarker) {
        try { vehicleMarker.position = { lat: point[1], lng: point[0], altitude: 2 }; } catch (_) {}
      }
      updateGoogleHud(distance);
    }

    if (googleDrive.progress >= 1) {
      stopGoogleDrive(false);
      return;
    }
    googleDrive.frame = requestAnimationFrame(animationLoop);
  }

  function cinematicDurationMs(totalMeters) {
    const km = Math.max(1, Number(totalMeters || 0) / 1000);
    return clamp(km * 1800, 240000, 900000);
  }

  function currentDayData() {
    const day = selectedDay();
    if (!googleObject.getVisualizeDayData) return null;
    try { return googleObject.getVisualizeDayData(day); } catch (_) { return null; }
  }

  function startGoogleDrive() {
    if (renderer !== 'google') return;
    if (googleDrive.active) {
      stopGoogleDrive(false);
      return;
    }
    const map = ensureGoogleMapAttached();
    const dayData = currentDayData();
    if (!map) {
      if (typeof alert === 'function') alert('Google 3D is still loading. Wait for the terrain to appear, then press Drive route again.');
      return;
    }
    if (!dayData || !dayData.routeCoordinates || dayData.routeCoordinates.length < 2) {
      if (typeof alert === 'function') alert('Select an individual day with a resolved road route before driving.');
      return;
    }

    const built = buildRoute(dayData.routeCoordinates);
    googleDrive.route = built.route;
    googleDrive.cumulative = built.cumulative;
    googleDrive.totalMeters = built.total;
    googleDrive.baseDurationMs = cinematicDurationMs(built.total);
    googleDrive.dayData = dayData;
    googleDrive.progress = 0;
    googleDrive.autoBearing = null;
    googleDrive.active = true;
    googleDrive.paused = false;
    googleDrive.lastAt = 0;
    resetManualControls();
    buildElevationAndStopAnchors(dayData);

    try { if (typeof map.stopCameraAnimation === 'function') map.stopCameraAnimation(); } catch (_) {}
    ensureGoogleRouteOverlay(map, dayData);
    ensureGoogleVehicleMarker(map);
    showGoogleStatus(true);
    updateGoogleButtons();
    applyGoogleDriveFrame(true);
    if (googleDrive.frame) cancelAnimationFrame(googleDrive.frame);
    googleDrive.frame = requestAnimationFrame(animationLoop);
  }

  function stopGoogleDrive(restoreFit) {
    googleDrive.active = false;
    googleDrive.paused = false;
    googleDrive.lastAt = 0;
    if (googleDrive.frame) cancelAnimationFrame(googleDrive.frame);
    googleDrive.frame = 0;
    const map = ensureGoogleMapAttached();
    try { if (map && typeof map.stopCameraAnimation === 'function') map.stopCameraAnimation(); } catch (_) {}
    if (vehicleMarker && vehicleMarker.parentNode) {
      try { vehicleMarker.parentNode.removeChild(vehicleMarker); } catch (_) {}
    }
    vehicleMarker = null;
    showGoogleStatus(false);
    updateGoogleButtons();
    if (restoreFit && typeof rawGoogleFitRoute === 'function') {
      try { rawGoogleFitRoute.call(googleObject); } catch (_) {}
    }
  }

  function toggleGooglePause() {
    if (!googleDrive.active) return false;
    googleDrive.paused = !googleDrive.paused;
    googleDrive.lastAt = 0;
    updateGoogleButtons();
    return googleDrive.paused;
  }

  function setGoogleSpeed(speed) {
    const value = Number(speed);
    if (![0.5, 1, 2].includes(value)) return;
    googleDrive.speed = value;
    updateGoogleButtons();
  }

  function setGoogleMode(mode) {
    googleDrive.mode = ['road', 'scenic', 'aerial'].includes(mode) ? mode : 'road';
    googleDrive.autoBearing = null;
    resetManualControls();
    updateGoogleButtons();
    if (renderer === 'google' && googleDrive.route.length) applyGoogleDriveFrame(true);
  }

  function skipGoogleStop(delta) {
    if (!googleDrive.active || !googleDrive.stopFractions.length) return;
    const current = googleDrive.progress;
    let target = null;
    if (delta > 0) {
      target = googleDrive.stopFractions.find(function (entry) { return entry.fraction > current + 0.01; });
      if (!target) target = googleDrive.stopFractions[googleDrive.stopFractions.length - 1];
    } else {
      for (let i = googleDrive.stopFractions.length - 1; i >= 0; i--) {
        if (googleDrive.stopFractions[i].fraction < current - 0.01) { target = googleDrive.stopFractions[i]; break; }
      }
      if (!target) target = googleDrive.stopFractions[0];
    }
    googleDrive.progress = clamp(target.fraction, 0, 1);
    googleDrive.autoBearing = null;
    applyGoogleDriveFrame(true);
  }

  function updateGoogleButtons() {
    const play = document.getElementById('visPlayRouteBtn');
    if (play) play.textContent = googleDrive.active ? '⏹ Stop drive' : '▶ Drive route';
    ['visPauseFlightBtn', 'visMapPauseFlightBtn'].forEach(function (id) {
      const button = document.getElementById(id);
      if (button) button.textContent = googleDrive.paused ? '▶' : '⏸';
    });
    document.querySelectorAll('.vis-speed-btn').forEach(function (button) {
      button.classList.toggle('active', Number(button.dataset.speed) === googleDrive.speed);
    });
    document.querySelectorAll('.vis-flight-speed-tag').forEach(function (tag) {
      tag.textContent = googleDrive.speed + 'x';
    });
    document.querySelectorAll('.vis-world-mode').forEach(function (button) {
      button.classList.toggle('active', button.dataset.worldCamera === googleDrive.mode);
    });
  }

  function setFlightHudVisible(show) {
    const workspace = document.getElementById('visualizeWorkspace');
    const mapOnly = !!(workspace && workspace.classList.contains('map-only'));
    const sidebarHud = document.getElementById('visFlightHud');
    const mapHud = document.getElementById('visMapFlightHud');
    if (sidebarHud) sidebarHud.classList.toggle('hidden', !show || mapOnly);
    if (mapHud) mapHud.classList.toggle('hidden', !show || !mapOnly);
  }

  function showGoogleStatus(driving) {
    if (renderer !== 'google') return;
    const status = document.getElementById('visWorldStatus');
    if (status) status.classList.remove('hidden');
    const badge = status && status.querySelector('.vis-world-badge');
    if (badge) badge.textContent = driving ? 'GOOGLE 3D DRIVE' : 'GOOGLE 3D';
    const sub = document.getElementById('visWorldStatusSub');
    if (sub && !driving) sub.textContent = 'Photorealistic terrain • Road / Scenic / Aerial • trackpad camera';
    setFlightHudVisible(driving);
  }

  function updateGoogleHud(distance) {
    const pct = Math.round(googleDrive.progress * 100);
    const rigName = googleDrive.mode.charAt(0).toUpperCase() + googleDrive.mode.slice(1);
    const totalKm = Math.round(googleDrive.totalMeters / 1000);
    const km = Math.round(distance / 1000);
    document.querySelectorAll('.vis-flight-progress-fill').forEach(function (el) { el.style.width = pct + '%'; });
    document.querySelectorAll('.vis-flight-badge').forEach(function (el) { el.textContent = 'GOOGLE 3D DRIVE'; });
    document.querySelectorAll('.vis-flight-hud-title').forEach(function (el) { el.textContent = 'Driving the real route • ' + pct + '%'; });
    document.querySelectorAll('.vis-flight-hud-sub').forEach(function (el) { el.textContent = rigName + ' camera • ' + km + ' / ' + totalKm + ' km'; });
    const clock = document.getElementById('visWorldClock');
    if (clock) clock.textContent = pct + '% route';
    const sun = document.getElementById('visWorldSun');
    if (sun) sun.textContent = googleDrive.speed + 'x';
    const sub = document.getElementById('visWorldStatusSub');
    if (sub) sub.textContent = rigName + ' • ' + km + ' / ' + totalKm + ' km • pinch / rotate / look / pan';
  }

  async function ensureGoogleRouteOverlay(map, dayData) {
    if (!map || !dayData || routeOverlayDay === dayData.date) return;
    try {
      if (!root.google || !root.google.maps || !root.google.maps.importLibrary) return;
      const lib = await root.google.maps.importLibrary('maps3d');
      if (routeOverlay && routeOverlay.parentNode) routeOverlay.parentNode.removeChild(routeOverlay);
      routeOverlay = new lib.Polyline3DElement({
        path: dayData.routeCoordinates.map(function (coord) { return { lat: Number(coord[1]), lng: Number(coord[0]) }; }),
        altitudeMode: 'CLAMP_TO_GROUND',
        strokeColor: '#ff5c30',
        strokeWidth: 6.5
      });
      map.appendChild(routeOverlay);
      routeOverlayDay = dayData.date;
    } catch (_) {}
  }

  async function ensureGoogleVehicleMarker(map) {
    if (!map || vehicleMarker) return;
    try {
      if (!root.google || !root.google.maps || !root.google.maps.importLibrary) return;
      const lib = await root.google.maps.importLibrary('maps3d');
      const MarkerClass = lib.Marker3DElement || lib.Marker3DInteractiveElement;
      if (!MarkerClass) return;
      const point = sampleRoute(googleDrive.totalMeters * googleDrive.progress);
      if (!point) return;
      vehicleMarker = new MarkerClass({
        position: { lat: point[1], lng: point[0], altitude: 2 },
        altitudeMode: 'RELATIVE_TO_GROUND',
        label: '●',
        title: 'Route position',
        extruded: true
      });
      map.appendChild(vehicleMarker);
    } catch (_) {}
  }

  function activeDriveEvent(event) {
    if (!googleDrive.active || renderer !== 'google') return false;
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
    return true;
  }

  function installGoogleDriveInteractions(target) {
    if (!target || target.__rockiesGoogleDriveInteractions) return;
    target.__rockiesGoogleDriveInteractions = true;
    try { target.style.touchAction = 'none'; } catch (_) {}

    target.addEventListener('wheel', function (event) {
      if (!activeDriveEvent(event)) return;
      const rig = activeRig();
      const dx = Number(event.deltaX || 0);
      const dy = Number(event.deltaY || 0);
      if (event.ctrlKey) {
        const factor = Math.exp(clamp(dy, -45, 45) * 0.0105);
        controls.distanceScale = clamp(controls.distanceScale * factor, rig.minDistanceScale, rig.maxDistanceScale);
        return;
      }
      if (event.shiftKey) {
        const scale = rig.panMetersPerPixel * controls.distanceScale;
        controls.panRightMeters = clamp(controls.panRightMeters + dx * scale, -rig.maxPanMeters, rig.maxPanMeters);
        controls.panForwardMeters = clamp(controls.panForwardMeters + dy * scale, -rig.maxPanMeters, rig.maxPanMeters);
        return;
      }
      if (Math.abs(dx) > 0.2) {
        controls.yawDeg += dx * 0.24;
        if (Math.abs(controls.yawDeg) > 7200) controls.yawDeg %= 360;
      }
      if (Math.abs(dy) > 0.2) {
        controls.lookDeg = clamp(controls.lookDeg - dy * 0.055, -38, 6);
      }
    }, { passive: false, capture: true });

    target.addEventListener('gesturestart', function (event) {
      if (!activeDriveEvent(event)) return;
      controls.gestureScale = Math.max(0.01, Number(event.scale || 1));
      controls.gestureRotation = Number(event.rotation || 0);
    }, { passive: false, capture: true });

    target.addEventListener('gesturechange', function (event) {
      if (!activeDriveEvent(event)) return;
      const rig = activeRig();
      const scale = Math.max(0.01, Number(event.scale || 1));
      const ratio = scale / Math.max(0.01, controls.gestureScale);
      controls.distanceScale = clamp(controls.distanceScale / Math.pow(ratio, 0.9), rig.minDistanceScale, rig.maxDistanceScale);
      controls.gestureScale = scale;
      const rotation = Number(event.rotation || 0);
      controls.yawDeg += rotation - controls.gestureRotation;
      controls.gestureRotation = rotation;
    }, { passive: false, capture: true });

    target.addEventListener('gestureend', function (event) {
      if (!activeDriveEvent(event)) return;
      controls.gestureScale = 1;
      controls.gestureRotation = 0;
    }, { passive: false, capture: true });

    target.addEventListener('pointerdown', function (event) {
      if (!googleDrive.active || renderer !== 'google') return;
      if (event.button !== 0 && event.button !== 2) return;
      activeDriveEvent(event);
      controls.pointerActive = true;
      controls.pointerId = event.pointerId;
      controls.pointerX = event.clientX;
      controls.pointerY = event.clientY;
      controls.rotatePointer = event.button === 2 || event.ctrlKey || event.metaKey;
      try { target.setPointerCapture(event.pointerId); } catch (_) {}
    }, { passive: false, capture: true });

    target.addEventListener('pointermove', function (event) {
      if (!controls.pointerActive || event.pointerId !== controls.pointerId || !googleDrive.active) return;
      activeDriveEvent(event);
      const dx = event.clientX - controls.pointerX;
      const dy = event.clientY - controls.pointerY;
      controls.pointerX = event.clientX;
      controls.pointerY = event.clientY;
      const rig = activeRig();
      if (controls.rotatePointer) {
        controls.yawDeg += dx * 0.30;
        controls.lookDeg = clamp(controls.lookDeg - dy * 0.12, -38, 6);
      } else {
        const scale = rig.panMetersPerPixel * controls.distanceScale;
        controls.panRightMeters = clamp(controls.panRightMeters - dx * scale, -rig.maxPanMeters, rig.maxPanMeters);
        controls.panForwardMeters = clamp(controls.panForwardMeters + dy * scale, -rig.maxPanMeters, rig.maxPanMeters);
      }
    }, { passive: false, capture: true });

    function finishPointer(event) {
      if (!controls.pointerActive || event.pointerId !== controls.pointerId) return;
      if (googleDrive.active) activeDriveEvent(event);
      try { target.releasePointerCapture(event.pointerId); } catch (_) {}
      controls.pointerActive = false;
      controls.pointerId = null;
      controls.rotatePointer = false;
    }
    target.addEventListener('pointerup', finishPointer, { passive: false, capture: true });
    target.addEventListener('pointercancel', finishPointer, { passive: false, capture: true });
    target.addEventListener('contextmenu', function (event) {
      if (googleDrive.active) activeDriveEvent(event);
    }, { passive: false, capture: true });
  }

  function wrapClick(id, driveHandler) {
    const element = document.getElementById(id);
    if (!element || element.__rockiesGoogleDriveWrapped) return;
    const original = element.onclick;
    element.__rockiesGoogleDriveWrapped = true;
    element.onclick = function (event) {
      if (renderer === 'google' && googleDrive.active) return driveHandler(event);
      if (renderer === 'google' && id === 'visPlayRouteBtn') return driveHandler(event);
      if (original) return original.call(element, event);
    };
  }

  function wireGoogleShell() {
    if (renderer !== 'google') return;
    ensureGoogleMapAttached();
    const internalRenderer = document.querySelector('#visualizeview .vis-renderer-switch');
    if (internalRenderer) internalRenderer.style.display = 'none';
    const help = document.getElementById('visControlHelp');
    if (help) {
      help.innerHTML = '<b>Google 3D drive controls</b><span>Pinch = zoom • two-finger left/right = 360° rotate • two-finger up/down = look • drag = pan • Ctrl/⌘/right-drag = rotate + look.</span>';
    }

    wrapClick('visPlayRouteBtn', startGoogleDrive);
    wrapClick('visPauseFlightBtn', toggleGooglePause);
    wrapClick('visMapPauseFlightBtn', toggleGooglePause);
    wrapClick('visStopFlightBtn', function () { stopGoogleDrive(true); });
    wrapClick('visMapStopFlightBtn', function () { stopGoogleDrive(true); });
    wrapClick('visNextFlightLegBtn', function () { skipGoogleStop(1); });
    wrapClick('visMapNextFlightLegBtn', function () { skipGoogleStop(1); });
    wrapClick('visPrevFlightLegBtn', function () { skipGoogleStop(-1); });
    wrapClick('visMapPrevFlightLegBtn', function () { skipGoogleStop(-1); });

    document.querySelectorAll('.vis-speed-btn').forEach(function (button) {
      if (button.__rockiesGoogleSpeedWrapped) return;
      const original = button.onclick;
      button.__rockiesGoogleSpeedWrapped = true;
      button.onclick = function (event) {
        if (renderer === 'google') return setGoogleSpeed(Number(button.dataset.speed));
        if (original) return original.call(button, event);
      };
    });

    document.querySelectorAll('.vis-world-mode').forEach(function (button) {
      if (button.__rockiesGoogleModeWrapped) return;
      button.__rockiesGoogleModeWrapped = true;
      button.onclick = function () { if (renderer === 'google') setGoogleMode(button.dataset.worldCamera); };
    });

    document.querySelectorAll('#visDaySwitch [data-day]').forEach(function (button) {
      if (button.__rockiesGoogleDayWrapped) return;
      button.__rockiesGoogleDayWrapped = true;
      button.onclick = function () {
        stopGoogleDrive(false);
        if (typeof rawGoogleChooseDay === 'function') rawGoogleChooseDay.call(googleObject, button.dataset.day);
        setTimeout(wireGoogleShell, 20);
      };
    });

    wrapClick('visZoomInBtn', function () {
      const rig = activeRig();
      controls.distanceScale = clamp(controls.distanceScale * 0.78, rig.minDistanceScale, rig.maxDistanceScale);
    });
    wrapClick('visZoomOutBtn', function () {
      const rig = activeRig();
      controls.distanceScale = clamp(controls.distanceScale * 1.28, rig.minDistanceScale, rig.maxDistanceScale);
    });
    wrapClick('visRotateLeftBtn', function () { controls.yawDeg -= 20; });
    wrapClick('visRotateRightBtn', function () { controls.yawDeg += 20; });
    wrapClick('visNorthBtn', function () { controls.yawDeg = -Number(googleDrive.autoBearing || 0); });
    wrapClick('visLookDownBtn', function () { controls.lookDeg = clamp(controls.lookDeg - 7, -38, 6); });
    wrapClick('visLookAheadBtn', function () { controls.lookDeg = clamp(controls.lookDeg + 7, -38, 6); });
    wrapClick('visCameraFitBtn', function () { stopGoogleDrive(true); });

    const valley = document.getElementById('visPresetValleyBtn');
    const aerial = document.getElementById('visPresetHighBtn');
    const dollhouse = document.getElementById('visPresetDollhouseBtn');
    if (valley && !valley.__rockiesGoogleModeAlias) {
      valley.__rockiesGoogleModeAlias = true;
      valley.onclick = function () { setGoogleMode('scenic'); };
    }
    if (aerial && !aerial.__rockiesGoogleModeAlias) {
      aerial.__rockiesGoogleModeAlias = true;
      aerial.onclick = function () { setGoogleMode('aerial'); };
    }
    if (dollhouse && !dollhouse.__rockiesGoogleModeAlias) {
      dollhouse.__rockiesGoogleModeAlias = true;
      dollhouse.textContent = 'Road';
      dollhouse.onclick = function () { setGoogleMode('road'); };
    }

    showGoogleStatus(googleDrive.active);
    updateGoogleButtons();
  }

  function scheduleWire() {
    if (wireTimer) clearTimeout(wireTimer);
    wireTimer = setTimeout(function () {
      wireTimer = 0;
      wireGoogleShell();
      injectSwitcher();
    }, 15);
  }

  function patchedGoogleActivate() {
    // Critical cost boundary: the legacy auto-activation in visualize-3d.js must
    // not load Google merely because Visualize opened. Google initializes only
    // after the explicit renderer switch below sets renderer='google'.
    if (renderer !== 'google') {
      injectSwitcher();
      return;
    }
    const result = typeof rawGoogleOnActivate === 'function'
      ? rawGoogleOnActivate.call(googleObject)
      : undefined;
    [0, 80, 300, 900].forEach(function (delay) {
      setTimeout(function () {
        ensureGoogleMapAttached();
        wireGoogleShell();
        injectSwitcher();
      }, delay);
    });
    return result;
  }

  function patchedGoogleChooseDay(day) {
    if (googleDrive.active) stopGoogleDrive(false);
    const result = typeof rawGoogleChooseDay === 'function'
      ? rawGoogleChooseDay.call(googleObject, day)
      : undefined;
    setTimeout(wireGoogleShell, 20);
    return result;
  }

  // Patch the public Google API before the renderer switcher snapshots it.
  // The old module's DOM handlers are also replaced in wireGoogleShell because
  // they close over the legacy functions directly.
  googleObject.onVisualizeTabActivated = patchedGoogleActivate;
  googleObject.chooseVisualizeDay = patchedGoogleChooseDay;
  googleObject.startRouteFlyThrough = startGoogleDrive;
  googleObject.cancelRouteFlyThrough = stopGoogleDrive;
  googleObject.togglePauseFlyThrough = toggleGooglePause;
  googleObject.setFlightSpeed = setGoogleSpeed;
  googleObject.setWorldCameraMode = setGoogleMode;
  googleObject.skipFlightLeg = skipGoogleStop;

  const googlePatchedOnActivate = googleObject.onVisualizeTabActivated;
  const googlePatchedChooseDay = googleObject.chooseVisualizeDay;
  const googleOriginal = {
    onVisualizeTabActivated: googlePatchedOnActivate.bind(googleObject),
    chooseVisualizeDay: googlePatchedChooseDay.bind(googleObject),
    cancelRouteFlyThrough: stopGoogleDrive,
    toggleMapOnly: typeof rawGoogleToggleMapOnly === 'function'
      ? rawGoogleToggleMapOnly.bind(googleObject) : null
  };

  function captureFreeApi() {
    if (freeApi || !root.Visualize3D) return;
    const current = root.Visualize3D;
    if (current.onVisualizeTabActivated === googlePatchedOnActivate &&
        current.chooseVisualizeDay === googlePatchedChooseDay) return;
    if (typeof current.onVisualizeTabActivated !== 'function') return;
    freeApi = {
      onVisualizeTabActivated: current.onVisualizeTabActivated.bind(current),
      chooseVisualizeDay: typeof current.chooseVisualizeDay === 'function'
        ? current.chooseVisualizeDay.bind(current) : null,
      cancelRouteFlyThrough: typeof current.cancelRouteFlyThrough === 'function'
        ? current.cancelRouteFlyThrough.bind(current) : null
    };
  }

  function ensureStyle() {
    if (document.getElementById('rockiesRendererSwitcherStyle')) return;
    const style = document.createElement('style');
    style.id = 'rockiesRendererSwitcherStyle';
    style.textContent = `
      #visualizeview{position:relative}
      .rockies-renderer-switcher{position:absolute;z-index:1200;top:10px;right:58px;display:flex;align-items:center;gap:3px;padding:3px;background:rgba(5,17,26,.90);border:1px solid rgba(255,255,255,.18);border-radius:10px;box-shadow:0 5px 18px rgba(0,0,0,.34);backdrop-filter:blur(12px)}
      .rockies-renderer-switcher button{border:1px solid transparent;background:transparent;color:#a9bfce;border-radius:7px;padding:6px 9px;font:700 10.5px/1.1 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
      .rockies-renderer-switcher button:hover{color:#fff;background:rgba(255,255,255,.07)}
      .rockies-renderer-switcher button.active{color:#fff;background:#173d54;border-color:#4d7894}
      .rockies-renderer-switcher button[data-rockies-renderer="google"].active{background:#2c4563;border-color:#6a91bd}
      .rockies-renderer-cost{font-size:9px;color:#8ea7b8;padding:0 4px 0 2px;white-space:nowrap}
      #visualizeview .vis-world-status:not(.hidden){z-index:1150}
      @media(max-width:720px){.rockies-renderer-switcher{top:7px;right:7px}.rockies-renderer-switcher button{padding:6px 7px}.rockies-renderer-cost{display:none}}
    `;
    document.head.appendChild(style);
  }

  function setButtonState(host) {
    if (!host) return;
    host.querySelectorAll('[data-rockies-renderer]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.rockiesRenderer === renderer);
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
    });
  }

  function injectSwitcher() {
    const view = document.getElementById('visualizeview');
    if (!view) return;
    captureFreeApi();
    ensureStyle();

    let host = view.querySelector('.rockies-renderer-switcher');
    if (!host) {
      host = document.createElement('div');
      host.className = 'rockies-renderer-switcher';
      host.setAttribute('role', 'group');
      host.setAttribute('aria-label', '3D renderer');
      host.innerHTML = `
        <button type="button" data-rockies-renderer="open">Open World</button>
        <button type="button" data-rockies-renderer="google" title="Google Maps 3D photorealistic imagery; API key/billing may be required">Google 3D</button>
        <span class="rockies-renderer-cost">Google optional</span>
      `;
      host.addEventListener('click', function (event) {
        const button = event.target && event.target.closest ? event.target.closest('[data-rockies-renderer]') : null;
        if (!button) return;
        if (button.dataset.rockiesRenderer === 'google') switchToGoogle();
        else switchToOpen();
      });
      view.appendChild(host);
    }
    setButtonState(host);
  }

  function clearVisualizeView() {
    const view = document.getElementById('visualizeview');
    if (!view) return null;
    captureCurrentMap();
    const switcher = view.querySelector('.rockies-renderer-switcher');
    if (switcher) switcher.remove();
    view.innerHTML = '';
    return view;
  }

  function switchToGoogle() {
    if (renderer === 'google') return;
    captureFreeApi();
    rememberedDay = selectedDay();
    try {
      if (root.VisualizeWorld && typeof root.VisualizeWorld.stop === 'function') root.VisualizeWorld.stop(false);
    } catch (_) {}
    try {
      if (freeApi && freeApi.cancelRouteFlyThrough) freeApi.cancelRouteFlyThrough(false);
    } catch (_) {}

    renderer = 'google';
    clearVisualizeView();
    googleOriginal.onVisualizeTabActivated();
    if (rememberedDay && googleOriginal.chooseVisualizeDay) {
      setTimeout(function () {
        try { googleOriginal.chooseVisualizeDay(rememberedDay); } catch (_) {}
      }, 100);
    }
    [30, 180, 600, 1200].forEach(function (delay) {
      setTimeout(function () {
        ensureGoogleMapAttached();
        wireGoogleShell();
        injectSwitcher();
      }, delay);
    });
  }

  function switchToOpen() {
    if (renderer === 'open') return;
    rememberedDay = selectedDay();
    stopGoogleDrive(false);
    captureFreeApi();
    renderer = 'open';
    clearVisualizeView();

    if (freeApi && freeApi.onVisualizeTabActivated) {
      freeApi.onVisualizeTabActivated();
      if (rememberedDay && freeApi.chooseVisualizeDay) {
        setTimeout(function () {
          try { freeApi.chooseVisualizeDay(rememberedDay); } catch (_) {}
        }, 30);
      }
    }
    setTimeout(injectSwitcher, 30);
    setTimeout(injectSwitcher, 350);
  }

  function watch() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.from(mutation.addedNodes || []).forEach(captureMapFromNode);
        Array.from(mutation.removedNodes || []).forEach(captureMapFromNode);
      });
      captureFreeApi();
      scheduleWire();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  root.ROCKIES_GOOGLE_DRIVE = {
    isActive: function () { return googleDrive.active; },
    getMode: function () { return googleDrive.mode; },
    getProgress: function () { return googleDrive.progress; },
    start: startGoogleDrive,
    stop: stopGoogleDrive,
    setMode: setGoogleMode,
    setSpeed: setGoogleSpeed,
    resetView: resetManualControls
  };

  root.ROCKIES_RENDERER_SWITCHER = {
    getRenderer: function () { return renderer; },
    switchToGoogle: switchToGoogle,
    switchToOpen: switchToOpen,
    googleRenderer: 'Google Maps JavaScript API 3D Maps',
    googleMayRequireBilling: true
  };

  ensureStyle();
  watch();
  setTimeout(injectSwitcher, 0);
  setTimeout(injectSwitcher, 400);
})(typeof window !== 'undefined' ? window : null);
