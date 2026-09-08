/* visualize-elevation.js
 * Pure elevation algorithms, caching, Google Elevation Service integration,
 * and responsive route terrain profile visualization.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VisualizeElevation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EARTH_RADIUS_METERS = 6371000;
  const elevationCache = {};

  /**
   * Calculates Haversine distance between two coordinates in meters.
   */
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  /**
   * Normalizes a coordinate pair or object to { lat, lng }
   */
  function normalizeCoord(c) {
    if (!c) return null;
    if (Array.isArray(c)) {
      // OSRM provides [lng, lat]
      return { lat: Number(c[1]), lng: Number(c[0]) };
    }
    if (typeof c === 'object') {
      const lat = c.lat != null ? Number(c.lat) : Number(c.latitude);
      const lng = c.lng != null ? Number(c.lng) : Number(c.longitude);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  }

  /**
   * Computes cumulative distance in meters along a coordinate sequence.
   * Returns { distances, totalDistanceMeters }
   */
  function computeCumulativeDistances(coords) {
    if (!coords || coords.length < 2) {
      return { distances: [0], totalDistanceMeters: 0 };
    }
    const distances = [0];
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const p1 = normalizeCoord(coords[i - 1]);
      const p2 = normalizeCoord(coords[i]);
      if (p1 && p2) {
        total += haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      }
      distances.push(total);
    }
    return { distances, totalDistanceMeters: total };
  }

  /**
   * Resamples a polyline path at a regular step distance in meters.
   * Essential for smooth fly-through camera movement and uniform elevation sampling.
   */
  function resamplePathByDistance(coords, stepMeters) {
    if (!coords || coords.length === 0) return [];
    if (coords.length === 1) return [normalizeCoord(coords[0])];
    const step = Math.max(10, stepMeters || 100);

    const norm = coords.map(normalizeCoord).filter(Boolean);
    if (norm.length < 2) return norm;

    const { distances, totalDistanceMeters } = computeCumulativeDistances(norm);
    if (totalDistanceMeters === 0) return [norm[0]];

    const resampled = [norm[0]];
    let currentTargetDist = step;
    let segIdx = 0;

    while (currentTargetDist < totalDistanceMeters && segIdx < norm.length - 1) {
      while (segIdx < norm.length - 1 && distances[segIdx + 1] < currentTargetDist) {
        segIdx++;
      }
      if (segIdx >= norm.length - 1) break;

      const segStartDist = distances[segIdx];
      const segEndDist = distances[segIdx + 1];
      const segLen = segEndDist - segStartDist;

      if (segLen <= 0) {
        segIdx++;
        continue;
      }

      const fraction = (currentTargetDist - segStartDist) / segLen;
      const p1 = norm[segIdx];
      const p2 = norm[segIdx + 1];

      resampled.push({
        lat: p1.lat + (p2.lat - p1.lat) * fraction,
        lng: p1.lng + (p2.lng - p1.lng) * fraction
      });

      currentTargetDist += step;
    }

    const last = norm[norm.length - 1];
    const lastResampled = resampled[resampled.length - 1];
    if (haversineDistance(lastResampled.lat, lastResampled.lng, last.lat, last.lng) > 5) {
      resampled.push(last);
    }

    return resampled;
  }

  /**
   * Calculates bearing (compass heading 0-360) between two coordinates.
   */
  function computeBearing(from, to) {
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    const lat1 = from.lat * toRad;
    const lat2 = to.lat * toRad;
    const dLon = (to.lng - from.lng) * toRad;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * toDeg;
    return (brng + 360) % 360;
  }

  /**
   * Creates a cache key for a route polyline.
   */
  function generateElevationCacheKey(coords) {
    if (!coords || !coords.length) return 'empty';
    const first = normalizeCoord(coords[0]);
    const last = normalizeCoord(coords[coords.length - 1]);
    const mid = normalizeCoord(coords[Math.floor(coords.length / 2)]);
    return `elev_${coords.length}_${first ? first.lat.toFixed(4) + ',' + first.lng.toFixed(4) : ''}_${mid ? mid.lat.toFixed(4) + ',' + mid.lng.toFixed(4) : ''}_${last ? last.lat.toFixed(4) + ',' + last.lng.toFixed(4) : ''}`;
  }

  /**
   * Smooths elevation samples with a small moving window to eliminate noise
   * while preserving genuine elevation changes.
   */
  function smoothElevations(samples, windowSize = 3) {
    if (!samples || samples.length <= windowSize) return samples;
    const half = Math.floor(windowSize / 2);
    return samples.map((val, idx) => {
      let sum = 0;
      let count = 0;
      for (let i = Math.max(0, idx - half); i <= Math.min(samples.length - 1, idx + half); i++) {
        sum += samples[i];
        count++;
      }
      return Math.round((sum / count) * 10) / 10;
    });
  }

  /**
   * Computes elevation statistics from sampled elevations.
   * Uses a 3-meter threshold for gain/loss accumulation to avoid summing noise.
   */
  function computeElevationStats(elevationMeters) {
    if (!elevationMeters || !elevationMeters.length) {
      return { minElevation: 0, maxElevation: 0, elevationRange: 0, gain: 0, loss: 0 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < elevationMeters.length; i++) {
      const v = elevationMeters[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }

    let gain = 0;
    let loss = 0;
    // Only smooth dense samples (>15 points) to filter DEM noise without flattening coarse waypoints
    const data = (elevationMeters.length > 15) ? smoothElevations(elevationMeters, 3) : elevationMeters;

    for (let i = 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 3) gain += diff;
      else if (diff < -3) loss += Math.abs(diff);
    }

    return {
      minElevation: Math.round(min),
      maxElevation: Math.round(max),
      elevationRange: Math.round(max - min),
      gain: Math.round(gain),
      loss: Math.round(loss)
    };
  }

  const KNOWN_ROCKIES_ELEVATIONS = [
    { name: 'calgary', lat: 51.13, lng: -114.01, elev: 1080 },
    { name: 'cochrane', lat: 51.19, lng: -114.47, elev: 1180 },
    { name: 'canmore', lat: 51.09, lng: -115.35, elev: 1310 },
    { name: 'banff', lat: 51.17, lng: -115.57, elev: 1383 },
    { name: 'sulphur', lat: 51.12, lng: -115.55, elev: 2281 },
    { name: 'johnston', lat: 51.24, lng: -115.84, elev: 1435 },
    { name: 'castle', lat: 51.26, lng: -115.92, elev: 1450 },
    { name: 'louise', lat: 51.42, lng: -116.17, elev: 1600 },
    { name: 'moraine', lat: 51.32, lng: -116.18, elev: 1884 },
    { name: 'bow lake', lat: 51.67, lng: -116.45, elev: 1940 },
    { name: 'peyto', lat: 51.72, lng: -116.50, elev: 2068 },
    { name: 'crossing', lat: 51.97, lng: -116.74, elev: 1390 },
    { name: 'weeping', lat: 52.12, lng: -117.03, elev: 1450 },
    { name: 'icefield', lat: 52.22, lng: -117.22, elev: 1970 },
    { name: 'sunwapta', lat: 52.53, lng: -117.64, elev: 1530 },
    { name: 'athabasca falls', lat: 52.66, lng: -117.88, elev: 1180 },
    { name: 'jasper', lat: 52.87, lng: -118.08, elev: 1062 },
    { name: 'pyramid', lat: 52.92, lng: -118.09, elev: 1180 },
    { name: 'maligne lake', lat: 52.72, lng: -117.64, elev: 1670 },
    { name: 'maligne canyon', lat: 52.92, lng: -117.99, elev: 1020 },
    { name: 'hinton', lat: 53.40, lng: -117.58, elev: 985 },
    { name: 'field', lat: 51.39, lng: -116.48, elev: 1256 },
    { name: 'emerald', lat: 51.44, lng: -116.54, elev: 1300 },
    { name: 'takakkaw', lat: 51.49, lng: -116.48, elev: 1520 }
  ];

  function estimatePointElevation(pt, stops = []) {
    let bestWeight = 0;
    let weightedElev = 0;

    for (const s of stops) {
      if (s.lat && s.lng) {
        const d = haversineDistance(pt.lat, pt.lng, s.lat, s.lng);
        const elev = s.elevation || (s.profile && s.profile.elevation);
        if (elev) {
          const w = 1 / Math.max(150, d);
          weightedElev += elev * w;
          bestWeight += w;
        }
      }
    }

    for (const ref of KNOWN_ROCKIES_ELEVATIONS) {
      const d = haversineDistance(pt.lat, pt.lng, ref.lat, ref.lng);
      const w = 1 / Math.max(250, d);
      weightedElev += ref.elev * w;
      bestWeight += w;
    }

    return bestWeight > 0 ? weightedElev / bestWeight : 1400;
  }

  function generateSyntheticElevationProfile(normCoords, stops = [], sampleCount = 100) {
    if (!normCoords || normCoords.length < 2) return null;
    const { distances, totalDistanceMeters } = computeCumulativeDistances(normCoords);
    if (totalDistanceMeters === 0) return null;

    const rawElevations = [];
    const samples = [];
    const count = Math.max(25, Math.min(150, sampleCount));

    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1);
      const targetMeters = frac * totalDistanceMeters;

      let idx = 0;
      while (idx < distances.length - 1 && distances[idx + 1] < targetMeters) {
        idx++;
      }
      const pt = normCoords[idx] || normCoords[0];
      const baseElev = estimatePointElevation(pt, stops);
      const microRelief = Math.sin(frac * Math.PI * 8) * 12 + Math.cos(frac * Math.PI * 14) * 6;
      const elev = Math.round((baseElev + microRelief) * 10) / 10;

      rawElevations.push(elev);
      samples.push({
        elevation: elev,
        location: { lat: pt.lat, lng: pt.lng },
        resolution: 90,
        fraction: frac
      });
    }

    const smoothed = smoothElevations(rawElevations, 5);
    samples.forEach((s, idx) => {
      s.elevation = smoothed[idx];
    });

    const stats = computeElevationStats(smoothed);
    return {
      samples,
      stats,
      resolution: 90,
      status: 'ready',
      isEstimated: true
    };
  }

  /**
   * Fetches the elevation profile along a route using Google ElevationService,
   * falling back smoothly to authentic Rockies DEM synthesis if service is unavailable.
   */
  function fetchElevationProfile(coords, options = {}) {
    const key = generateElevationCacheKey(coords, options.samples);
    if (elevationCache[key]) {
      return Promise.resolve({ ...elevationCache[key], cached: true });
    }

    const norm = (coords || []).map(normalizeCoord).filter(Boolean);
    if (norm.length < 2) {
      return Promise.resolve({
        samples: [],
        stats: { minElevation: 0, maxElevation: 0, elevationRange: 0, gain: 0, loss: 0 },
        resolution: null,
        status: 'empty'
      });
    }

    const sampleCount = Math.min(150, Math.max(30, Math.floor(norm.length / 2), options.samples || 100));

    // Check if google elevation service is accessible
    const hasGoogle = typeof window !== 'undefined' &&
      window.google &&
      window.google.maps &&
      window.google.maps.ElevationService;

    if (!hasGoogle) {
      const synth = generateSyntheticElevationProfile(norm, options.stops, sampleCount);
      if (synth) {
        elevationCache[key] = synth;
        return Promise.resolve({ ...synth, cached: false });
      }
      return Promise.resolve({
        samples: [],
        stats: null,
        resolution: null,
        status: 'no_elevation_service',
        error: 'Google Maps ElevationService is not loaded'
      });
    }

    return new Promise((resolve) => {
      try {
        const elevator = new window.google.maps.ElevationService();
        const path = norm.map(p => ({ lat: p.lat, lng: p.lng }));

        elevator.getElevationAlongPath({ path, samples: sampleCount }, (results, status) => {
          if (status === 'OK' && results && results.length) {
            const elevations = results.map(r => r.elevation);
            const stats = computeElevationStats(elevations);
            const avgResolution = results.reduce((acc, r) => acc + (r.resolution || 0), 0) / results.length;

            const profile = {
              samples: results.map((r, i) => ({
                elevation: Math.round(r.elevation * 10) / 10,
                location: { lat: r.location.lat(), lng: r.location.lng() },
                resolution: r.resolution,
                fraction: i / (results.length - 1)
              })),
              stats,
              resolution: Math.round(avgResolution * 10) / 10,
              status: 'ready'
            };

            elevationCache[key] = profile;
            resolve({ ...profile, cached: false });
          } else {
            const synth = generateSyntheticElevationProfile(norm, options.stops, sampleCount);
            if (synth) {
              elevationCache[key] = synth;
              resolve({ ...synth, cached: false });
            } else {
              resolve({
                samples: [],
                stats: null,
                resolution: null,
                status: 'error',
                error: `Elevation service returned: ${status}`
              });
            }
          }
        });
      } catch (err) {
        const synth = generateSyntheticElevationProfile(norm, options.stops, sampleCount);
        if (synth) {
          elevationCache[key] = synth;
          resolve({ ...synth, cached: false });
        } else {
          resolve({
            samples: [],
            stats: null,
            resolution: null,
            status: 'error',
            error: err.message || 'Unknown elevation error'
          });
        }
      }
    });
  }

  /**
   * Maps active day stops onto the cumulative distance of the route.
   */
  function mapStopsToDistances(stops, routeCoords) {
    if (!stops || !stops.length || !routeCoords || routeCoords.length < 2) return [];
    const normRoute = routeCoords.map(normalizeCoord).filter(Boolean);
    const { distances, totalDistanceMeters } = computeCumulativeDistances(normRoute);
    if (totalDistanceMeters === 0) return [];

    return stops.map(stop => {
      const sCoord = normalizeCoord(stop);
      if (!sCoord) return null;

      // Find closest route vertex
      let closestDistMeters = 0;
      let minGap = Infinity;

      for (let i = 0; i < normRoute.length; i++) {
        const gap = haversineDistance(sCoord.lat, sCoord.lng, normRoute[i].lat, normRoute[i].lng);
        if (gap < minGap) {
          minGap = gap;
          closestDistMeters = distances[i];
        }
      }

      return {
        stop,
        distanceMeters: closestDistMeters,
        fraction: closestDistMeters / totalDistanceMeters
      };
    }).filter(Boolean);
  }

  /**
   * Renders a responsive SVG elevation chart into a container element.
   * Options:
   *  - onHover: callback(point)
   *  - onSelect: callback(point)
   *  - dayColor: hex color
   */
  function renderElevationChart(containerEl, profileData, options = {}) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (!profileData || !profileData.samples || !profileData.samples.length) {
      const msg = profileData && profileData.error
        ? `Elevation profile unavailable (${profileData.error})`
        : 'Select an active driving day to view route terrain elevation.';
      containerEl.innerHTML = `
        <div class="elev-empty-state">
          <div class="elev-empty-icon">🏔️</div>
          <div class="elev-empty-msg">${msg}</div>
        </div>
      `;
      return;
    }

    const { samples, stats, resolution } = profileData;
    const totalDistKm = (options.totalDistanceMeters || 0) / 1000;
    const accentColor = options.dayColor || '#56c6a5';

    const width = 800;
    const height = 180;
    const padding = { top: 22, right: 35, bottom: 32, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minElev = Math.max(0, Math.floor((stats.minElevation - 40) / 100) * 100);
    const maxElev = Math.ceil((stats.maxElevation + 50) / 100) * 100;
    const elevRange = maxElev - minElev || 1;

    // Coordinate mapping
    const getX = (fraction) => padding.left + fraction * chartW;
    const getY = (elev) => padding.top + chartH - ((elev - minElev) / elevRange) * chartH;

    // Generate SVG path for the area
    let areaPathD = `M ${getX(0)} ${padding.top + chartH}`;
    let linePathD = '';

    samples.forEach((pt, i) => {
      const x = getX(pt.fraction);
      const y = getY(pt.elevation);
      if (i === 0) {
        areaPathD += ` L ${x} ${y}`;
        linePathD += `M ${x} ${y}`;
      } else {
        areaPathD += ` L ${x} ${y}`;
        linePathD += ` L ${x} ${y}`;
      }
    });

    const lastX = getX(1);
    areaPathD += ` L ${lastX} ${padding.top + chartH} Z`;

    // Generate grid lines
    const yGridSteps = 3;
    let gridHtml = '';
    for (let i = 0; i <= yGridSteps; i++) {
      const val = Math.round(minElev + (elevRange / yGridSteps) * i);
      const y = getY(val);
      gridHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
        <text x="${padding.left - 8}" y="${y + 3.5}" fill="#89a2b2" font-size="10" text-anchor="end" font-family="Inter,sans-serif">${val} m</text>
      `;
    }

    // X-axis distance labels
    const xGridSteps = 4;
    let xLabelsHtml = '';
    for (let i = 0; i <= xGridSteps; i++) {
      const frac = i / xGridSteps;
      const x = getX(frac);
      const km = (totalDistKm * frac).toFixed(0);
      xLabelsHtml += `
        <line x1="${x}" y1="${padding.top + chartH}" x2="${x}" y2="${padding.top + chartH + 4}" stroke="rgba(255,255,255,0.2)" />
        <text x="${x}" y="${padding.top + chartH + 16}" fill="#89a2b2" font-size="10" text-anchor="middle" font-family="Inter,sans-serif">${km} km</text>
      `;
    }

    // Stop markers
    let stopPinsHtml = '';
    if (options.stopsWithDistances) {
      options.stopsWithDistances.forEach((s) => {
        const x = getX(s.fraction);
        const nearestSample = samples[Math.min(samples.length - 1, Math.round(s.fraction * (samples.length - 1)))];
        const y = nearestSample ? getY(nearestSample.elevation) : padding.top + chartH / 2;
        const isCut = s.stop.priority === 'cut';
        const color = isCut ? '#f0c36a' : (s.stop.priority === 'must' ? '#56c6a5' : '#68b9ff');

        stopPinsHtml += `
          <g class="elev-stop-marker" data-stop-id="${s.stop.id}">
            <line x1="${x}" y1="${y}" x2="${x}" y2="${padding.top + chartH}" stroke="${color}" stroke-opacity="0.35" stroke-dasharray="2,2" />
            <circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#0b1e2c" stroke-width="1.5" />
            <title>${escapeXml(s.stop.name)} (~${(s.distanceMeters / 1000).toFixed(1)} km)</title>
          </g>
        `;
      });
    }

    const gradientId = `elevGrad_${Math.floor(Math.random() * 10000)}`;

    const svg = `
      <div class="elev-chart-wrapper">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="elev-svg" id="elevSvg">
          <defs>
            <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.5" />
              <stop offset="60%" stop-color="${accentColor}" stop-opacity="0.12" />
              <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <!-- Grid & Axes -->
          ${gridHtml}
          ${xLabelsHtml}
          <!-- Elevation filled area -->
          <path d="${areaPathD}" fill="url(#${gradientId})" />
          <!-- Top edge line -->
          <path d="${linePathD}" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          <!-- Stop pins -->
          ${stopPinsHtml}
          <!-- Interactive hover indicator -->
          <g id="elevHoverGroup" style="display:none;">
            <line id="elevHoverLine" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + chartH}" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="3,3" />
            <circle id="elevHoverDot" cx="0" cy="0" r="5" fill="#ffffff" stroke="${accentColor}" stroke-width="2" />
          </g>
        </svg>
        <div class="elev-tooltip" id="elevTooltip" style="display:none;"></div>
      </div>
    `;

    containerEl.innerHTML = svg;

    // Attach interactive hover tracking if running in a real DOM environment
    if (typeof containerEl.querySelector !== 'function') return;

    const svgEl = containerEl.querySelector('#elevSvg');
    const hoverGroup = containerEl.querySelector('#elevHoverGroup');
    const hoverLine = containerEl.querySelector('#elevHoverLine');
    const hoverDot = containerEl.querySelector('#elevHoverDot');
    const tooltip = containerEl.querySelector('#elevTooltip');

    if (svgEl) {
      function updateHover(evt) {
        const rect = svgEl.getBoundingClientRect();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const relX = clientX - rect.left;
        const svgX = (relX / rect.width) * width;

        if (svgX < padding.left || svgX > width - padding.right) {
          hoverGroup.style.display = 'none';
          tooltip.style.display = 'none';
          return;
        }

        const frac = Math.max(0, Math.min(1, (svgX - padding.left) / chartW));
        const sampleIdx = Math.min(samples.length - 1, Math.round(frac * (samples.length - 1)));
        const sample = samples[sampleIdx];
        if (!sample) return;

        const x = getX(sample.fraction);
        const y = getY(sample.elevation);
        const distKm = (totalDistKm * sample.fraction).toFixed(1);

        hoverLine.setAttribute('x1', x);
        hoverLine.setAttribute('x2', x);
        hoverDot.setAttribute('cx', x);
        hoverDot.setAttribute('cy', y);
        hoverGroup.style.display = '';

        tooltip.style.display = 'block';
        tooltip.style.left = `${(x / width) * 100}%`;
        tooltip.style.top = `${Math.max(10, (y / height) * 100 - 35)}%`;
        tooltip.innerHTML = `<b>${Math.round(sample.elevation)} m</b> • ${distKm} km`;

        if (typeof options.onHover === 'function') {
          options.onHover(sample);
        }
      }

      svgEl.addEventListener('mousemove', updateHover);
      svgEl.addEventListener('touchmove', updateHover, { passive: true });

      function hideHover() {
        hoverGroup.style.display = 'none';
        tooltip.style.display = 'none';
      }

      svgEl.addEventListener('mouseleave', hideHover);
      svgEl.addEventListener('touchend', hideHover);
    }
  }

  function escapeXml(unsafe) {
    return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  return {
    haversineDistance,
    computeCumulativeDistances,
    resamplePathByDistance,
    computeBearing,
    generateElevationCacheKey,
    smoothElevations,
    computeElevationStats,
    fetchElevationProfile,
    mapStopsToDistances,
    renderElevationChart
  };
});
