/* visualize-camera-rigs.js
 * Final interactive camera-rig layer for the free Rockies world.
 *
 * Owns active Drive camera composition and controls. Terrain stability remains
 * in visualize-stability.js; this layer restores game-like manual camera control
 * while the route continues moving underneath it.
 */
(function (root) {
  'use strict';

  if (!root || !root.VisualizeWorld) return;
  if (root.__ROCKIES_CAMERA_RIGS_PATCHED) return;
  root.__ROCKIES_CAMERA_RIGS_PATCHED = true;

  const World = root.VisualizeWorld;
  const originalInitialize = World.initialize.bind(World);
  const originalPlay = World.play.bind(World);
  const originalSetSpeed = World.setSpeed.bind(World);
  const originalLoadDay = World.loadDay.bind(World);

  const RIGS = {
    road: {
      backDistance: 7,
      focusLead: 22,
      eyeClearance: 3.6,
      corridorClearance: 0,
      lookLift: 1.4,
      bearingRate: 0.92,
      bearingDeadband: 1.35,
      maxTurnRate: 6.5,
      minDistanceScale: 0.55,
      maxDistanceScale: 4.0,
      panMetersPerPixel: 0.12,
      maxPanMeters: 260,
      fallbackZoom: 16.1,
      fallbackPitch: 80,
      headingSampleMeters: 7
    },
    scenic: {
      backDistance: 620,
      focusLead: 95,
      eyeClearance: 185,
      corridorClearance: 120,
      lookLift: 8,
      bearingRate: 0.34,
      bearingDeadband: 2.4,
      maxTurnRate: 3.0,
      minDistanceScale: 0.42,
      maxDistanceScale: 2.8,
      panMetersPerPixel: 1.2,
      maxPanMeters: 3200,
      fallbackZoom: 12.4,
      fallbackPitch: 69,
      headingSampleMeters: 28
    },
    aerial: {
      backDistance: 3600,
      focusLead: 520,
      eyeClearance: 1320,
      corridorClearance: 900,
      lookLift: 45,
      bearingRate: 0.18,
      bearingDeadband: 4.0,
      maxTurnRate: 1.5,
      minDistanceScale: 0.48,
      maxDistanceScale: 2.6,
      panMetersPerPixel: 5.0,
      maxPanMeters: 14000,
      fallbackZoom: 9.7,
      fallbackPitch: 61,
      headingSampleMeters: 80
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
    manualGuardTimer: 0,
    canvas: null,
    headingAnchor: null,
    motionBearing: null
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

  function status() {
    try { return World.getStatus ? World.getStatus() : {}; } catch (_) { return {}; }
  }

  function activeRig() {
    const mode = status().cameraMode;
    return RIGS[mode] || RIGS.scenic;
  }

  function resetControls() {
    controls.yawDeg = 0;
    controls.lookDeg = 0;
    controls.distanceScale = 1;
    controls.panRightMeters = 0;
    controls.panForwardMeters = 0;
    controls.pointerActive = false;
    controls.pointerId = null;
    controls.rotatePointer = false;
    try {
      if (root.ROCKIES_CAMERA_GESTURES && typeof root.ROCKIES_CAMERA_GESTURES.resetViewOffsets === 'function') {
        root.ROCKIES_CAMERA_GESTURES.resetViewOffsets();
      }
    } catch (_) {}
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

  function maxTerrainBetween(map, from, to, fallback, samples) {
    let maximum = Number(fallback || 0);
    const count = Math.max(4, Number(samples || 12));
    for (let i = 0; i <= count; i++) {
      maximum = Math.max(maximum, terrainHeight(map, interpolateCoord(from, to, i / count), fallback));
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
    if (Array.isArray(fallbackCenter)) return fallbackCenter.slice();
    return [Number(fallbackCenter.lng), Number(fallbackCenter.lat)];
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

  function sampledMotionBearing(vehicle, fallbackBearing, rig) {
    if (!camera.headingAnchor) {
      camera.headingAnchor = vehicle.slice();
      camera.motionBearing = normalizeHeading(fallbackBearing);
      return camera.motionBearing;
    }
    const travelled = haversineMeters(camera.headingAnchor, vehicle);
    if (travelled >= rig.headingSampleMeters) {
      camera.motionBearing = bearingBetween(camera.headingAnchor, vehicle);
      camera.headingAnchor = vehicle.slice();
    }
    return Number.isFinite(camera.motionBearing) ? camera.motionBearing : normalizeHeading(fallbackBearing);
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

  function applyPan(point, viewBearing, rig) {
    const maxPan = rig.maxPanMeters;
    const forward = clamp(controls.panForwardMeters, -maxPan, maxPan);
    const right = clamp(controls.panRightMeters, -maxPan, maxPan);
    let shifted = movePoint(point, viewBearing, forward);
    shifted = movePoint(shifted, viewBearing + 90, right);
    return shifted;
  }

  function cameraOptionsForRig(map, vehicle, routeBearing, rig) {
    const viewBearing = normalizeHeading(routeBearing + controls.yawDeg);
    const distanceScale = clamp(controls.distanceScale, rig.minDistanceScale, rig.maxDistanceScale);
    const orbitCenter = applyPan(vehicle, viewBearing, rig);
    const yawFromRoute = Math.abs(shortestHeadingDelta(routeBearing, viewBearing));
    const leadFactor = clamp(Math.cos(Math.min(90, yawFromRoute) * Math.PI / 180), 0, 1);
    const focus = movePoint(orbitCenter, routeBearing, rig.focusLead * leadFactor);
    const backDistance = rig.backDistance * distanceScale;
    const fromCoord = movePoint(orbitCenter, viewBearing + 180, backDistance);

    const vehicleGround = terrainHeight(map, orbitCenter, 0);
    const cameraGround = terrainHeight(map, fromCoord, vehicleGround);
    const focusGround = terrainHeight(map, focus, vehicleGround);
    let cameraAltitude = Math.max(cameraGround + rig.eyeClearance, vehicleGround + rig.eyeClearance);

    if (rig.corridorClearance > 0) {
      const sampleCount = rig === RIGS.aerial ? 24 : 14;
      const corridorGround = maxTerrainBetween(map, fromCoord, focus, Math.max(cameraGround, focusGround), sampleCount);
      cameraAltitude = Math.max(cameraAltitude, corridorGround + rig.corridorClearance);
    }

    const horizontal = Math.max(8, backDistance + rig.focusLead * leadFactor);
    const lookMetersPerDegree = Math.max(0.45, horizontal * 0.012);
    const lookOffset = controls.lookDeg * lookMetersPerDegree;
    const floorBelowTerrain = rig === RIGS.road ? 5 : Math.min(450, horizontal * 0.15);
    let targetAltitude = Math.max(focusGround - floorBelowTerrain, focusGround + rig.lookLift + lookOffset);
    targetAltitude = Math.min(targetAltitude, cameraAltitude - 0.5);

    try {
      if (typeof map.calculateCameraOptionsFromTo === 'function' && root.maplibregl && root.maplibregl.LngLat) {
        const from = new root.maplibregl.LngLat(fromCoord[0], fromCoord[1]);
        const to = new root.maplibregl.LngLat(focus[0], focus[1]);
        const options = map.calculateCameraOptionsFromTo(from, cameraAltitude, to, targetAltitude);
        options.elevation = targetAltitude;
        return options;
      }
    } catch (_) {}

    return {
      center: focus.slice(),
      elevation: targetAltitude,
      bearing: viewBearing,
      pitch: clamp(rig.fallbackPitch + controls.lookDeg * 0.35, 20, 82),
      zoom: clamp(rig.fallbackZoom - Math.log2(distanceScale), 5.5, 16.5)
    };
  }

  function styleRouteForOpenWorld(map) {
    if (!map) return;
    try {
      if (map.getSource('rockies-route') && !map.getLayer('rockies-route-glow')) {
        map.addLayer({
          id: 'rockies-route-glow',
          type: 'line',
          source: 'rockies-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': 'rgba(255, 92, 48, 0.30)',
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 7, 12, 11, 16, 17],
            'line-blur': 2.2
          }
        }, map.getLayer('rockies-route-casing') ? 'rockies-route-casing' : undefined);
      }
      if (map.getLayer('rockies-route-casing')) {
        map.setPaintProperty('rockies-route-casing', 'line-color', 'rgba(27, 11, 8, 0.92)');
        map.setPaintProperty('rockies-route-casing', 'line-width', ['interpolate', ['linear'], ['zoom'], 7, 4.5, 12, 6.5, 16, 9.0]);
      }
      if (map.getLayer('rockies-route-line')) {
        map.setPaintProperty('rockies-route-line', 'line-color', '#ff5c30');
        map.setPaintProperty('rockies-route-line', 'line-opacity', 0.98);
        map.setPaintProperty('rockies-route-line', 'line-width', ['interpolate', ['linear'], ['zoom'], 7, 2.8, 12, 4.2, 16, 5.8]);
      }
      if (map.getLayer('rockies-vehicle-halo')) {
        map.setPaintProperty('rockies-vehicle-halo', 'circle-color', 'rgba(255, 92, 48, 0.24)');
        map.setPaintProperty('rockies-vehicle-halo', 'circle-stroke-color', 'rgba(255, 116, 70, 0.90)');
      }
      if (map.getLayer('rockies-vehicle-puck')) {
        map.setPaintProperty('rockies-vehicle-puck', 'circle-stroke-color', '#ff5c30');
      }
    } catch (_) {}
  }

  function activeEvent(event) {
    if (!status().active) return false;
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
    return true;
  }

  function installDriveInteractions(map) {
    if (!map || map.__rockiesDriveInteractions) return;
    map.__rockiesDriveInteractions = true;
    const canvas = (typeof map.getCanvasContainer === 'function' && map.getCanvasContainer()) || map.getCanvas();
    if (!canvas) return;
    camera.canvas = canvas;
    canvas.style.touchAction = 'none';
    canvas.tabIndex = canvas.tabIndex >= 0 ? canvas.tabIndex : 0;

    canvas.addEventListener('wheel', function (event) {
      if (!activeEvent(event)) return;
      const dx = Number(event.deltaX || 0);
      const dy = Number(event.deltaY || 0);
      const rig = activeRig();
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
        controls.yawDeg += dx * 0.22;
        if (Math.abs(controls.yawDeg) > 7200) controls.yawDeg %= 360;
      }
      if (Math.abs(dy) > 0.2) {
        controls.lookDeg = clamp(controls.lookDeg - dy * 0.055, -24, 24);
      }
    }, { passive: false, capture: true });

    canvas.addEventListener('gesturestart', function (event) {
      if (!activeEvent(event)) return;
      controls.gestureScale = Math.max(0.01, Number(event.scale || 1));
      controls.gestureRotation = Number(event.rotation || 0);
    }, { passive: false, capture: true });

    canvas.addEventListener('gesturechange', function (event) {
      if (!activeEvent(event)) return;
      const rig = activeRig();
      const scale = Math.max(0.01, Number(event.scale || 1));
      const ratio = scale / Math.max(0.01, controls.gestureScale);
      controls.distanceScale = clamp(controls.distanceScale / Math.pow(ratio, 0.90), rig.minDistanceScale, rig.maxDistanceScale);
      controls.gestureScale = scale;
      const rotation = Number(event.rotation || 0);
      controls.yawDeg += rotation - controls.gestureRotation;
      controls.gestureRotation = rotation;
    }, { passive: false, capture: true });

    canvas.addEventListener('gestureend', function (event) {
      if (!activeEvent(event)) return;
      controls.gestureScale = 1;
      controls.gestureRotation = 0;
    }, { passive: false, capture: true });

    canvas.addEventListener('pointerdown', function (event) {
      if (!status().active) return;
      if (event.button !== 0 && event.button !== 2) return;
      activeEvent(event);
      controls.pointerActive = true;
      controls.pointerId = event.pointerId;
      controls.pointerX = event.clientX;
      controls.pointerY = event.clientY;
      controls.rotatePointer = event.button === 2 || event.ctrlKey || event.metaKey;
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    }, { passive: false, capture: true });

    canvas.addEventListener('pointermove', function (event) {
      if (!controls.pointerActive || event.pointerId !== controls.pointerId || !status().active) return;
      activeEvent(event);
      const dx = event.clientX - controls.pointerX;
      const dy = event.clientY - controls.pointerY;
      controls.pointerX = event.clientX;
      controls.pointerY = event.clientY;
      const rig = activeRig();
      if (controls.rotatePointer) {
        controls.yawDeg += dx * 0.30;
        controls.lookDeg = clamp(controls.lookDeg - dy * 0.12, -24, 24);
      } else {
        const scale = rig.panMetersPerPixel * controls.distanceScale;
        controls.panRightMeters = clamp(controls.panRightMeters - dx * scale, -rig.maxPanMeters, rig.maxPanMeters);
        controls.panForwardMeters = clamp(controls.panForwardMeters + dy * scale, -rig.maxPanMeters, rig.maxPanMeters);
      }
    }, { passive: false, capture: true });

    function finishPointer(event) {
      if (!controls.pointerActive || event.pointerId !== controls.pointerId) return;
      if (status().active) activeEvent(event);
      try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
      controls.pointerActive = false;
      controls.pointerId = null;
      controls.rotatePointer = false;
    }
    canvas.addEventListener('pointerup', finishPointer, { passive: false, capture: true });
    canvas.addEventListener('pointercancel', finishPointer, { passive: false, capture: true });
    canvas.addEventListener('contextmenu', function (event) {
      if (status().active) activeEvent(event);
    }, { passive: false, capture: true });
  }

  function installDriveRig(map) {
    if (!map || map.__rockiesFinalCameraRig) return;
    map.__rockiesFinalCameraRig = true;
    camera.map = map;
    camera.previousJump = map.jumpTo.bind(map);
    camera.nativeJump = map.__rockiesNativeJumpTo || camera.previousJump;
    try { map.setMaxPitch(82); } catch (_) {}
    installDriveInteractions(map);

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
      const rig = RIGS[st.cameraMode] || RIGS.scenic;
      const vehicle = currentTrackedPoint(map, opts.center);
      const motionBearing = sampledMotionBearing(vehicle, Number(opts.bearing), rig);
      camera.autoBearing = smoothBearing(camera.autoBearing, motionBearing, dt, rig);
      const rigOptions = cameraOptionsForRig(map, vehicle, camera.autoBearing, rig);
      return camera.nativeJump(rigOptions, eventData);
    };

    map.on('move', function () {
      if (status().active || camera.manualGuardBusy) return;
      if (camera.manualGuardTimer) clearTimeout(camera.manualGuardTimer);
      camera.manualGuardTimer = setTimeout(function () { protectManualCamera(map); }, 100);
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
      const corridorGround = maxTerrainBetween(map, cameraCoord, centerCoord, Math.max(localGround, centerGround), 12);
      const requiredAltitude = Math.max(localGround + 12, corridorGround + 18);
      if (!Number.isFinite(currentAltitude) || currentAltitude >= requiredAltitude) return;
      camera.manualGuardBusy = true;
      if (typeof map.calculateCameraOptionsFromCameraLngLatAltRotation === 'function') {
        const safe = map.calculateCameraOptionsFromCameraLngLatAltRotation(
          cameraLngLat,
          requiredAltitude,
          map.getBearing(),
          clamp(map.getPitch(), 0, 80),
          0
        );
        camera.nativeJump(safe);
      }
      setTimeout(function () { camera.manualGuardBusy = false; }, 50);
    } catch (_) {
      camera.manualGuardBusy = false;
    }
  }

  function cinematicDurationMs(totalDistanceMeters) {
    const km = Math.max(0, Number(totalDistanceMeters || 0) / 1000);
    return clamp(km * 2500, 300000, 600000);
  }

  function effectiveEngineSpeed(requestedSpeed, totalDistanceMeters) {
    const desiredDuration = cinematicDurationMs(totalDistanceMeters);
    const engineDuration = Math.min(300000, desiredDuration);
    return clamp(Number(requestedSpeed || 1) * engineDuration / desiredDuration, 0.25, 4);
  }

  World.setSpeed = function cinematicSetSpeed(value) {
    const st = status();
    return originalSetSpeed(effectiveEngineSpeed(clamp(Number(value || 1), 0.5, 2), st.totalDistanceMeters));
  };

  World.play = function cinematicPlay(options) {
    const opts = Object.assign({}, options || {});
    const st = status();
    const requestedSpeed = clamp(Number(opts.speed || 1), 0.5, 2);
    const desiredDuration = cinematicDurationMs(st.totalDistanceMeters);
    const engineDuration = Math.min(300000, desiredDuration);
    opts.durationMs = engineDuration;
    opts.speed = effectiveEngineSpeed(requestedSpeed, st.totalDistanceMeters);
    camera.autoBearing = null;
    camera.lastAt = 0;
    camera.headingAnchor = null;
    camera.motionBearing = null;
    resetControls();
    return originalPlay(opts);
  };

  World.loadDay = function finalRigLoadDay(options) {
    const result = originalLoadDay(options);
    const map = World.getMap ? World.getMap() : camera.map;
    if (map) {
      styleRouteForOpenWorld(map);
      setTimeout(function () { styleRouteForOpenWorld(map); }, 0);
    }
    return result;
  };

  if (World.setProgress) {
    const originalSetProgress = World.setProgress.bind(World);
    World.setProgress = function finalRigSetProgress(fraction) {
      camera.autoBearing = null;
      camera.lastAt = 0;
      camera.lastTracked = null;
      camera.headingAnchor = null;
      camera.motionBearing = null;
      return originalSetProgress(fraction);
    };
  }

  if (World.setCameraMode) {
    const originalSetCameraMode = World.setCameraMode.bind(World);
    World.setCameraMode = function finalRigSetCameraMode(mode) {
      camera.autoBearing = null;
      camera.lastAt = 0;
      camera.headingAnchor = null;
      camera.motionBearing = null;
      resetControls();
      return originalSetCameraMode(mode);
    };
  }

  World.initialize = async function finalRigInitialize(targetContainer) {
    const map = await originalInitialize(targetContainer);
    if (map) {
      installDriveRig(map);
      styleRouteForOpenWorld(map);
      try { map.on('idle', function () { styleRouteForOpenWorld(map); }); } catch (_) {}
    }
    return map;
  };

  root.ROCKIES_FINAL_CAMERA_RIGS = {
    rigs: RIGS,
    cinematicDurationMs: cinematicDurationMs,
    effectiveEngineSpeed: effectiveEngineSpeed,
    resetControls: resetControls,
    getControls: function () {
      return {
        yawDeg: controls.yawDeg,
        lookDeg: controls.lookDeg,
        distanceScale: controls.distanceScale,
        panRightMeters: controls.panRightMeters,
        panForwardMeters: controls.panForwardMeters
      };
    },
    protectManualCamera: function () {
      if (camera.map) protectManualCamera(camera.map);
    }
  };
})(typeof window !== 'undefined' ? window : null);
