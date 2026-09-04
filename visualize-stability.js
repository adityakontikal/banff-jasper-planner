/* visualize-stability.js
 * Stability + interaction guard for the free MapLibre terrain renderer.
 *
 * Goals:
 * - coherent DEM rendering (no synthetic terrain, no skirt walls, no z13 overzoom)
 * - Mac trackpad gestures that feel like a 3D viewport
 * - manual zoom/pitch/look offsets that survive Drive playback
 * - a smoother Road camera, while Scenic is the default presentation mode
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

  function easeHeading(previous, target, alpha) {
    if (!Number.isFinite(previous)) return normalizeHeading(target);
    return normalizeHeading(previous + shortestHeadingDelta(previous, target) * clamp(alpha, 0, 1));
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

  function resetAutoSmoothing() {
    manual.autoCenter = null;
    manual.autoBearing = null;
    manual.lastAutoAt = 0;
  }

  function applyManualDelta(map, kind, delta) {
    const st = status();
    const active = !!st.active;

    if (kind === 'zoom') {
      if (active) {
        manual.zoomDelta = clamp(manual.zoomDelta + delta, -2.6, 1.8);
      } else {
        try { map.zoomTo(clamp(map.getZoom() + delta, 5, 15), { duration: 0 }); } catch (_) {}
      }
    } else if (kind === 'pitch') {
      if (active) {
        manual.pitchDelta = clamp(manual.pitchDelta + delta, -38, 22);
      } else {
        try { map.setPitch(clamp(map.getPitch() + delta, 0, 60)); } catch (_) {}
      }
    } else if (kind === 'bearing') {
      if (active) {
        manual.bearingDelta = clamp(manual.bearingDelta + delta, -135, 135);
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
      // Desktop wheel/trackpad is handled below so Drive can retain user offsets.
      map.scrollZoom.disable();
    } catch (_) {}

    const canvas = (typeof map.getCanvasContainer === 'function' && map.getCanvasContainer()) ||
      (typeof map.getCanvas === 'function' && map.getCanvas());
    if (!canvas) return;

    canvas.style.touchAction = 'none';

    // Mac/Chrome pinch is exposed as a ctrlKey WheelEvent. Ordinary two-finger
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
        // Natural trackpad motion: vertical two-finger movement looks up/down.
        applyManualDelta(map, 'pitch', clamp(-Number(event.deltaY || 0) * 0.075, -3.6, 3.6));
      }
    }, { passive: false });

    // Safari exposes true trackpad pinch/rotation through GestureEvent. Keep this
    // in addition to the Chrome wheel fallback above.
    canvas.addEventListener('gesturestart', function (event) {
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

      // Road receives stronger spatial/yaw damping. Scenic already has a longer
      // look-ahead and therefore needs less filtering.
      const mode = st.cameraMode || 'scenic';
      const centerRate = mode === 'road' ? 2.35 : (mode === 'scenic' ? 4.2 : 5.2);
      const bearingRate = mode === 'road' ? 2.15 : (mode === 'scenic' ? 3.8 : 4.8);
      const centerAlpha = 1 - Math.exp(-centerRate * dt);
      const bearingAlpha = 1 - Math.exp(-bearingRate * dt);

      manual.autoCenter = smoothCenter(manual.autoCenter, opts.center, centerAlpha);
      manual.autoBearing = easeHeading(manual.autoBearing, Number(opts.bearing), bearingAlpha);

      opts.center = manual.autoCenter.slice();
      opts.zoom = clamp(Number(opts.zoom) + manual.zoomDelta, 7, 15);
      opts.pitch = clamp(Number(opts.pitch) + manual.pitchDelta, 0, 60);
      opts.bearing = normalizeHeading(manual.autoBearing + manual.bearingDelta);

      return nativeJumpTo(opts, eventData);
    };
  }

  function applyScenicDefaultOnce() {
    if (manual.scenicDefaultApplied) return;
    const scenic = document.querySelector('[data-free-camera="scenic"]');
    if (!scenic) return;
    manual.scenicDefaultApplied = true;
    // Click through the real controller so its private cameraMode variable, UI,
    // and World state all agree on Scenic.
    scenic.click();
  }

  if (World.setCameraMode) {
    const originalSetCameraMode = World.setCameraMode.bind(World);
    World.setCameraMode = function stableSetCameraMode(mode) {
      resetAutoSmoothing();
      return originalSetCameraMode(mode);
    };
  }

  if (World.setProgress) {
    const originalSetProgress = World.setProgress.bind(World);
    World.setProgress = function stableSetProgress(fraction) {
      resetAutoSmoothing();
      return originalSetProgress(fraction);
    };
  }

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
            maxPitch: 60,
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
      try { map.setMaxPitch(60); } catch (_) {}

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
      resetAutoSmoothing();
    },
    getOffsets: function () {
      return {
        zoomDelta: manual.zoomDelta,
        pitchDelta: manual.pitchDelta,
        bearingDelta: manual.bearingDelta
      };
    }
  };
})(typeof window !== 'undefined' ? window : null);
