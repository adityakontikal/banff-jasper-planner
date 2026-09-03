/* visualize-world.js
 * Cinematic "virtual world" renderer for the Banff-Jasper planner.
 * CesiumJS + Google Photorealistic 3D Tiles provide a route-corridor world with
 * continuous low-altitude camera motion, real trip-time sunlight, atmosphere,
 * shadows, and terrain/surface-aware camera clearance.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VisualizeWorld = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CESIUM_VERSION = '1.145';
  const CESIUM_BASE = 'https://cesium.com/downloads/cesiumjs/releases/' + CESIUM_VERSION + '/Build/Cesium/';
  const CESIUM_JS = CESIUM_BASE + 'Cesium.js';
  const CESIUM_CSS = CESIUM_BASE + 'Widgets/widgets.css';

  let cesiumPromise = null;
  let C = null;
  let viewer = null;
  let tileset = null;
  let container = null;
  let currentApiKey = '';

  const state = {
    route: [],
    cumulative: [],
    totalDistanceMeters: 0,
    elevationProfile: null,
    stopsWithDistances: [],
    dateISO: '',
    startTime: '08:00',
    driveDurationSeconds: 0,
    timeAnchors: [],
    startJulian: null,
    active: false,
    paused: false,
    speed: 1,
    cameraMode: 'road',
    progress: 0,
    lastFrameAt: 0,
    animationFrame: 0,
    baseDurationMs: 90000,
    smoothedHeading: null,
    lastStopIndex: -1,
    handlers: {},
    routeEntityIds: []
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function normalizeHeading(value) {
    const n = Number(value) || 0;
    return ((n % 360) + 360) % 360;
  }

  function normalizeCoord(coord) {
    if (Array.isArray(coord)) return { lng: Number(coord[0]), lat: Number(coord[1]) };
    return { lng: Number(coord.lng), lat: Number(coord.lat) };
  }

  function haversineMeters(a, b) {
    const p1 = normalizeCoord(a);
    const p2 = normalizeCoord(b);
    const R = 6371008.8;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function computeBearing(a, b) {
    const p1 = normalizeCoord(a);
    const p2 = normalizeCoord(b);
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return normalizeHeading(Math.atan2(y, x) * 180 / Math.PI);
  }

  function computeCumulative(route) {
    const normalized = (route || []).map(normalizeCoord).filter(function (p) {
      return Number.isFinite(p.lat) && Number.isFinite(p.lng);
    });
    const cumulative = [0];
    let total = 0;
    for (let i = 1; i < normalized.length; i++) {
      total += haversineMeters(normalized[i - 1], normalized[i]);
      cumulative.push(total);
    }
    return { route: normalized, cumulative: cumulative, totalDistanceMeters: total };
  }

  function sampleRouteAtDistance(route, cumulative, total, distanceMeters) {
    if (!route || route.length === 0) return null;
    if (route.length === 1 || total <= 0) return { lat: route[0].lat, lng: route[0].lng, fraction: 0 };
    const d = clamp(distanceMeters, 0, total);
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (cumulative[mid] <= d) lo = mid;
      else hi = mid;
    }
    const startD = cumulative[lo];
    const endD = cumulative[hi];
    const span = Math.max(1e-6, endD - startD);
    const t = clamp((d - startD) / span, 0, 1);
    const a = route[lo];
    const b = route[hi];
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
      fraction: total ? d / total : 0,
      segmentIndex: lo
    };
  }

  function elevationAtFraction(profile, fraction) {
    const samples = profile && profile.samples ? profile.samples : [];
    if (!samples.length) return 1500;
    const f = clamp(fraction, 0, 1);
    if (f <= Number(samples[0].fraction || 0)) return Number(samples[0].elevation || 1500);
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const next = samples[i];
      const f0 = Number(prev.fraction || 0);
      const f1 = Number(next.fraction || 0);
      if (f <= f1) {
        const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
        return Number(prev.elevation || 1500) +
          (Number(next.elevation || 1500) - Number(prev.elevation || 1500)) * t;
      }
    }
    return Number(samples[samples.length - 1].elevation || 1500);
  }

  function smoothHeading(previous, next, alpha) {
    const target = normalizeHeading(next);
    if (!Number.isFinite(previous)) return target;
    let delta = ((target - previous + 540) % 360) - 180;
    return normalizeHeading(previous + delta * clamp(alpha, 0, 1));
  }

  function timeOffsetSecondsAtFraction(anchors, fraction, fallbackSeconds) {
    const list = (anchors || []).filter(function (a) {
      return Number.isFinite(Number(a.fraction)) && Number.isFinite(Number(a.elapsedSeconds));
    }).slice().sort(function (a, b) { return Number(a.fraction) - Number(b.fraction); });
    const f = clamp(fraction, 0, 1);
    if (!list.length) return Math.max(0, Number(fallbackSeconds || 0) * f);
    if (f <= Number(list[0].fraction)) return Math.max(0, Number(list[0].elapsedSeconds));
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      if (f <= Number(b.fraction)) {
        const span = Math.max(1e-9, Number(b.fraction) - Number(a.fraction));
        const t = clamp((f - Number(a.fraction)) / span, 0, 1);
        return Number(a.elapsedSeconds) + (Number(b.elapsedSeconds) - Number(a.elapsedSeconds)) * t;
      }
    }
    return Math.max(0, Number(list[list.length - 1].elapsedSeconds));
  }

  function buildTripIsoDate(dateISO, startTime) {
    const iso = String(dateISO || '2026-09-27');
    const time = /^\d{1,2}:\d{2}$/.test(String(startTime || '')) ? String(startTime) : '08:00';
    const parts = time.split(':');
    const hh = String(Number(parts[0])).padStart(2, '0');
    const mm = String(Number(parts[1])).padStart(2, '0');
    // Alberta is on MDT (UTC-06:00) during the planner's September trip.
    return iso + 'T' + hh + ':' + mm + ':00-06:00';
  }

  function solarPosition(date, latitude, longitude) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return { azimuth: 0, altitude: 0 };
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    const jd = d.getTime() / 86400000 + 2440587.5;
    const n = jd - 2451545.0;
    const meanLong = normalizeHeading(280.460 + 0.9856474 * n);
    const meanAnomaly = normalizeHeading(357.528 + 0.9856003 * n) * rad;
    const eclipticLong = (meanLong + 1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)) * rad;
    const obliquity = (23.439 - 0.0000004 * n) * rad;
    const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLong), Math.cos(eclipticLong));
    const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLong));
    const gmstHours = 18.697374558 + 24.06570982441908 * n;
    const localSidereal = normalizeHeading(gmstHours * 15 + Number(longitude || 0)) * rad;
    let hourAngle = localSidereal - rightAscension;
    while (hourAngle < -Math.PI) hourAngle += Math.PI * 2;
    while (hourAngle > Math.PI) hourAngle -= Math.PI * 2;
    const lat = Number(latitude || 0) * rad;
    const altitude = Math.asin(
      Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
    );
    const azimuth = Math.atan2(
      -Math.sin(hourAngle),
      Math.tan(declination) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle)
    );
    return {
      azimuth: normalizeHeading(azimuth * deg),
      altitude: altitude * deg
    };
  }

  function loadCesium() {
    if (C) return Promise.resolve(C);
    if (cesiumPromise) return cesiumPromise;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.reject(new Error('DOM_REQUIRED'));
    }

    cesiumPromise = new Promise(function (resolve, reject) {
      if (window.Cesium) {
        C = window.Cesium;
        resolve(C);
        return;
      }

      window.CESIUM_BASE_URL = CESIUM_BASE;

      if (!document.getElementById('rockiesCesiumCss')) {
        const css = document.createElement('link');
        css.id = 'rockiesCesiumCss';
        css.rel = 'stylesheet';
        css.href = CESIUM_CSS;
        document.head.appendChild(css);
      }

      const script = document.createElement('script');
      script.id = 'rockiesCesiumScript';
      script.src = CESIUM_JS;
      script.async = true;
      script.onload = function () {
        if (!window.Cesium) {
          cesiumPromise = null;
          reject(new Error('CESIUM_LOAD_FAILED'));
          return;
        }
        C = window.Cesium;
        resolve(C);
      };
      script.onerror = function () {
        cesiumPromise = null;
        reject(new Error('CESIUM_LOAD_FAILED'));
      };
      document.head.appendChild(script);
    });

    return cesiumPromise;
  }

  async function initialize(targetContainer, apiKey) {
    if (!targetContainer) throw new Error('WORLD_CONTAINER_MISSING');
    if (!apiKey) throw new Error('NO_API_KEY');
    container = targetContainer;
    currentApiKey = apiKey;

    await loadCesium();

    if (viewer && !viewer.isDestroyed()) {
      container.classList.remove('hidden');
      return viewer;
    }

    container.innerHTML = '';

    viewer = new C.Viewer(container, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: false,
      terrainProvider: new C.EllipsoidTerrainProvider(),
      shadows: true,
      scene3DOnly: true,
      requestRenderMode: false,
      shouldAnimate: false
    });

    viewer.scene.globe.show = false;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
    if (viewer.scene.sun) viewer.scene.sun.show = true;
    if (viewer.scene.moon) viewer.scene.moon.show = true;
    viewer.scene.light = new C.SunLight({ intensity: 2.15 });

    if (viewer.scene.atmosphere && C.DynamicAtmosphereLightingType) {
      viewer.scene.atmosphere.dynamicLighting = C.DynamicAtmosphereLightingType.SUNLIGHT;
    }
    if (viewer.scene.fog) {
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.00006;
      viewer.scene.fog.minimumBrightness = 0.04;
    }
    if (viewer.shadowMap) {
      viewer.shadowMap.enabled = true;
      viewer.shadowMap.softShadows = true;
      viewer.shadowMap.maximumDistance = 16000;
    }

    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 3;
    viewer.resolutionScale = Math.min(1.35, Math.max(0.85, Number(window.devicePixelRatio || 1)));

    if (viewer.camera.frustum && typeof viewer.camera.frustum.fov === 'number') {
      viewer.camera.frustum.fov = C.Math.toRadians(67);
      viewer.camera.frustum.near = 0.5;
    }

    const tilesUrl = 'https://tile.googleapis.com/v1/3dtiles/root.json?key=' + encodeURIComponent(apiKey);
    try {
      if (typeof C.Cesium3DTileset.fromUrl === 'function') {
        tileset = await C.Cesium3DTileset.fromUrl(tilesUrl, {
          showCreditsOnScreen: true,
          maximumScreenSpaceError: 8,
          dynamicScreenSpaceError: true,
          cacheBytes: 536870912
        });
      } else {
        tileset = new C.Cesium3DTileset({
          url: tilesUrl,
          showCreditsOnScreen: true,
          maximumScreenSpaceError: 8,
          dynamicScreenSpaceError: true
        });
      }
      viewer.scene.primitives.add(tileset);
      tileset.showCreditsOnScreen = true;
      tileset.shadows = C.ShadowMode.ENABLED;
      if (tileset.imageBasedLighting && C.Cartesian2) {
        tileset.imageBasedLighting.imageBasedLightingFactor = new C.Cartesian2(0.72, 0.58);
      }
      if (tileset.environmentMapManager) {
        tileset.environmentMapManager.atmosphereScatteringIntensity = 1.35;
      }
    } catch (err) {
      destroy();
      const wrapped = new Error('WORLD_TILES_FAILED: ' + (err && err.message ? err.message : String(err)));
      wrapped.cause = err;
      throw wrapped;
    }

    container.classList.remove('hidden');
    return viewer;
  }

  function clearEntities() {
    if (!viewer || viewer.isDestroyed()) return;
    viewer.entities.removeAll();
    state.routeEntityIds = [];
  }

  function makeRoutePositions(maxSamples) {
    if (!C || !state.route.length || state.totalDistanceMeters <= 0) return [];
    const samples = Math.max(2, Math.min(maxSamples || 1000, Math.ceil(state.totalDistanceMeters / 250)));
    const positions = [];
    for (let i = 0; i <= samples; i++) {
      const fraction = i / samples;
      const point = sampleRouteAtDistance(
        state.route,
        state.cumulative,
        state.totalDistanceMeters,
        state.totalDistanceMeters * fraction
      );
      const elevation = elevationAtFraction(state.elevationProfile, fraction);
      positions.push(C.Cartesian3.fromDegrees(point.lng, point.lat, elevation + 7));
    }
    return positions;
  }

  function loadDay(options) {
    if (!viewer || viewer.isDestroyed()) throw new Error('WORLD_NOT_INITIALIZED');
    stop(false);
    clearEntities();

    const computed = computeCumulative(options.routeCoordinates || []);
    state.route = computed.route;
    state.cumulative = computed.cumulative;
    state.totalDistanceMeters = computed.totalDistanceMeters;
    state.elevationProfile = options.elevationProfile || null;
    state.stopsWithDistances = options.stopsWithDistances || [];
    state.dateISO = options.dateISO || '';
    state.startTime = options.startTime || '08:00';
    state.driveDurationSeconds = Math.max(1, Number(options.driveDurationSeconds || 1));
    state.timeAnchors = Array.isArray(options.timeAnchors) ? options.timeAnchors.slice() : [];
    state.handlers = options.handlers || {};
    state.progress = 0;
    state.lastStopIndex = -1;
    state.smoothedHeading = null;

    const startIso = buildTripIsoDate(state.dateISO, state.startTime);
    state.startJulian = C.JulianDate.fromIso8601(startIso);
    viewer.clock.currentTime = C.JulianDate.clone(state.startJulian);

    if (state.route.length >= 2) {
      const routePositions = makeRoutePositions(1400);
      const routeEntity = viewer.entities.add({
        id: 'cinematic-world-route',
        polyline: {
          positions: routePositions,
          width: 5,
          material: C.Color.fromCssColorString('#56c6a5').withAlpha(0.86),
          arcType: C.ArcType.NONE
        }
      });
      state.routeEntityIds.push(routeEntity.id);

      state.stopsWithDistances.forEach(function (entry, index) {
        const stop = entry.stop || entry;
        const fraction = Number.isFinite(Number(entry.fraction))
          ? Number(entry.fraction)
          : (state.stopsWithDistances.length > 1 ? index / (state.stopsWithDistances.length - 1) : 0);
        const elevation = elevationAtFraction(state.elevationProfile, fraction);
        const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
        const color = isHotel
          ? C.Color.fromCssColorString('#c5a6ff')
          : (stop.priority === 'must'
            ? C.Color.fromCssColorString('#56c6a5')
            : C.Color.fromCssColorString('#68b9ff'));
        viewer.entities.add({
          id: 'cinematic-stop-' + String(stop.id || index),
          position: C.Cartesian3.fromDegrees(Number(stop.lng), Number(stop.lat), elevation + 26),
          point: {
            pixelSize: stop.priority === 'must' ? 11 : 8,
            color: color,
            outlineColor: C.Color.BLACK.withAlpha(0.8),
            outlineWidth: 2,
            disableDepthTestDistance: 22000
          },
          label: {
            text: String(index + 1) + '  ' + String(stop.name || ''),
            font: '600 13px sans-serif',
            fillColor: C.Color.WHITE,
            showBackground: true,
            backgroundColor: C.Color.fromCssColorString('#071925').withAlpha(0.82),
            pixelOffset: new C.Cartesian2(0, -24),
            distanceDisplayCondition: new C.DistanceDisplayCondition(0, 18000),
            disableDepthTestDistance: 22000
          }
        });
      });
    }

    fitRoute(0);
  }

  function fitRoute(duration) {
    if (!viewer || viewer.isDestroyed() || !state.route.length) return;
    const positions = makeRoutePositions(400);
    if (!positions.length) return;
    const sphere = C.BoundingSphere.fromPoints(positions);
    const offset = new C.HeadingPitchRange(
      C.Math.toRadians(325),
      C.Math.toRadians(-36),
      Math.max(9000, sphere.radius * 2.15)
    );
    if (duration === 0) {
      viewer.camera.viewBoundingSphere(sphere, offset);
      viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
    } else {
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: duration == null ? 1.8 : Number(duration),
        offset: offset,
        complete: function () { viewer.camera.lookAtTransform(C.Matrix4.IDENTITY); }
      });
    }
  }

  function sampleSceneHeight(point, fallbackElevation) {
    if (!viewer || !viewer.scene || !viewer.scene.sampleHeightSupported) return fallbackElevation;
    try {
      const cartographic = C.Cartographic.fromDegrees(point.lng, point.lat, fallbackElevation);
      const sampled = viewer.scene.sampleHeight(cartographic);
      return Number.isFinite(Number(sampled)) ? Number(sampled) : fallbackElevation;
    } catch (_) {
      return fallbackElevation;
    }
  }

  function getCameraSettings(mode) {
    if (mode === 'aerial') {
      return { height: 420, lookAhead: 1600, pitch: -25, fov: 58, headingAlpha: 0.12 };
    }
    if (mode === 'scenic') {
      return { height: 115, lookAhead: 650, pitch: -12, fov: 64, headingAlpha: 0.16 };
    }
    return { height: 18, lookAhead: 210, pitch: -4.5, fov: 69, headingAlpha: 0.21 };
  }

  function setCameraMode(mode) {
    const allowed = ['road', 'scenic', 'aerial'];
    state.cameraMode = allowed.indexOf(mode) === -1 ? 'road' : mode;
  }

  function setSpeed(speed) {
    state.speed = clamp(speed || 1, 0.25, 4);
  }

  function setProgress(fraction) {
    state.progress = clamp(fraction, 0, 1);
    state.smoothedHeading = null;
    state.lastStopIndex = -1;
    updateFrame(0);
  }

  function updateClock(point) {
    if (!state.startJulian) return null;
    const elapsedSeconds = timeOffsetSecondsAtFraction(
      state.timeAnchors,
      state.progress,
      state.driveDurationSeconds
    );
    const current = C.JulianDate.addSeconds(
      state.startJulian,
      elapsedSeconds,
      new C.JulianDate()
    );
    viewer.clock.currentTime = current;
    return C.JulianDate.toDate(current);
  }

  function updateStopProgress() {
    for (let i = state.lastStopIndex + 1; i < state.stopsWithDistances.length; i++) {
      const entry = state.stopsWithDistances[i];
      const fraction = Number.isFinite(Number(entry.fraction)) ? Number(entry.fraction) : 1;
      if (state.progress + 0.001 >= fraction) {
        state.lastStopIndex = i;
        if (state.handlers && typeof state.handlers.onStop === 'function') {
          state.handlers.onStop(entry.stop || entry, i);
        }
      } else {
        break;
      }
    }
  }

  function updateFrame(deltaMs) {
    if (!viewer || viewer.isDestroyed() || !state.route.length) return;

    if (state.active && !state.paused && deltaMs > 0) {
      state.progress = clamp(
        state.progress + (deltaMs * state.speed) / state.baseDurationMs,
        0,
        1
      );
    }

    const settings = getCameraSettings(state.cameraMode);
    const currentDistance = state.totalDistanceMeters * state.progress;
    const point = sampleRouteAtDistance(
      state.route,
      state.cumulative,
      state.totalDistanceMeters,
      currentDistance
    );
    const lookPoint = sampleRouteAtDistance(
      state.route,
      state.cumulative,
      state.totalDistanceMeters,
      Math.min(state.totalDistanceMeters, currentDistance + settings.lookAhead)
    );

    if (!point || !lookPoint) return;

    const fallbackElevation = elevationAtFraction(state.elevationProfile, point.fraction);
    const surfaceHeight = sampleSceneHeight(point, fallbackElevation);
    const heading = computeBearing(point, lookPoint);
    state.smoothedHeading = smoothHeading(state.smoothedHeading, heading, settings.headingAlpha);

    const destination = C.Cartesian3.fromDegrees(
      point.lng,
      point.lat,
      surfaceHeight + settings.height
    );

    if (viewer.camera.frustum && typeof viewer.camera.frustum.fov === 'number') {
      viewer.camera.frustum.fov = C.Math.toRadians(settings.fov);
      viewer.camera.frustum.near = 0.5;
    }

    viewer.camera.setView({
      destination: destination,
      orientation: {
        heading: C.Math.toRadians(state.smoothedHeading),
        pitch: C.Math.toRadians(settings.pitch),
        roll: 0
      }
    });

    const date = updateClock(point);
    updateStopProgress();

    if (state.handlers && typeof state.handlers.onProgress === 'function') {
      const sun = solarPosition(date, point.lat, point.lng);
      state.handlers.onProgress({
        progress: state.progress,
        distanceMeters: currentDistance,
        totalDistanceMeters: state.totalDistanceMeters,
        point: point,
        surfaceHeight: surfaceHeight,
        cameraHeight: settings.height,
        heading: state.smoothedHeading,
        date: date,
        sun: sun,
        cameraMode: state.cameraMode,
        speed: state.speed
      });
    }

    if (state.active && state.progress >= 1) {
      state.active = false;
      state.paused = false;
      if (state.handlers && typeof state.handlers.onEnd === 'function') {
        state.handlers.onEnd();
      }
    }
  }

  function animationLoop(now) {
    if (!state.active) return;
    const delta = state.lastFrameAt ? Math.min(80, now - state.lastFrameAt) : 0;
    state.lastFrameAt = now;
    if (!state.paused) updateFrame(delta);
    state.animationFrame = requestAnimationFrame(animationLoop);
  }

  function play(options) {
    if (!viewer || viewer.isDestroyed() || state.route.length < 2) {
      throw new Error('WORLD_DAY_NOT_READY');
    }
    const opts = options || {};
    state.cameraMode = opts.cameraMode || state.cameraMode || 'road';
    state.speed = clamp(opts.speed || state.speed || 1, 0.25, 4);
    if (Number.isFinite(Number(opts.durationMs))) {
      state.baseDurationMs = clamp(Number(opts.durationMs), 30000, 300000);
    } else {
      const km = state.totalDistanceMeters / 1000;
      state.baseDurationMs = clamp(km * 220, 50000, 165000);
    }
    state.active = true;
    state.paused = false;
    state.lastFrameAt = 0;
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    state.animationFrame = requestAnimationFrame(animationLoop);
  }

  function pause() {
    if (!state.active) return;
    state.paused = true;
  }

  function resume() {
    if (!state.active) return;
    state.paused = false;
    state.lastFrameAt = 0;
  }

  function togglePause() {
    if (!state.active) return false;
    state.paused = !state.paused;
    state.lastFrameAt = 0;
    return state.paused;
  }

  function stop(restoreFit) {
    state.active = false;
    state.paused = false;
    state.lastFrameAt = 0;
    if (state.animationFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(state.animationFrame);
    }
    state.animationFrame = 0;
    if (restoreFit) fitRoute(1.1);
  }

  function isActive() {
    return !!state.active;
  }

  function isPaused() {
    return !!state.paused;
  }

  function show() {
    if (container) container.classList.remove('hidden');
  }

  function hide() {
    if (container) container.classList.add('hidden');
  }

  function getStatus() {
    return {
      initialized: !!(viewer && !viewer.isDestroyed()),
      active: state.active,
      paused: state.paused,
      progress: state.progress,
      speed: state.speed,
      cameraMode: state.cameraMode,
      totalDistanceMeters: state.totalDistanceMeters,
      cesiumVersion: CESIUM_VERSION
    };
  }

  function destroy() {
    stop(false);
    if (viewer && !viewer.isDestroyed()) viewer.destroy();
    viewer = null;
    tileset = null;
    if (container) container.innerHTML = '';
    container = null;
    currentApiKey = '';
  }

  return {
    CESIUM_VERSION: CESIUM_VERSION,
    loadCesium: loadCesium,
    initialize: initialize,
    loadDay: loadDay,
    play: play,
    pause: pause,
    resume: resume,
    togglePause: togglePause,
    stop: stop,
    isActive: isActive,
    isPaused: isPaused,
    setSpeed: setSpeed,
    setCameraMode: setCameraMode,
    setProgress: setProgress,
    fitRoute: fitRoute,
    show: show,
    hide: hide,
    destroy: destroy,
    getStatus: getStatus,
    buildTripIsoDate: buildTripIsoDate,
    solarPosition: solarPosition,
    computeCumulative: computeCumulative,
    sampleRouteAtDistance: sampleRouteAtDistance,
    elevationAtFraction: elevationAtFraction,
    smoothHeading: smoothHeading,
    timeOffsetSecondsAtFraction: timeOffsetSecondsAtFraction,
    computeBearing: computeBearing
  };
});
