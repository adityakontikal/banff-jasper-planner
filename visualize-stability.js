/* visualize-stability.js
 * Stability + interaction guard for the free MapLibre terrain renderer.
 *
 * Goals:
 * - coherent DEM rendering (no synthetic terrain, no skirt walls, no z13 overzoom)
 * - Mac trackpad gestures that feel like a 3D viewport
 * - manual zoom/pitch/look offsets that survive Drive playback
 * - very smooth route-following cameras with mode-specific composition
 * - low-angle drone landmark orbit until the user interrupts
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
    // Road: low, forward-looking, close to the route. Strong filtering prevents
    // tiny OSRM line wiggles from becoming steering-wheel camera shakes.
    road: {
      zoom: 14.55,
      pitch: 70,
      centerRate: 0.95,
      bearingRate: 0.80,
      bearingDeadband: 1.35,
      maxTurnRate: 17
    },
    // Scenic: higher drone chase. It should float above the corridor rather than
    // trace every bend. The long visual horizon is the point of this mode.
    scenic: {
      zoom: 12.55,
      pitch: 66,
      centerRate: 0.68,
      bearingRate: 0.62,
      bearingDeadband: 1.9,
      maxTurnRate: 9
    },
    // Aerial was already the strongest view; keep its broad context but lower the
    // horizon slightly and smooth it enough to feel like a deliberate helicopter shot.
    aerial: {
      zoom: 11.35,
      pitch: 57,
      centerRate: 1.05,
      bearingRate: 0.86,
      bearingDeadband: 1.1,
      maxTurnRate: 12
    }
  };

  const manual = {
    zoomDelta: 0,
    pitchDelta: 0,
    bearingDelta: 0,
    autoCenter: null,
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
    pitch: 69,
    zoom: 12.75,
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

  function smoothCenter(previous, next, alpha) {
    if (!previous || !Array.isArray(next)) return Array.isArray(next) ? next.slice() : next;
    return [
      previous[0] + (next[0] - previous[0]) * alpha,
      previous[1] + (next[1] - previous[1]) * alpha
    ];
  }

  function status() {
    try { return World.getStatus ? World.getStatus() : {}; } catch (_) { return {}; }
  }

  function presetFor(mode) {
    return DRIVE_PRESETS[mode] || DRIVE_PRESETS.scenic;
  }

  function resetAutoSmoothing() {
    manual.autoCenter = null;
    manual.autoBearing = null;
    manual.lastAutoAt = 0;
  }

  function smoothDriveBearing(previous, target, dt, preset) {
    const normalizedTarget = normalizeHeading(target);
    if (!Number.isFinite(previous)) return normalizedTarget;

    let delta = shortestHeadingDelta(previous, normalizedTarget);
    if (Math.abs(delta) <= preset.bearingDeadband) return normalizeHeading(previous);

    // Remove the deadband portion instead of snapping across it.
    delta -= Math.sign(delta) * preset.bearingDeadband;
    const alpha = 1 - Math.exp(-preset.bearingRate * dt);
    let step = delta * alpha;
    const maxStep = preset.maxTurnRate * dt;
    step = clamp(step, -maxStep, maxStep);
    return normalizeHeading(previous + step);
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
    orbit.bearing = normalizeHeading(orbit.bearing + 3.4 * dt);
    try {
      map.jumpTo({
        center: orbit.target,
        bearing: orbit.bearing,
        pitch: orbit.pitch,
        zoom: orbit.zoom
      });
    } catch (_) {}
    orbit.frame = requestAnimationFrame(function (nextNow) { orbitLoop(map, token, nextNow); });
  }

  function beginOrbitAfterFly(map, target, bearing, pitch, zoom) {
    stopOrbit();
    const token = ++orbit.token;
    orbit.target = target.slice();
    orbit.bearing = normalizeHeading(bearing);
    orbit.pitch = clamp(pitch, 58, 72);
    orbit.zoom = clamp(zoom, 11.7, 13.4);

    let started = false;
    function start() {
      if (started || token !== orbit.token) return;
      started = true;
      orbit.active = true;
      orbit.lastAt = 0;
      orbit.frame = requestAnimationFrame(function (now) { orbitLoop(map, token, now); });
    }

    try { map.once('moveend', start); } catch (_) {}
    // moveend can be swallowed if a previous animation was interrupted.
    setTimeout(start, 2100);
  }

  function applyManualDelta(map, kind, delta) {
    stopOrbit();
    const st = status();
    const active = !!st.active;

    if (kind === 'zoom') {
      if (active) {
        manual.zoomDelta = clamp(manual.zoomDelta + delta, -3.0, 1.5);
      } else {
        try { map.zoomTo(clamp(map.getZoom() + delta, 5, 15), { duration: 0 }); } catch (_) {}
      }
    } else if (kind === 'pitch') {
      if (active) {
        manual.pitchDelta = clamp(manual.pitchDelta + delta, -45, 18);
      } else {
        try { map.setPitch(clamp(map.getPitch() + delta, 0, 72)); } catch (_) {}
      }
    } else if (kind === 'bearing') {
      if (active) {
        manual.bearingDelta = clamp(manual.bearingDelta + delta, -150, 150);
      } else {
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

    // Mac/Chrome pinch is exposed as ctrlKey WheelEvent. Ordinary two-finger
    // vertical movement changes pitch; horizontal movement rotates the view.
    canvas.addEventListener('wheel', function (event) {
      if (!event) return;
      const ax = Math.abs(Number(event.deltaX || 0));
      const ay = Math.abs(Number(event.deltaY || 0));

      if (event.ctrlKey) {
        event.preventDefault();
        const amount = clamp(-Number(event.deltaY || 0) * 0.018, -0.34, 0.34);
        applyManualDelta(map, 'zoom', amount);
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

    // Safari exposes true trackpad pinch/rotation through GestureEvent.
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

    // Clicking an actual stop marker on the terrain should behave like clicking
    // it in the sidebar: drone-fly to it and orbit until the user interrupts.
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

  function installPersistentDriveCamera(map) {
    if (!map || map.__rockiesPersistentDriveCamera) return;
    map.__rockiesPersistentDriveCamera = true;

    const nativeJumpTo = map.jumpTo.bind(map);
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
      const centerAlpha = 1 - Math.exp(-preset.centerRate * dt);

      // The source route can contain tiny geometry noise and compressed-playback
      // heading jumps. Filter both position and direction before rendering them.
      manual.autoCenter = smoothCenter(manual.autoCenter, opts.center, centerAlpha);
      manual.autoBearing = smoothDriveBearing(manual.autoBearing, Number(opts.bearing), dt, preset);

      opts.center = manual.autoCenter.slice();
      opts.zoom = clamp(preset.zoom + manual.zoomDelta, 7, 15);
      opts.pitch = clamp(preset.pitch + manual.pitchDelta, 0, 72);
      opts.bearing = normalizeHeading(manual.autoBearing + manual.bearingDelta);

      return nativeJumpTo(opts, eventData);
    };
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

      const startBearing = prof && Number.isFinite(Number(prof.bearing))
        ? Number(prof.bearing)
        : map.getBearing();
      // Lower visual perspective (high pitch) keeps the surrounding mountain wall
      // in frame while staying far enough away to read the location as a place.
      const orbitPitch = 69;
      const profileZoom = prof && Number.isFinite(Number(prof.zoom)) ? Number(prof.zoom) : 13;
      const orbitZoom = clamp(profileZoom - 0.55, 12.05, 13.15);

      try {
        map.flyTo({
          center: target,
          bearing: startBearing,
          pitch: orbitPitch,
          zoom: orbitZoom,
          duration: 1850,
          curve: 1.35,
          essential: true
        });
        beginOrbitAfterFly(map, target, startBearing, orbitPitch, orbitZoom);
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

  if (World.play) {
    const originalPlay = World.play.bind(World);
    World.play = function stablePlay(options) {
      stopOrbit();
      resetAutoSmoothing();
      return originalPlay(options);
    };
  }

  if (World.stop) {
    const originalStop = World.stop.bind(World);
    World.stop = function stableStop(restoreFit) {
      stopOrbit();
      return originalStop(restoreFit);
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
            // >60 is experimental in MapLibre, but 72 gives the low mountain
            // perspective requested while keeping a safety margin below 85.
            maxPitch: 72,
            pitchWithRotate: true,
            touchPitch: true,
            touchZoomRotate: true,
            scrollZoom: false,
            fadeDuration: 0
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
      try { map.setMaxPitch(72); } catch (_) {}

      try {
        if (map.getLayer('rockies-buildings-3d')) {
          map.setLayoutProperty('rockies-buildings-3d', 'visibility', 'none');
        }
      } catch (_) {}

      installPersistentDriveCamera(map);
      installTrackpadGestures(map);
      setTimeout(applyScenicDefaultOnce, 0);
    }
    return map;
  };

  root.ROCKIES_CAMERA_GESTURES = {
    resetViewOffsets: function () {
      manual.zoomDelta = 0;
      manual.pitchDelta = 0;
      manual.bearingDelta = 0;
      stopOrbit();
      resetAutoSmoothing();
    },
    stopOrbit: stopOrbit,
    isOrbiting: function () { return !!orbit.active; },
    getOffsets: function () {
      return {
        zoomDelta: manual.zoomDelta,
        pitchDelta: manual.pitchDelta,
        bearingDelta: manual.bearingDelta
      };
    }
  };
})(typeof window !== 'undefined' ? window : null);
