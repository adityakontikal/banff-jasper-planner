/* visualize-world.js
 * Zero-cost cinematic terrain world for the Banff-Jasper planner.
 *
 * Renderer: MapLibre GL JS.
 * Basemap: OpenFreeMap / OpenStreetMap vector data (no key, no billing).
 * Terrain: AWS Open Data / Mapzen Terrarium elevation tiles (no key, no billing).
 *
 * The world is deliberately stylized rather than photorealistic: real terrain elevation,
 * real roads/water/towns/buildings, terrain-following route geometry, sky/fog, sun-aware
 * hillshade and a continuously animated route-level camera.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VisualizeWorld = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAPLIBRE_VERSION = '5.24.0';
  const MAPLIBRE_JS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
  const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const TERRAIN_TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const TERRAIN_ATTRIBUTION = 'Terrain: AWS Open Data / Mapzen; Canada source data licensed under the Open Government Licence – Canada';

  let maplibrePromise = null;
  let ML = null;
  let map = null;
  let container = null;
  let mapLoaded = false;
  let initPromise = null;

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
    startDate: null,
    active: false,
    paused: false,
    speed: 1,
    cameraMode: 'road',
    progress: 0,
    lastFrameAt: 0,
    animationFrame: 0,
    baseDurationMs: 90000,
    smoothedHeading: null,
    smoothedGroundElevation: null,
    groundElevationHistory: [],
    lastDistanceMeters: 0,
    lastStopIndex: -1,
    lastLightingUpdate: 0,
    handlers: {}
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
    const cumulative = normalized.length ? [0] : [];
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
    const delta = ((target - previous + 540) % 360) - 180;
    return normalizeHeading(previous + delta * clamp(alpha, 0, 1));
  }

  function smoothValue(previous, next, alpha, maxDelta) {
    const target = Number(next);
    if (!Number.isFinite(target)) return Number.isFinite(previous) ? previous : 0;
    if (!Number.isFinite(previous)) return target;
    let delta = target - previous;
    if (Number.isFinite(maxDelta)) delta = clamp(delta, -Math.abs(maxDelta), Math.abs(maxDelta));
    return previous + delta * clamp(alpha, 0, 1);
  }

  function median(values) {
    if (!values || !values.length) return 0;
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function smoothHeadingExp(previous, target, rate, dtSeconds) {
    const normTarget = normalizeHeading(target);
    if (!Number.isFinite(previous)) return normTarget;
    const dt = clamp(Number(dtSeconds || 0.016), 0.001, 0.2);
    const r = Number.isFinite(rate) ? rate : 5.5;
    const alpha = 1 - Math.exp(-r * dt);
    const delta = ((normTarget - previous + 540) % 360) - 180;
    return normalizeHeading(previous + delta * alpha);
  }

  // Landmark scenic viewpoints with subtle yaw bias (degrees) to favor panoramic vistas
  const SCENIC_LANDMARKS = [
    // Bow Lake (Icefields Parkway northbound: lake sits to west / left)
    { lat: 51.668, lng: -116.452, radiusMeters: 2800, biasDeg: -14, name: 'Bow Lake' },
    // Peyto Lake viewpoint / Bow Summit (viewpoint is west / left)
    { lat: 51.725, lng: -116.505, radiusMeters: 2400, biasDeg: -12, name: 'Peyto Lake' },
    // Columbia Icefield / Athabasca Glacier (glacier sits southwest / west)
    { lat: 52.215, lng: -117.225, radiusMeters: 3200, biasDeg: -16, name: 'Athabasca Glacier' },
    // Medicine Lake (lake along road)
    { lat: 52.875, lng: -117.805, radiusMeters: 3000, biasDeg: 12, name: 'Medicine Lake' },
    // Maligne Lake (lake basin)
    { lat: 52.730, lng: -117.640, radiusMeters: 2500, biasDeg: -10, name: 'Maligne Lake' }
  ];

  function computeScenicYawBias(point, cameraMode) {
    if (cameraMode === 'aerial' || !point) return 0;
    for (let i = 0; i < SCENIC_LANDMARKS.length; i++) {
      const lm = SCENIC_LANDMARKS[i];
      const dist = haversineMeters(point, { lat: lm.lat, lng: lm.lng });
      if (dist < lm.radiusMeters) {
        const t = Math.cos((dist / lm.radiusMeters) * (Math.PI / 2));
        return lm.biasDeg * t;
      }
    }
    return 0;
  }

  function computeAdaptiveLookahead(route, cumulative, totalDistance, currentDistance, mode) {
    if (mode === 'aerial') return 1400;
    if (mode === 'scenic') return 550;
    if (!route || route.length < 2 || totalDistance <= 0) return 240;
    const p0 = sampleRouteAtDistance(route, cumulative, totalDistance, currentDistance);
    const p1 = sampleRouteAtDistance(route, cumulative, totalDistance, Math.min(totalDistance, currentDistance + 75));
    const p2 = sampleRouteAtDistance(route, cumulative, totalDistance, Math.min(totalDistance, currentDistance + 160));
    if (!p0 || !p1 || !p2) return 240;
    const h1 = computeBearing(p0, p1);
    const h2 = computeBearing(p1, p2);
    const turn = Math.abs(((h2 - h1 + 540) % 360) - 180);
    if (turn > 25) return 140; // tight curve / switchback
    if (turn > 10) return 220; // moderate turn
    return 360; // long straightaway
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
    return { azimuth: normalizeHeading(azimuth * deg), altitude: altitude * deg };
  }

  function loadMapLibre() {
    if (ML) return Promise.resolve(ML);
    if (maplibrePromise) return maplibrePromise;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.reject(new Error('DOM_REQUIRED'));
    }

    maplibrePromise = new Promise(function (resolve, reject) {
      if (window.maplibregl) {
        ML = window.maplibregl;
        resolve(ML);
        return;
      }

      if (!document.getElementById('rockiesMapLibreCss')) {
        const css = document.createElement('link');
        css.id = 'rockiesMapLibreCss';
        css.rel = 'stylesheet';
        css.href = MAPLIBRE_CSS;
        document.head.appendChild(css);
      }

      const script = document.createElement('script');
      script.id = 'rockiesMapLibreScript';
      script.src = MAPLIBRE_JS;
      script.async = true;
      script.onload = function () {
        if (!window.maplibregl) {
          maplibrePromise = null;
          reject(new Error('MAPLIBRE_LOAD_FAILED'));
          return;
        }
        ML = window.maplibregl;
        resolve(ML);
      };
      script.onerror = function () {
        maplibrePromise = null;
        reject(new Error('MAPLIBRE_LOAD_FAILED'));
      };
      document.head.appendChild(script);
    });

    return maplibrePromise;
  }

  function firstSymbolLayerId() {
    if (!map) return undefined;
    const style = map.getStyle();
    const layers = style && style.layers ? style.layers : [];
    const found = layers.find(function (layer) { return layer.type === 'symbol'; });
    return found ? found.id : undefined;
  }

  function firstVectorSourceId() {
    if (!map) return null;
    const sources = (map.getStyle() && map.getStyle().sources) || {};
    return Object.keys(sources).find(function (id) { return sources[id] && sources[id].type === 'vector'; }) || null;
  }

  function addOpenTerrain() {
    if (!map || map.getSource('rockies-terrain-dem')) return;

    const tileUrl = (typeof window !== 'undefined' && window.ROCKIES_CONFIG && window.ROCKIES_CONFIG.terrainTileUrl)
      ? window.ROCKIES_CONFIG.terrainTileUrl
      : TERRAIN_TILE_URL;

    const terrainSpec = {
      type: 'raster-dem',
      tiles: [tileUrl],
      tileSize: 256,
      encoding: 'terrarium',
      minzoom: 1,
      maxzoom: 15,
      attribution: TERRAIN_ATTRIBUTION
    };

    map.addSource('rockies-terrain-dem', terrainSpec);
    map.setTerrain({ source: 'rockies-terrain-dem', exaggeration: 1 });

    try {
      map.setLight({
        anchor: 'viewport',
        color: '#ffffff',
        intensity: 0.85,
        position: [1.5, 0, 32]
      });
      map.setSky({
        'sky-color': '#77a9ca',
        'horizon-color': '#d8e5e7',
        'fog-color': '#bdced2',
        'fog-ground-blend': 0.56,
        'horizon-fog-blend': 0.72,
        'sky-horizon-blend': 0.62,
        'atmosphere-blend': 0.82
      });
    } catch (_) {}
  }

  function addBuildings3D() {
    if (!map || map.getLayer('rockies-buildings-3d')) return;
    const vectorSource = firstVectorSourceId();
    if (!vectorSource) return;
    try {
      map.addLayer({
        id: 'rockies-buildings-3d',
        source: vectorSource,
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 12.5,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['zoom'],
            12.5, '#9d9487',
            15, '#c5bcaf'
          ],
          'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'render_height']], ['to-number', ['get', 'height']], 6],
          'fill-extrusion-base': ['coalesce', ['to-number', ['get', 'render_min_height']], ['to-number', ['get', 'min_height']], 0],
          'fill-extrusion-opacity': 0.85
        }
      }, firstSymbolLayerId());
    } catch (_) {}
  }

  function applyRockiesPalette() {
    if (!map) return;
    try {
      // 1. Water -> Signature Canadian Rockies glacial turquoise (Moraine / Louise / Bow / Peyto)
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', [
          'interpolate', ['linear'], ['zoom'],
          6, '#185669',
          11, '#1b798e',
          14, '#2096ab'
        ]);
        map.setPaintProperty('water', 'fill-opacity', 0.94);
      }
      if (map.getLayer('waterway_river')) {
        map.setPaintProperty('waterway_river', 'line-color', '#2096ab');
        map.setPaintProperty('waterway_river', 'line-width', [
          'interpolate', ['linear'], ['zoom'],
          8, 1.0,
          14, 2.5
        ]);
      }
      if (map.getLayer('waterway_other')) {
        map.setPaintProperty('waterway_other', 'line-color', '#2096ab');
      }

      // 2. Glaciers / Ice -> Cold crisp off-white cyan
      if (map.getLayer('landcover_ice')) {
        map.setPaintProperty('landcover_ice', 'fill-color', '#eaf6f8');
        map.setPaintProperty('landcover_ice', 'fill-opacity', 0.95);
      }

      // 3. Montane / Subalpine forests -> Deep pine & fir evergreen
      if (map.getLayer('landcover_wood')) {
        map.setPaintProperty('landcover_wood', 'fill-color', '#324a38');
        map.setPaintProperty('landcover_wood', 'fill-opacity', 0.65);
      }
      if (map.getLayer('park')) {
        map.setPaintProperty('park', 'fill-color', '#2d4434');
        map.setPaintProperty('park', 'fill-opacity', 0.45);
      }
      if (map.getLayer('landcover_grass')) {
        map.setPaintProperty('landcover_grass', 'fill-color', '#41573e');
        map.setPaintProperty('landcover_grass', 'fill-opacity', 0.55);
      }

      // 4. Base background (bare rock/talus/scree)
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#cad5cc');
      }

      // 5. Suppress noisy highway shield badges in 3D
      ['highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us'].forEach(function (id) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });
    } catch (_) {}
  }

  async function initialize(targetContainer) {
    if (!targetContainer) throw new Error('WORLD_CONTAINER_MISSING');
    container = targetContainer;
    await loadMapLibre();

    if (map && mapLoaded) {
      container.classList.remove('hidden');
      setTimeout(function () { try { map.resize(); } catch (_) {} }, 0);
      return map;
    }
    if (initPromise) return initPromise;

    container.innerHTML = '';
    mapLoaded = false;

    initPromise = new Promise(function (resolve, reject) {
      try {
        map = new ML.Map({
          container: container,
          style: OPENFREEMAP_STYLE,
          center: [-116.4, 52.0],
          zoom: 7.8,
          pitch: 62,
          bearing: 325,
          maxPitch: 85,
          renderWorldCopies: false,
          attributionControl: true,
          canvasContextAttributes: { antialias: true },
          fadeDuration: 150,
          terrainSkirtLength: 'auto'
        });

        map.addControl(new ML.NavigationControl({ visualizePitch: true, showZoom: true, showCompass: true }), 'bottom-right');

        const timeout = setTimeout(function () {
          initPromise = null;
          reject(new Error('OPEN_WORLD_LOAD_TIMEOUT'));
        }, 25000);

        map.once('load', function () {
          clearTimeout(timeout);
          try {
            addOpenTerrain();
            addBuildings3D();
            applyRockiesPalette();
            mapLoaded = true;
            container.classList.remove('hidden');
            resolve(map);
          } catch (err) {
            initPromise = null;
            reject(err);
          }
        });

        map.once('error', function (event) {
          if (!mapLoaded && event && event.error) {
            // Do not fail on every missing vector glyph or optional tile.
          }
        });
      } catch (err) {
        initPromise = null;
        reject(err);
      }
    });

    return initPromise;
  }

  function routeGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: state.route.map(function (p) { return [p.lng, p.lat]; })
        }
      }]
    };
  }

  function stopGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: state.stopsWithDistances.map(function (entry, index) {
        const stop = entry.stop || entry;
        return {
          type: 'Feature',
          properties: {
            id: String(stop.id || index),
            name: String(stop.name || ''),
            index: index + 1,
            priority: String(stop.priority || 'nice'),
            isHotel: !!stop.isHotel
          },
          geometry: { type: 'Point', coordinates: [Number(stop.lng), Number(stop.lat)] }
        };
      })
    };
  }

  function upsertRouteLayers() {
    if (!map || !mapLoaded) return;
    const route = routeGeoJSON();
    const stops = stopGeoJSON();

    if (map.getSource('rockies-route')) map.getSource('rockies-route').setData(route);
    else map.addSource('rockies-route', { type: 'geojson', data: route });

    if (!map.getLayer('rockies-route-casing')) {
      map.addLayer({
        id: 'rockies-route-casing',
        type: 'line',
        source: 'rockies-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': 'rgba(6, 18, 24, 0.60)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2.5, 12, 4.0, 16, 5.0]
        }
      });
    }
    if (!map.getLayer('rockies-route-line')) {
      map.addLayer({
        id: 'rockies-route-line',
        type: 'line',
        source: 'rockies-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#42b998',
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, 0.85,
            12, 0.70,
            15, 0.45
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2.0, 12, 2.8, 16, 3.2]
        }
      });
    }

    if (map.getSource('rockies-stops')) map.getSource('rockies-stops').setData(stops);
    else map.addSource('rockies-stops', { type: 'geojson', data: stops });

    if (!map.getLayer('rockies-stop-points')) {
      map.addLayer({
        id: 'rockies-stop-points',
        type: 'circle',
        source: 'rockies-stops',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'priority'], 'must'], 6, 4.5],
          'circle-color': ['case', ['get', 'isHotel'], '#c5a6ff', ['==', ['get', 'priority'], 'must'], '#56c6a5', '#68b9ff'],
          'circle-stroke-color': '#07131d',
          'circle-stroke-width': 2
        }
      });
    }
    if (!map.getLayer('rockies-stop-labels')) {
      map.addLayer({
        id: 'rockies-stop-labels',
        type: 'symbol',
        source: 'rockies-stops',
        minzoom: 9,
        layout: {
          'text-field': ['concat', ['to-string', ['get', 'index']], '  ', ['get', 'name']],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#f2fbff',
          'text-halo-color': 'rgba(5, 17, 26, 0.92)',
          'text-halo-width': 1.4
        }
      });
    }
  }

  function loadDay(options) {
    if (!map || !mapLoaded) throw new Error('WORLD_NOT_INITIALIZED');
    stop(false);

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
    state.smoothedGroundElevation = null;
    state.startDate = new Date(buildTripIsoDate(state.dateISO, state.startTime));

    upsertRouteLayers();
    fitRoute(0);
  }

  function fitRoute(duration) {
    if (!map || !state.route.length) return;
    const bounds = new ML.LngLatBounds();
    state.route.forEach(function (p) { bounds.extend([p.lng, p.lat]); });
    if (duration === 0) {
      map.fitBounds(bounds, { padding: 70, pitch: 58, bearing: 325, duration: 0, maxZoom: 11.5 });
    } else {
      map.fitBounds(bounds, { padding: 70, pitch: 58, bearing: 325, duration: Math.round((duration || 1.2) * 1000), maxZoom: 11.5 });
    }
  }

  function queryGround(point, fallbackElevation) {
    if (!map || typeof map.queryTerrainElevation !== 'function') return fallbackElevation;
    try {
      const elevation = map.queryTerrainElevation([point.lng, point.lat]);
      if (elevation === null || elevation === undefined) return fallbackElevation;
      const num = Number(elevation);
      if (!Number.isFinite(num) || num <= 0) return fallbackElevation;
      return num;
    } catch (_) {
      return fallbackElevation;
    }
  }

  function getCameraSettings(mode) {
    if (mode === 'aerial') return { height: 480, lookAhead: 1200, pitch: 52, headingRate: 4.0, groundRate: 3.5, zoom: 11.8 };
    if (mode === 'scenic') return { height: 95, lookAhead: 520, pitch: 64, headingRate: 5.0, groundRate: 4.5, zoom: 13.5 };
    return { height: 16, lookAhead: 260, pitch: 72, headingRate: 6.5, groundRate: 6.0, zoom: 14.8 };
  }

  function setCameraMode(mode) {
    const allowed = ['road', 'scenic', 'aerial'];
    state.cameraMode = allowed.indexOf(mode) === -1 ? 'road' : mode;
    updateFrame(0);
    try {
      if (map) map.triggerRepaint();
    } catch (_) {}
  }

  function setSpeed(speed) {
    state.speed = clamp(speed || 1, 0.25, 4);
  }

  function setProgress(fraction) {
    state.progress = clamp(fraction, 0, 1);
    state.smoothedHeading = null;
    state.smoothedGroundElevation = null;
    state.groundElevationHistory = [];
    state.lastDistanceMeters = state.totalDistanceMeters * state.progress;
    state.lastStopIndex = -1;
    state.lastLightingUpdate = 0;
    updateFrame(0);
    try {
      if (map) map.triggerRepaint();
    } catch (_) {}
  }

  function currentTripDate() {
    if (!state.startDate) return null;
    const elapsedSeconds = timeOffsetSecondsAtFraction(state.timeAnchors, state.progress, state.driveDurationSeconds);
    return new Date(state.startDate.getTime() + elapsedSeconds * 1000);
  }

  function updateLighting(date, point, now) {
    if (!map || !date || !point) return null;
    const sun = solarPosition(date, point.lat, point.lng);
    if (now - state.lastLightingUpdate < 650) return sun;
    state.lastLightingUpdate = now;

    const warm = clamp((22 - sun.altitude) / 22, 0, 1);
    const lightColor = warm > 0.6 ? '#ffe8d0' : (warm > 0.2 ? '#fff5e8' : '#ffffff');
    const intensity = clamp(0.70 + Math.max(0, sun.altitude) / 120, 0.68, 0.95);
    const polar = clamp(42 - Math.max(0, sun.altitude) * 0.25, 24, 48);

    try {
      map.setLight({
        anchor: 'viewport',
        color: lightColor,
        intensity: intensity,
        position: [1.5, 0, polar]
      });
      const skyColor = sun.altitude < 8 ? '#7d91ad' : '#78afd2';
      const horizonColor = sun.altitude < 8 ? '#f0c49e' : '#dce9e9';
      map.setSky({
        'sky-color': skyColor,
        'horizon-color': horizonColor,
        'fog-color': '#c6d4d4',
        'fog-ground-blend': 0.55,
        'horizon-fog-blend': 0.74,
        'sky-horizon-blend': 0.62,
        'atmosphere-blend': 0.84
      });
    } catch (_) {}
    return sun;
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
      } else break;
    }
  }

  function updateFrame(deltaMs) {
    if (!map || !state.route.length) return;

    if (state.active && !state.paused && deltaMs > 0) {
      state.progress = clamp(state.progress + (deltaMs * state.speed) / state.baseDurationMs, 0, 1);
    }

    const dtSeconds = deltaMs > 0 ? deltaMs / 1000 : 0.016;
    const settings = getCameraSettings(state.cameraMode);
    const currentDistance = state.totalDistanceMeters * state.progress;
    const distanceDelta = Math.abs(currentDistance - (state.lastDistanceMeters || currentDistance));
    state.lastDistanceMeters = currentDistance;

    const lookAheadDist = computeAdaptiveLookahead(state.route, state.cumulative, state.totalDistanceMeters, currentDistance, state.cameraMode);
    const point = sampleRouteAtDistance(state.route, state.cumulative, state.totalDistanceMeters, currentDistance);
    const lookPoint = sampleRouteAtDistance(
      state.route,
      state.cumulative,
      state.totalDistanceMeters,
      Math.min(state.totalDistanceMeters, currentDistance + lookAheadDist)
    );
    if (!point || !lookPoint) return;

    const fallbackElevation = elevationAtFraction(state.elevationProfile, point.fraction);
    const rawGround = queryGround(point, fallbackElevation);

    // 7-sample rolling median filter to eliminate DEM tile LOD pop anomalies
    state.groundElevationHistory.push(rawGround);
    if (state.groundElevationHistory.length > 7) state.groundElevationHistory.shift();
    const filteredGround = median(state.groundElevationHistory);

    if (!Number.isFinite(state.smoothedGroundElevation)) {
      state.smoothedGroundElevation = filteredGround;
    } else {
      // Limit vertical velocity per simulated distance travelled (max 14% mountain grade + 1.8m buffer)
      const maxDelta = Math.max(1.8, distanceDelta * 0.14);
      const groundAlpha = 1 - Math.exp(-settings.groundRate * dtSeconds);
      state.smoothedGroundElevation = smoothValue(state.smoothedGroundElevation, filteredGround, groundAlpha, maxDelta);
    }

    const rawHeading = computeBearing(point, lookPoint);
    const scenicYaw = computeScenicYawBias(point, state.cameraMode);
    const targetHeading = normalizeHeading(rawHeading + scenicYaw);

    state.smoothedHeading = smoothHeadingExp(state.smoothedHeading, targetHeading, settings.headingRate, dtSeconds);

    try {
      const cameraAltitude = (Number.isFinite(state.smoothedGroundElevation) ? state.smoothedGroundElevation : fallbackElevation) + settings.height;
      const cameraOptions = map.calculateCameraOptionsFromCameraLngLatAltRotation(
        new ML.LngLat(point.lng, point.lat),
        cameraAltitude,
        state.smoothedHeading,
        settings.pitch,
        0
      );
      map.jumpTo(Object.assign({}, cameraOptions, { freezeElevation: true }));
    } catch (_) {
      map.jumpTo({
        center: [point.lng, point.lat],
        bearing: state.smoothedHeading,
        pitch: settings.pitch,
        zoom: settings.zoom
      });
    }

    const date = currentTripDate();
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const sun = updateLighting(date, point, now) || solarPosition(date, point.lat, point.lng);
    updateStopProgress();

    if (state.handlers && typeof state.handlers.onProgress === 'function') {
      state.handlers.onProgress({
        progress: state.progress,
        distanceMeters: currentDistance,
        totalDistanceMeters: state.totalDistanceMeters,
        point: point,
        surfaceHeight: state.smoothedGroundElevation,
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
      if (state.handlers && typeof state.handlers.onEnd === 'function') state.handlers.onEnd();
    }

    try {
      map.triggerRepaint();
    } catch (_) {}
  }

  function animationLoop(now) {
    if (!state.active) return;
    const delta = state.lastFrameAt ? Math.min(80, now - state.lastFrameAt) : 0;
    state.lastFrameAt = now;
    if (!state.paused) updateFrame(delta);
    state.animationFrame = requestAnimationFrame(animationLoop);
  }

  function play(options) {
    if (!map || state.route.length < 2) throw new Error('WORLD_DAY_NOT_READY');
    const opts = options || {};
    state.cameraMode = opts.cameraMode || state.cameraMode || 'road';
    state.speed = clamp(opts.speed || state.speed || 1, 0.25, 4);
    if (Number.isFinite(Number(opts.durationMs))) {
      state.baseDurationMs = clamp(Number(opts.durationMs), 30000, 300000);
    } else {
      const km = state.totalDistanceMeters / 1000;
      state.baseDurationMs = clamp(km * 240, 55000, 165000);
    }
    state.active = true;
    state.paused = false;
    state.lastFrameAt = 0;
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    state.animationFrame = requestAnimationFrame(animationLoop);
  }

  function pause() { if (state.active) state.paused = true; }
  function resume() { if (state.active) { state.paused = false; state.lastFrameAt = 0; } }
  function togglePause() { if (!state.active) return false; state.paused = !state.paused; state.lastFrameAt = 0; return state.paused; }

  function stop(restoreFit) {
    state.active = false;
    state.paused = false;
    state.lastFrameAt = 0;
    if (state.animationFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.animationFrame);
    state.animationFrame = 0;
    if (restoreFit) fitRoute(1.1);
  }

  function isActive() { return !!state.active; }
  function isPaused() { return !!state.paused; }

  function show() {
    if (container) container.classList.remove('hidden');
    if (map) setTimeout(function () { try { map.resize(); } catch (_) {} }, 0);
  }

  function hide() { if (container) container.classList.add('hidden'); }

  function getStatus() {
    return {
      initialized: !!map,
      active: state.active,
      paused: state.paused,
      progress: state.progress,
      speed: state.speed,
      cameraMode: state.cameraMode,
      totalDistanceMeters: state.totalDistanceMeters,
      renderer: 'maplibre-open-world',
      maplibreVersion: MAPLIBRE_VERSION,
      terrain: (typeof window !== 'undefined' && window.ROCKIES_CONFIG && window.ROCKIES_CONFIG.localTerrain)
        ? 'Local Canadian NRCan HRDEM Terrarium'
        : 'AWS Open Data Terrarium',
      basemap: 'OpenFreeMap / OpenStreetMap',
      paidApiRequired: false
    };
  }

  function destroy() {
    stop(false);
    if (map) {
      try { map.remove(); } catch (_) {}
    }
    map = null;
    mapLoaded = false;
    initPromise = null;
    if (container) container.innerHTML = '';
    container = null;
  }

  return {
    MAPLIBRE_VERSION: MAPLIBRE_VERSION,
    OPENFREEMAP_STYLE: OPENFREEMAP_STYLE,
    TERRAIN_TILE_URL: TERRAIN_TILE_URL,
    getMap: function () { return map; },
    loadMapLibre: loadMapLibre,
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
    smoothHeadingExp: smoothHeadingExp,
    smoothValue: smoothValue,
    median: median,
    computeAdaptiveLookahead: computeAdaptiveLookahead,
    computeScenicYawBias: computeScenicYawBias,
    timeOffsetSecondsAtFraction: timeOffsetSecondsAtFraction,
    computeBearing: computeBearing
  };
});
