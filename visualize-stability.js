/* visualize-stability.js
 * Stability, open-world camera, and interaction guard for the free MapLibre terrain renderer.
 *
 * Goals:
 * - keep the tracked route point centered instead of letting camera smoothing lag behind it
 * - use explicit terrain-aware 3D camera positions so Drive/Scenic/Aerial stay above terrain
 * - smooth route-angle noise without flattening real turns
 * - preserve Mac trackpad/touch camera control during playback
 * - provide low-angle landmark drone orbits that stop immediately on user input
 * - style the free map more like a restrained low-poly open-world game without fabricating terrain
 */
(function (root) {
  'use strict';

  if (!root || !root.VisualizeWorld) return;
  if (root.__ROCKIES_TERRAIN_STABILITY_PATCHED) return;
  root.__ROCKIES_TERRAIN_STABILITY_PATCHED = true;

  root.ROCKIES_CONFIG = root.ROCKIES_CONFIG || {};
  if (root.ROCKIES_CONFIG.localTerrainVerified !== true) {
    root.ROCKIES_CONFIG.localTerrain = false;
    root.ROCKIES_CONFIG.terrainTileUrl = null;
    root.ROCKIES_CONFIG.terrainSource = 'aws-open-data-terrarium';
  }
  root.ROCKIES_CONFIG.terrainStabilityMode = true;
  root.ROCKIES_CONFIG.defaultWorldCamera = 'scenic';

  const World = root.VisualizeWorld;
  const originalInitialize = World.initialize.bind(World);

  const DRIVE_PRESETS = {
    road: {
      cameraDistance: 92,
      pitch: 68,
      clearance: 16,
      bearingRate: 0.78,
      bearingDeadband: 1.6,
      maxTurnRate: 14,
      fallbackLead: 78
    },
    scenic: {
      cameraDistance: 820,
      pitch: 63,
      clearance: 95,
      bearingRate: 0.52,
      bearingDeadband: 2.2,
      maxTurnRate: 7,
      fallbackLead: 150
    },
    aerial: {
      cameraDistance: 1850,
      pitch: 56,
      clearance: 220,
      bearingRate: 0.70,
      bearingDeadband: 1.4,
      maxTurnRate: 9,
      fallbackLead: 360
    }
  };

  const manual = {
    zoomDelta: 0,
    pitchDelta: 0,
    bearingDelta: 0,
    autoBearing: null,
    lastAutoAt: 0,
    gestureScale: 1,
    gestureRotation: 0,
    configuredMap: null,
    scenicDefaultApplied: false
  };

  const orbit = {
    active: false,
    frame: 0,
    token: 0,
    target: null,
    bearing: 0,
    pitch: 64,
    distance: 760,
    clearance: 110,
    lastAt: 0
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

  function status() {
    try { return World.getStatus ? World.getStatus() : {}; } catch (_) { return {}; }
  }

  function presetFor(mode) {
    return DRIVE_PRESETS[mode] || DRIVE_PRESETS.scenic;
  }

  function resetAutoSmoothing() {
    manual.autoBearing = null;
    manual.lastAutoAt = 0;
  }

  function smoothDriveBearing(previous, target, dt, preset) {
    const normalizedTarget = normalizeHeading(target);
    if (!Number.isFinite(previous)) return normalizedTarget;
    let delta = shortestHeadingDelta(previous, normalizedTarget);
    if (Math.abs(delta) <= preset.bearingDeadband) return normalizeHeading(previous);
    delta -= Math.sign(delta) * preset.bearingDeadband;
    const alpha = 1 - Math.exp(-preset.bearingRate * dt);
    let step = delta * alpha;
    const maxStep = preset.maxTurnRate * dt;
    step = clamp(step, -maxStep, maxStep);
    return normalizeHeading(previous + step);
  }

  function movePoint(origin, bearingDeg, distanceMeters) {
    const lng = Number(origin[0]);
    const lat = Number(origin[1]);
    const rad = Math.PI / 180;
    const earth = 6378137;
    const brng = Number(bearingDeg) * rad;
    const angular = Number(distanceMeters) / earth;
    const lat1 = lat * rad;
    const lng1 = lng * rad;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(brng)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
    );
    return [lng2 / rad, lat2 / rad];
  }

  function interpolateCoord(a, b, t) {
    return [
      Number(a[0]) + (Number(b[0]) - Number(a[0])) * t,
      Number(a[1]) + (Number(b[1]) - Number(a[1])) * t
    ];
  }

  function terrainHeight(map, coord, fallback) {
    try {
      if (!map || typeof map.queryTerrainElevation !== 'function') return Number(fallback || 0);
      const value = Number(map.queryTerrainElevation(coord));
      return Number.isFinite(value) ? value : Number(fallback || 0);
    } catch (_) {
      return Number(fallback || 0);
    }
  }

  function maxTerrainBetween(map, a, b, fallback) {
    let max = Number(fallback || 0);
    for (let i = 0; i <= 8; i++) {
      const point = interpolateCoord(a, b, i / 8);
      max = Math.max(max, terrainHeight(map, point, fallback));
    }
    return max;
  }

  function trackedPointFromVehicle(map, fallbackCenter, fallbackBearing, fallbackLead) {
    try {
      const source = map.getSource('rockies-vehicle');
      const data = source && source._data;
      const feature = data && data.features && data.features[0];
      const coords = feature && feature.geometry && feature.geometry.coordinates;
      if (Array.isArray(coords) && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))) {
        return [Number(coords[0]), Number(coords[1])];
      }
    } catch (_) {}
    return movePoint(fallbackCenter, normalizeHeading(fallbackBearing + 180), fallbackLead);
  }

  function safeCameraOptions(map, target, viewBearing, cameraDistance, desiredPitch, clearance) {
    const pitch = clamp(desiredPitch, 25, 70);
    const distance = Math.max(25, Number(cameraDistance));
    const cameraCoord = movePoint(target, normalizeHeading(viewBearing + 180), distance);
    const targetGround = terrainHeight(map, target, 0);
    const cameraGround = terrainHeight(map, cameraCoord, targetGround);
    const corridorGround = maxTerrainBetween(map, cameraCoord, target, Math.max(targetGround, cameraGround));
    const verticalForPitch = distance * Math.tan((90 - pitch) * Math.PI / 180);
    const targetAltitude = targetGround + 2.5;
    const cameraAltitude = Math.max(
      targetAltitude + verticalForPitch,
      cameraGround + clearance,
      corridorGround + clearance
    );

    if (typeof map.calculateCameraOptionsFromTo === 'function' && root.maplibregl && root.maplibregl.LngLat) {
      try {
        const from = new root.maplibregl.LngLat(cameraCoord[0], cameraCoord[1]);
        const to = new root.maplibregl.LngLat(target[0], target[1]);
        const options = map.calculateCameraOptionsFromTo(from, cameraAltitude, to, targetAltitude);
        options.center = target.slice();
        options.elevation = targetAltitude;
        if (Number.isFinite(Number(options.pitch))) options.pitch = clamp(options.pitch, 25, 70);
        return options;
      } catch (_) {}
    }

    return {
      center: target.slice(),
      bearing: normalizeHeading(viewBearing),
      pitch: pitch,
      zoom: clamp(16 - Math.log2(distance / 70), 8.5, 15),
      elevation: targetAltitude
    };
  }

  function stopOrbit() {
    orbit.active = false;
    orbit.token += 1;
    orbit.lastAt = 0;
    if (orbit.frame && typeof cancelAnimationFrame === 'function') {
      try { cancelAnimationFrame(orbit.frame); } catch (_) {}
    }
    orbit.frame = 0;
  }

  function orbitLoop(map, token, now) {
    if (!orbit.active || token !== orbit.token || !map || !orbit.target) return;
    const dt = orbit.lastAt ? clamp((now - orbit.lastAt) / 1000, 0.008, 0.08) : 0.016;
    orbit.lastAt = now;
    orbit.bearing = normalizeHeading(orbit.bearing + 3.0 * dt);
    try {
      const options = safeCameraOptions(map, orbit.target, orbit.bearing, orbit.distance, orbit.pitch, orbit.clearance);
      const nativeJump = map.__rockiesNativeJumpTo || map.jumpTo.bind(map);
      nativeJump(options);
    } catch (_) {}
    orbit.frame = requestAnimationFrame(function (nextNow) { orbitLoop(map, token, nextNow); });
  }

  function beginOrbitAfterFly(map, target, bearing, pitch, distance) {
    stopOrbit();
    const token = ++orbit.token;
    orbit.target = target.slice();
    orbit.bearing = normalizeHeading(bearing);
    orbit.pitch = clamp(pitch, 55, 68);
    orbit.distance = clamp(distance, 420, 1250);
    orbit.clearance = Math.max(90, orbit.distance * 0.12);

    let started = false;
    function start() {
      if (started || token !== orbit.token) return;
      started = true;
      orbit.active = true;
      orbit.lastAt = 0;
      orbit.frame = requestAnimationFrame(function (now) { orbitLoop(map, token, now); });
    }
    try { map.once('moveend', start); } catch (_) {}
    setTimeout(start, 1900);
  }

  function applyManualDelta(map, kind, delta) {
    stopOrbit();
    const st = status();
    const active = !!st.active;

    if (kind === 'zoom') {
      if (active) manual.zoomDelta = clamp(manual.zoomDelta + delta, -2.5, 2.5);
      else {
        try { map.zoomTo(clamp(map.getZoom() + delta, 5, 15), { duration: 0 }); } catch (_) {}
      }
    } else if (kind === 'pitch') {
      if (active) manual.pitchDelta = clamp(manual.pitchDelta + delta, -28, 12);
      else {
        try { map.setPitch(clamp(map.getPitch() + delta, 0, 70)); } catch (_) {}
      }
    } else if (kind === 'bearing') {
      if (active) manual.bearingDelta = clamp(manual.bearingDelta + delta, -150, 150);
      else {
        try { map.setBearing(normalizeHeading(map.getBearing() + delta)); } catch (_) {}
      }
    }
    try { map.triggerRepaint(); } catch (_) {}
  }

  function installTrackpadGestures(map) {
    if (!map || manual.configuredMap === map) return;
    manual.configuredMap = map;

    try {
      map.dragRotate.enable();
      map.keyboard.enable();
      map.touchZoomRotate.enable();
      if (map.touchZoomRotate.enableRotation) map.touchZoomRotate.enableRotation();
      map.touchPitch.enable();
      map.scrollZoom.disable();
    } catch (_) {}

    const canvas = (typeof map.getCanvasContainer === 'function' && map.getCanvasContainer()) ||
      (typeof map.getCanvas === 'function' && map.getCanvas());
    if (!canvas) return;
    canvas.style.touchAction = 'none';

    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (eventName) {
      canvas.addEventListener(eventName, stopOrbit, { passive: true });
    });

    canvas.addEventListener('wheel', function (event) {
      if (!event) return;
      const ax = Math.abs(Number(event.deltaX || 0));
      const ay = Math.abs(Number(event.deltaY || 0));
      if (event.ctrlKey) {
        event.preventDefault();
        applyManualDelta(map, 'zoom', clamp(-Number(event.deltaY || 0) * 0.018, -0.34, 0.34));
        return;
      }
      if (ax > ay * 0.72 && ax > 0.5) {
        event.preventDefault();
        applyManualDelta(map, 'bearing', clamp(Number(event.deltaX || 0) * 0.13, -5.5, 5.5));
        return;
      }
      if (ay > 0.5) {
        event.preventDefault();
        applyManualDelta(map, 'pitch', clamp(-Number(event.deltaY || 0) * 0.075, -3.6, 3.6));
      }
    }, { passive: false });

    canvas.addEventListener('gesturestart', function (event) {
      stopOrbit();
      manual.gestureScale = Number(event.scale || 1);
      manual.gestureRotation = Number(event.rotation || 0);
      if (event.preventDefault) event.preventDefault();
    }, { passive: false });

    canvas.addEventListener('gesturechange', function (event) {
      if (event.preventDefault) event.preventDefault();
      const scale = Math.max(0.01, Number(event.scale || 1));
      const previousScale = Math.max(0.01, Number(manual.gestureScale || 1));
      const zoomDelta = Math.log2(scale / previousScale) * 1.35;
      if (Math.abs(zoomDelta) > 0.001) applyManualDelta(map, 'zoom', clamp(zoomDelta, -0.45, 0.45));
      manual.gestureScale = scale;
      const rotation = Number(event.rotation || 0);
      const rotationDelta = rotation - Number(manual.gestureRotation || 0);
      if (Math.abs(rotationDelta) > 0.05) applyManualDelta(map, 'bearing', clamp(rotationDelta, -7, 7));
      manual.gestureRotation = rotation;
    }, { passive: false });

    canvas.addEventListener('gestureend', function (event) {
      manual.gestureScale = 1;
      manual.gestureRotation = 0;
      if (event && event.preventDefault) event.preventDefault();
    }, { passive: false });

    map.on('click', function (event) {
      try {
        const features = map.queryRenderedFeatures(event.point, { layers: ['rockies-stop-points'] });
        if (!features || !features.length) return;
        const feature = features[0];
        const coords = feature.geometry && feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return;
        const props = feature.properties || {};
        World.stop(false);
        World.focusLandmark({
          id: props.id,
          name: props.name || 'Scenic stop',
          lng: Number(coords[0]),
          lat: Number(coords[1])
        });
      } catch (_) {}
    });
  }

  function installTerrainAwareDriveCamera(map) {
    if (!map || map.__rockiesTerrainAwareDriveCamera) return;
    map.__rockiesTerrainAwareDriveCamera = true;
    const nativeJumpTo = map.jumpTo.bind(map);
    map.__rockiesNativeJumpTo = nativeJumpTo;

    map.jumpTo = function rockiesJumpTo(options, eventData) {
      const opts = Object.assign({}, options || {});
      const st = status();
      const isAutoDriveFrame = !!st.active && Array.isArray(opts.center) &&
        Number.isFinite(Number(opts.zoom)) && Number.isFinite(Number(opts.pitch)) &&
        Number.isFinite(Number(opts.bearing));
      if (!isAutoDriveFrame) return nativeJumpTo(opts, eventData);

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const dt = manual.lastAutoAt ? clamp((now - manual.lastAutoAt) / 1000, 0.008, 0.08) : 0.016;
      manual.lastAutoAt = now;

      const mode = st.cameraMode || 'scenic';
      const preset = presetFor(mode);
      manual.autoBearing = smoothDriveBearing(manual.autoBearing, Number(opts.bearing), dt, preset);
      const viewBearing = normalizeHeading(manual.autoBearing + manual.bearingDelta);

      const target = trackedPointFromVehicle(map, opts.center, Number(opts.bearing), preset.fallbackLead);
      const zoomScale = Math.pow(2, -manual.zoomDelta * 0.38);
      const distance = clamp(preset.cameraDistance * zoomScale, 45, 4200);
      const pitch = clamp(preset.pitch + manual.pitchDelta, 30, 70);
      const clearance = Math.max(preset.clearance, distance * (mode === 'road' ? 0.10 : 0.08));
      const cameraOptions = safeCameraOptions(map, target, viewBearing, distance, pitch, clearance);
      return nativeJumpTo(cameraOptions, eventData);
    };
  }

  function paintIfPossible(map, layerId, property, value) {
    try {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
    } catch (_) {}
  }

  function applyOpenWorldStyle(map) {
    if (!map || map.__rockiesOpenWorldStyled) return;
    map.__rockiesOpenWorldStyled = true;
    try { map.setTerrain({ source: 'rockies-terrain-dem', exaggeration: 1.03 }); } catch (_) {}

    const style = map.getStyle && map.getStyle();
    const layers = style && Array.isArray(style.layers) ? style.layers : [];
    layers.forEach(function (layer) {
      const id = String(layer.id || '').toLowerCase();
      if (layer.type === 'symbol') {
        try {
          if (/poi|shop|amenity|address|housenumber/.test(id)) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          } else if (/place|city|town|village|road|highway|park|mount|peak|lake|river/.test(id)) {
            paintIfPossible(map, layer.id, 'text-halo-color', 'rgba(12, 24, 28, 0.82)');
            paintIfPossible(map, layer.id, 'text-halo-width', 1.2);
          }
        } catch (_) {}
      }
      if (layer.type === 'fill') {
        if (/water|lake|river/.test(id)) paintIfPossible(map, layer.id, 'fill-color', '#49a8b8');
        else if (/glacier|ice|snow/.test(id)) paintIfPossible(map, layer.id, 'fill-color', '#d7f0f4');
        else if (/wood|forest|park|landcover|landuse/.test(id)) paintIfPossible(map, layer.id, 'fill-opacity', 0.72);
      }
      if (layer.type === 'line' && /road|highway|transport/.test(id)) {
        paintIfPossible(map, layer.id, 'line-opacity', 0.88);
      }
    });
  }

  function addInterestDetailLayers(map) {
    if (!map || !map.getSource('rockies-stops') || map.__rockiesInterestLayers) return;
    map.__rockiesInterestLayers = true;
    const beforeId = (function () {
      try {
        const layers = map.getStyle().layers || [];
        const symbol = layers.find(function (layer) { return layer.type === 'symbol'; });
        return symbol && symbol.id;
      } catch (_) { return undefined; }
    })();

    try {
      map.addLayer({
        id: 'rockies-interest-zones',
        type: 'circle',
        source: 'rockies-stops',
        minzoom: 8,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 24, 15, 44],
          'circle-color': ['case', ['==', ['get', 'priority'], 'must'], 'rgba(86,198,165,0.12)', 'rgba(104,185,255,0.08)'],
          'circle-stroke-color': ['case', ['==', ['get', 'priority'], 'must'], 'rgba(86,198,165,0.58)', 'rgba(104,185,255,0.38)'],
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 15, 2]
        }
      }, beforeId);
    } catch (_) {}

    try {
      map.addLayer({
        id: 'rockies-interest-beacons',
        type: 'circle',
        source: 'rockies-stops',
        minzoom: 9,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 13, 6.5, 15, 8.5],
          'circle-color': ['case', ['==', ['get', 'priority'], 'must'], '#69d6b7', '#7ec9ff'],
          'circle-stroke-color': '#10242a',
          'circle-stroke-width': 2
        }
      }, beforeId);
    } catch (_) {}
  }

  function installLandmarkOrbit() {
    if (!World.focusLandmark || World.__rockiesLandmarkOrbitPatched) return;
    World.__rockiesLandmarkOrbitPatched = true;
    const originalFocus = World.focusLandmark.bind(World);

    World.focusLandmark = function orbitingFocusLandmark(stop, profile, arrivalDate, fraction) {
      stopOrbit();
      const prof = originalFocus(stop, profile, arrivalDate, fraction);
      const map = World.getMap ? World.getMap() : null;
      if (!map || !stop) return prof;

      const stopLng = Number(stop.lng != null ? stop.lng : stop.lon);
      const stopLat = Number(stop.lat);
      const profileCenter = prof && Array.isArray(prof.center) ? prof.center : null;
      const target = Number.isFinite(stopLng) && Number.isFinite(stopLat)
        ? [stopLng, stopLat]
        : (profileCenter ? profileCenter.slice(0, 2) : null);
      if (!target) return prof;

      const startBearing = prof && Number.isFinite(Number(prof.bearing)) ? Number(prof.bearing) : map.getBearing();
      const distance = clamp((prof && Number(prof.zoom) >= 14 ? 520 : 760), 450, 980);
      const pitch = 64;
      const safe = safeCameraOptions(map, target, startBearing, distance, pitch, Math.max(100, distance * 0.13));
      try {
        map.stop();
        map.flyTo(Object.assign({}, safe, {
          duration: 1650,
          curve: 1.25,
          essential: true
        }));
        beginOrbitAfterFly(map, target, startBearing, pitch, distance);
      } catch (_) {}
      return prof;
    };
  }

  function applyScenicDefaultOnce() {
    if (manual.scenicDefaultApplied) return;
    const scenic = document.querySelector('[data-free-camera="scenic"]');
    if (!scenic) return;
    manual.scenicDefaultApplied = true;
    scenic.click();
  }

  if (World.setCameraMode) {
    const originalSetCameraMode = World.setCameraMode.bind(World);
    World.setCameraMode = function stableSetCameraMode(mode) {
      stopOrbit();
      resetAutoSmoothing();
      return originalSetCameraMode(mode);
    };
  }

  if (World.setProgress) {
    const originalSetProgress = World.setProgress.bind(World);
    World.setProgress = function stableSetProgress(fraction) {
      stopOrbit();
      resetAutoSmoothing();
      return originalSetProgress(fraction);
    };
  }

  installLandmarkOrbit();

  World.initialize = async function stableInitialize(targetContainer) {
    const ML = await World.loadMapLibre();
    if (ML && !ML.__rockiesStableMapPatched) {
      ML.__rockiesStableMapPatched = true;
      const OriginalMap = ML.Map;
      ML.Map = class RockiesStableMap extends OriginalMap {
        constructor(options) {
          super(Object.assign({}, options || {}, {
            terrainSkirtLength: 'none',
            maxZoom: 15,
            maxPitch: 70,
            pitchWithRotate: true,
            touchPitch: true,
            touchZoomRotate: true,
            scrollZoom: false,
            fadeDuration: 0,
            centerClampedToGround: true
          }));
          const nativeAddSource = this.addSource.bind(this);
          this.addSource = function addStableSource(id, spec) {
            let next = spec;
            if (id === 'rockies-terrain-dem' && spec && spec.type === 'raster-dem') {
              next = Object.assign({}, spec, {
                minzoom: 1,
                maxzoom: 15,
                tileSize: 256,
                encoding: 'terrarium'
              });
            }
            return nativeAddSource(id, next);
          };
        }
      };
    }

    const map = await originalInitialize(targetContainer);
    if (map) {
      try { map.setMaxZoom(15); } catch (_) {}
      try { map.setMaxPitch(70); } catch (_) {}
      try {
        if (map.getLayer('rockies-buildings-3d')) map.setLayoutProperty('rockies-buildings-3d', 'visibility', 'none');
      } catch (_) {}
      installTerrainAwareDriveCamera(map);
      installTrackpadGestures(map);
      applyOpenWorldStyle(map);
      addInterestDetailLayers(map);
      try {
        map.on('idle', function () {
          applyOpenWorldStyle(map);
          addInterestDetailLayers(map);
        });
      } catch (_) {}
      setTimeout(applyScenicDefaultOnce, 0);
    }
    return map;
  };

  root.ROCKIES_CAMERA_GESTURES = {
    resetViewOffsets: function () {
      manual.zoomDelta = 0;
      manual.pitchDelta = 0;
      manual.bearingDelta = 0;
      resetAutoSmoothing();
    },
    getOffsets: function () {
      return {
        zoomDelta: manual.zoomDelta,
        pitchDelta: manual.pitchDelta,
        bearingDelta: manual.bearingDelta
      };
    },
    stopOrbit: stopOrbit,
    isOrbiting: function () { return !!orbit.active; }
  };
})(typeof window !== 'undefined' ? window : null);
