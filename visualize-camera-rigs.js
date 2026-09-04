/* visualize-camera-rigs.js
 * Final camera-rig layer for the free Rockies world.
 *
 * This layer intentionally sits after visualize-stability.js. Stability keeps
 * terrain authenticity, open-world styling and trackpad gesture state. This file
 * owns only the route-playback timescale and the three physically distinct
 * camera rigs so Road / Scenic / Aerial cannot collapse into the same framing.
 */
(function (root) {
  'use strict';

  if (!root || !root.VisualizeWorld) return;
  if (root.__ROCKIES_CAMERA_RIGS_PATCHED) return;
  root.__ROCKIES_CAMERA_RIGS_PATCHED = true;

  const World = root.VisualizeWorld;
  const originalInitialize = World.initialize.bind(World);
  const originalPlay = World.play.bind(World);

  // Intentionally very different physical camera positions.
  // Distances are horizontal metres behind the tracked route point.
  // heightAboveTerrain is a minimum camera clearance above the highest sampled
  // terrain between camera and target; it is not a fake terrain elevation.
  const RIGS = {
    road: {
      distance: 24,
      heightAboveTerrain: 7,
      minHeightAboveCameraGround: 5,
      targetLift: 2.2,
      bearingRate: 1.20,
      bearingDeadband: 0.85,
      maxTurnRate: 11,
      minDistance: 12,
      maxDistance: 95
    },
    scenic: {
      distance: 680,
      heightAboveTerrain: 220,
      minHeightAboveCameraGround: 170,
      targetLift: 5,
      bearingRate: 0.48,
      bearingDeadband: 1.8,
      maxTurnRate: 5.5,
      minDistance: 260,
      maxDistance: 1800
    },
    aerial: {
      distance: 3600,
      heightAboveTerrain: 1450,
      minHeightAboveCameraGround: 1100,
      targetLift: 20,
      bearingRate: 0.30,
      bearingDeadband: 2.4,
      maxTurnRate: 3.2,
      minDistance: 1500,
      maxDistance: 7800
    }
  };

  const camera = {
    map: null,
    previousJump: null,
    nativeJump: null,
    autoBearing: null,
    lastAt: 0,
    lastTracked: null,
    manualGuardBusy: false,
    manualGuardTimer: 0
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

  function offsets() {
    try {
      if (root.ROCKIES_CAMERA_GESTURES && typeof root.ROCKIES_CAMERA_GESTURES.getOffsets === 'function') {
        return root.ROCKIES_CAMERA_GESTURES.getOffsets() || {};
      }
    } catch (_) {}
    return { zoomDelta: 0, pitchDelta: 0, bearingDelta: 0 };
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
      const result = Number(map.queryTerrainElevation(coord));
      return Number.isFinite(result) ? result : Number(fallback || 0);
    } catch (_) {
      return Number(fallback || 0);
    }
  }

  function maxTerrainBetween(map, from, to, fallback) {
    let maximum = Number(fallback || 0);
    // More samples than the previous guard because Aerial spans kilometres.
    for (let i = 0; i <= 16; i++) {
      maximum = Math.max(maximum, terrainHeight(map, interpolateCoord(from, to, i / 16), fallback));
    }
    return maximum;
  }

  function currentTrackedPoint(map, fallbackCenter) {
    try {
      const source = map.getSource('rockies-vehicle');
      const data = source && source._data;
      const feature = data && data.features && data.features[0];
      const coords = feature && feature.geometry && feature.geometry.coordinates;
      if (Array.isArray(coords) && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))) {
        const point = [Number(coords[0]), Number(coords[1])];
        camera.lastTracked = point;
        return point;
      }
    } catch (_) {}
    if (camera.lastTracked) return camera.lastTracked.slice();
    return Array.isArray(fallbackCenter) ? fallbackCenter.slice() : [Number(fallbackCenter.lng), Number(fallbackCenter.lat)];
  }

  function smoothBearing(previous, target, dt, rig) {
    const targetHeading = normalizeHeading(target);
    if (!Number.isFinite(previous)) return targetHeading;
    let delta = shortestHeadingDelta(previous, targetHeading);
    if (Math.abs(delta) <= rig.bearingDeadband) return normalizeHeading(previous);
    delta -= Math.sign(delta) * rig.bearingDeadband;
    const alpha = 1 - Math.exp(-rig.bearingRate * dt);
    let step = delta * alpha;
    const maxStep = rig.maxTurnRate * dt;
    step = clamp(step, -maxStep, maxStep);
    return normalizeHeading(previous + step);
  }

  function cameraOptionsForRig(map, target, viewBearing, rig, gestureOffsets) {
    const zoomDelta = Number(gestureOffsets.zoomDelta || 0);
    // Positive pinch-in moves closer; pinch-out moves farther. Preserve large
    // separation between rigs even at the user's maximum gesture offset.
    const distanceScale = Math.pow(2, -zoomDelta * 0.34);
    const distance = clamp(rig.distance * distanceScale, rig.minDistance, rig.maxDistance);
    const fromCoord = movePoint(target, normalizeHeading(viewBearing + 180), distance);

    const targetGround = terrainHeight(map, target, 0);
    const cameraGround = terrainHeight(map, fromCoord, targetGround);
    const corridorGround = maxTerrainBetween(map, fromCoord, target, Math.max(targetGround, cameraGround));
    const targetAltitude = targetGround + rig.targetLift;

    // Each rig has its own actual altitude floor. This is what makes Aerial an
    // aircraft-like shot instead of simply a zoomed version of Road.
    const cameraAltitude = Math.max(
      corridorGround + rig.heightAboveTerrain,
      cameraGround + rig.minHeightAboveCameraGround,
      targetAltitude + rig.heightAboveTerrain
    );

    try {
      if (typeof map.calculateCameraOptionsFromTo === 'function' && root.maplibregl && root.maplibregl.LngLat) {
        const from = new root.maplibregl.LngLat(fromCoord[0], fromCoord[1]);
        const to = new root.maplibregl.LngLat(target[0], target[1]);
        // IMPORTANT: use the CameraOptions exactly as calculated. The previous
        // regression overwrote `center` afterwards, invalidating the from/to
        // geometry and causing the three modes to converge visually.
        const options = map.calculateCameraOptionsFromTo(from, cameraAltitude, to, targetAltitude);
        options.elevation = targetAltitude;
        return options;
      }
    } catch (_) {}

    // Conservative fallback for browsers missing calculateCameraOptionsFromTo.
    const fallbackZoom = rig === RIGS.road ? 15 : (rig === RIGS.scenic ? 12.6 : 9.8);
    const fallbackPitch = rig === RIGS.road ? 76 : (rig === RIGS.scenic ? 68 : 58);
    return {
      center: target.slice(),
      elevation: targetAltitude,
      bearing: normalizeHeading(viewBearing),
      pitch: clamp(fallbackPitch + Number(gestureOffsets.pitchDelta || 0), 20, 79),
      zoom: clamp(fallbackZoom + zoomDelta, 6, 15)
    };
  }

  function installDriveRig(map) {
    if (!map || map.__rockiesFinalCameraRig) return;
    map.__rockiesFinalCameraRig = true;
    camera.map = map;
    camera.previousJump = map.jumpTo.bind(map);
    camera.nativeJump = map.__rockiesNativeJumpTo || camera.previousJump;

    try { map.setMaxPitch(80); } catch (_) {}

    map.jumpTo = function finalRigJumpTo(options, eventData) {
      const opts = Object.assign({}, options || {});
      const st = status();
      const autoFrame = !!st.active && Array.isArray(opts.center) &&
        Number.isFinite(Number(opts.bearing)) && Number.isFinite(Number(opts.pitch)) &&
        Number.isFinite(Number(opts.zoom));

      if (!autoFrame) return camera.previousJump(opts, eventData);

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const dt = camera.lastAt ? clamp((now - camera.lastAt) / 1000, 0.008, 0.08) : 0.016;
      camera.lastAt = now;

      const mode = st.cameraMode === 'road' || st.cameraMode === 'aerial' ? st.cameraMode : 'scenic';
      const rig = RIGS[mode];
      const gestureOffsets = offsets();
      camera.autoBearing = smoothBearing(camera.autoBearing, Number(opts.bearing), dt, rig);
      const bearing = normalizeHeading(camera.autoBearing + Number(gestureOffsets.bearingDelta || 0));
      const target = currentTrackedPoint(map, opts.center);
      const rigOptions = cameraOptionsForRig(map, target, bearing, rig, gestureOffsets);

      return camera.nativeJump(rigOptions, eventData);
    };

    // If the user manually drives the free camera into terrain, correct only
    // after a short idle period. We do not fight normal gestures frame-by-frame.
    map.on('move', function () {
      if (status().active || camera.manualGuardBusy) return;
      if (camera.manualGuardTimer) clearTimeout(camera.manualGuardTimer);
      camera.manualGuardTimer = setTimeout(function () { protectManualCamera(map); }, 90);
    });
  }

  function protectManualCamera(map) {
    if (!map || status().active || camera.manualGuardBusy) return;
    if (typeof map.getFreeCameraOptions !== 'function') return;
    try {
      const free = map.getFreeCameraOptions();
      const position = free && free.position;
      if (!position || typeof position.toLngLat !== 'function' || typeof position.toAltitude !== 'function') return;
      const cameraLngLat = position.toLngLat();
      const cameraCoord = [cameraLngLat.lng, cameraLngLat.lat];
      const currentAltitude = Number(position.toAltitude());
      const center = map.getCenter();
      const centerCoord = [center.lng, center.lat];
      const localGround = terrainHeight(map, cameraCoord, 0);
      const centerGround = terrainHeight(map, centerCoord, localGround);
      const corridorGround = maxTerrainBetween(map, cameraCoord, centerCoord, Math.max(localGround, centerGround));
      const requiredAltitude = Math.max(localGround + 12, corridorGround + 18);
      if (!Number.isFinite(currentAltitude) || currentAltitude >= requiredAltitude) return;

      camera.manualGuardBusy = true;
      if (typeof map.calculateCameraOptionsFromCameraLngLatAltRotation === 'function') {
        const safe = map.calculateCameraOptionsFromCameraLngLatAltRotation(
          cameraLngLat,
          requiredAltitude,
          map.getBearing(),
          clamp(map.getPitch(), 0, 78),
          0
        );
        camera.nativeJump(safe);
      }
      setTimeout(function () { camera.manualGuardBusy = false; }, 40);
    } catch (_) {
      camera.manualGuardBusy = false;
    }
  }

  function cinematicDurationMs(totalDistanceMeters) {
    const km = Math.max(0, Number(totalDistanceMeters || 0) / 1000);
    // 1x target: roughly 1.8 seconds of screen time per route kilometre,
    // bounded to 4–15 minutes. 0.5x therefore becomes 8–30 minutes, while 2x
    // remains useful for quickly reviewing a long day.
    return clamp(km * 1800, 240000, 900000);
  }

  World.play = function cinematicPlay(options) {
    const opts = Object.assign({}, options || {});
    const st = status();
    opts.durationMs = cinematicDurationMs(st.totalDistanceMeters);
    camera.autoBearing = null;
    camera.lastAt = 0;
    return originalPlay(opts);
  };

  if (World.setProgress) {
    const originalSetProgress = World.setProgress.bind(World);
    World.setProgress = function finalRigSetProgress(fraction) {
      camera.autoBearing = null;
      camera.lastAt = 0;
      camera.lastTracked = null;
      return originalSetProgress(fraction);
    };
  }

  if (World.setCameraMode) {
    const originalSetCameraMode = World.setCameraMode.bind(World);
    World.setCameraMode = function finalRigSetCameraMode(mode) {
      camera.autoBearing = null;
      camera.lastAt = 0;
      return originalSetCameraMode(mode);
    };
  }

  World.initialize = async function finalRigInitialize(targetContainer) {
    const map = await originalInitialize(targetContainer);
    if (map) installDriveRig(map);
    return map;
  };

  root.ROCKIES_FINAL_CAMERA_RIGS = {
    rigs: RIGS,
    cinematicDurationMs: cinematicDurationMs,
    protectManualCamera: function () {
      if (camera.map) protectManualCamera(camera.map);
    }
  };
})(typeof window !== 'undefined' ? window : null);
