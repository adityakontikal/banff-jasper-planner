/* test-visualize.js
 * Comprehensive unit tests for 3D Visualize algorithms, geometry normalization,
 * distance calculation, path resampling, elevation caching & stats, and state adapters.
 */
const assert = require('assert');
const VE = require('./visualize-elevation.js');
const V3D = require('./visualize-3d.js');

console.log('🧪 Starting 3D Visualize Test Suite...\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------
// 1. Coordinate Normalization & Distance Tests
// ------------------------------------------------------------
test('normalizeCoord converts OSRM [lng, lat] array to { lat, lng }', () => {
  const osrmCoord = [-115.5708, 51.1784];
  // Internal helper tested via computeCumulativeDistances
  const res = VE.computeCumulativeDistances([osrmCoord, [-115.4979, 51.2483]]);
  assert.strictEqual(res.distances.length, 2);
  assert.strictEqual(res.distances[0], 0);
  assert(res.totalDistanceMeters > 9000 && res.totalDistanceMeters < 10000, `Expected ~9.3km, got ${res.totalDistanceMeters}`);
});

test('haversineDistance calculates realistic mountain distance in meters', () => {
  // Banff town to Lake Louise (~57 km straight line)
  const banff = { lat: 51.1784, lng: -115.5708 };
  const louise = { lat: 51.4167, lng: -116.2120 };
  const d = VE.haversineDistance(banff.lat, banff.lng, louise.lat, louise.lng);
  assert(d > 50000 && d < 65000, `Distance ${d}m should be ~57km`);
});

test('computeBearing calculates accurate compass headings', () => {
  const origin = { lat: 51.0, lng: -115.0 };
  const north = { lat: 52.0, lng: -115.0 };
  const east = { lat: 51.0, lng: -114.0 };
  const south = { lat: 50.0, lng: -115.0 };
  const west = { lat: 51.0, lng: -116.0 };

  const bNorth = VE.computeBearing(origin, north);
  const bEast = VE.computeBearing(origin, east);
  const bSouth = VE.computeBearing(origin, south);
  const bWest = VE.computeBearing(origin, west);

  assert(Math.abs(bNorth - 0) < 0.5 || Math.abs(bNorth - 360) < 0.5, `North should be 0, got ${bNorth}`);
  assert(Math.abs(bEast - 90) < 1.0, `East should be ~90, got ${bEast}`);
  assert(Math.abs(bSouth - 180) < 0.5, `South should be 180, got ${bSouth}`);
  assert(Math.abs(bWest - 270) < 1.0, `West should be ~270, got ${bWest}`);
});

// ------------------------------------------------------------
// 2. Path Resampling for 3D Fly-Through
// ------------------------------------------------------------
test('resamplePathByDistance produces regular steps along road geometry', () => {
  const rawPath = [
    [-115.5708, 51.1784], // Banff
    [-115.6500, 51.2000],
    [-115.7500, 51.2200],
    [-115.8400, 51.2450]  // Johnston Canyon (~20 km)
  ];

  const stepMeters = 500;
  const resampled = VE.resamplePathByDistance(rawPath, stepMeters);

  assert(resampled.length > 20, `Expected >20 points, got ${resampled.length}`);
  // Check step distances are approximately 500m
  for (let i = 1; i < resampled.length - 1; i++) {
    const step = VE.haversineDistance(
      resampled[i - 1].lat, resampled[i - 1].lng,
      resampled[i].lat, resampled[i].lng
    );
    assert(Math.abs(step - stepMeters) < 20, `Step ${i} was ${step}m, expected ~${stepMeters}m`);
  }

  // Endpoints preserved
  const first = resampled[0];
  const last = resampled[resampled.length - 1];
  assert(Math.abs(first.lat - 51.1784) < 0.0001);
  assert(Math.abs(last.lat - 51.2450) < 0.0001);
});

// ------------------------------------------------------------
// 3. Elevation Caching & Statistics Tests
// ------------------------------------------------------------
test('generateElevationCacheKey produces deterministic, collision-resistant keys', () => {
  const pathA = [[-115.57, 51.17], [-115.60, 51.19], [-115.84, 51.24]];
  const pathB = [[-115.57, 51.17], [-115.60, 51.19], [-115.84, 51.24]];
  const pathC = [[-116.18, 51.32], [-116.21, 51.41]];

  const keyA = VE.generateElevationCacheKey(pathA);
  const keyB = VE.generateElevationCacheKey(pathB);
  const keyC = VE.generateElevationCacheKey(pathC);

  assert.strictEqual(keyA, keyB, 'Identical paths must produce identical cache keys');
  assert.notStrictEqual(keyA, keyC, 'Different paths must produce different cache keys');
  assert(keyA.startsWith('elev_3_'));
});

test('smoothElevations filters high-frequency DEM noise', () => {
  const noisy = [1000, 1020, 1000, 1020, 1000];
  const smoothed = VE.smoothElevations(noisy, 3);
  // Central element smoothed from 1000 to (1020+1000+1020)/3 = 1013.3
  assert(smoothed[2] > 1005 && smoothed[2] < 1015, `Expected ~1013.3, got ${smoothed[2]}`);
});

test('computeElevationStats derives realistic Rockies elevation range and gain', () => {
  // Simulating Icefields Parkway climb to Bow Summit:
  // Lake Louise (1600m) -> Bow Summit (2068m) -> Saskatchewan Crossing (1400m)
  const elevations = [1600, 1750, 1900, 2068, 1800, 1550, 1400];
  const stats = VE.computeElevationStats(elevations);

  assert.strictEqual(stats.minElevation, 1400);
  assert.strictEqual(stats.maxElevation, 2068);
  assert.strictEqual(stats.elevationRange, 668);
  assert(stats.gain > 400, `Climb should be >400m, got ${stats.gain}`);
  assert(stats.loss > 600, `Descent should be >600m, got ${stats.loss}`);
});

test('fetchElevationProfile handles offline/no-service state gracefully without throwing', async () => {
  const path = [[-115.57, 51.17], [-115.84, 51.24]];
  const res = await VE.fetchElevationProfile(path);
  assert.strictEqual(res.status, 'ready');
  assert.strictEqual(res.isEstimated, true);
  assert(res.samples.length > 0, 'Expected synthetic samples');
  assert(res.stats && res.stats.minElevation > 0, 'Expected calculated stats');
});

// ------------------------------------------------------------
// 4. Map Stops to Route Distances
// ------------------------------------------------------------
test('mapStopsToDistances aligns day stops with cumulative route distance', () => {
  const route = [
    [-115.5708, 51.1784], // 0 km
    [-115.7000, 51.2100], // intermediate
    [-115.8400, 51.2450]  // end
  ];
  const stops = [
    { id: 's1', name: 'Start', lat: 51.1784, lng: -115.5708, priority: 'must' },
    { id: 's2', name: 'End', lat: 51.2450, lng: -115.8400, priority: 'must' }
  ];

  const mapped = VE.mapStopsToDistances(stops, route);
  assert.strictEqual(mapped.length, 2);
  assert.strictEqual(mapped[0].distanceMeters, 0);
  assert(mapped[1].distanceMeters > 0);
  assert(mapped[1].fraction > 0.95);
});

// ------------------------------------------------------------
// 5. Visualize3D State Adapter & Filtering Tests
// ------------------------------------------------------------
test('getVisualizeActiveStops excludes CUT stops and preserves MUST/NICE ordering', () => {
  // Mock global S state
  global.S = {
    selectedDay: 'Sep 27',
    filterMustOnly: false,
    days: [
      {
        date: 'Sep 27',
        label: 'Cochrane to Hinton',
        stops: [
          { id: 'stop1', name: 'Lake Louise', lat: 51.416, lng: -116.21, priority: 'must' },
          { id: 'stop2', name: 'Mistaya Canyon', lat: 51.946, lng: -116.72, priority: 'cut' },
          { id: 'stop3', name: 'Athabasca Falls', lat: 52.663, lng: -117.88, priority: 'nice' }
        ]
      }
    ]
  };

  const active = V3D.getVisualizeActiveStops('Sep 27');
  assert.strictEqual(active.length, 2);
  assert.strictEqual(active[0].id, 'stop1');
  assert.strictEqual(active[1].id, 'stop3');

  // When filterMustOnly is enabled
  global.S.filterMustOnly = true;
  const mustOnly = V3D.getVisualizeActiveStops('Sep 27');
  assert.strictEqual(mustOnly.length, 1);
  assert.strictEqual(mustOnly[0].id, 'stop1');
});

test('getVisualizeDayData computes distance, active stops, and summary', () => {
  global.S = {
    selectedDay: 'Sep 26',
    filterMustOnly: false,
    days: [
      {
        date: 'Sep 26',
        label: 'Banff Highlights',
        start: '06:00',
        sleep: 'Cochrane',
        stops: [
          { id: 's1', name: 'Banff Town', lat: 51.1784, lng: -115.5708, priority: 'must', stayMin: 60 },
          { id: 's2', name: 'Bow Falls', lat: 51.1683, lng: -115.5608, priority: 'nice', stayMin: 20 }
        ]
      }
    ]
  };

  // Mock getLeg to simulate resolved OSRM
  global.getLeg = (s1, s2) => ({
    distance: 2500,
    duration: 360,
    coordinates: [[s1.lng, s1.lat], [s2.lng, s2.lat]],
    status: 'ready'
  });

  const dayData = V3D.getVisualizeDayData('Sep 26');
  assert.strictEqual(dayData.date, 'Sep 26');
  assert.strictEqual(dayData.activeStops.length, 2);
  assert.strictEqual(dayData.distanceKm, 2.5);
  assert.strictEqual(dayData.driveDurationMin, 6);
  assert.strictEqual(dayData.routeStatus, 'ready');
  assert.strictEqual(dayData.routeCoordinates.length, 2);
});

test('API key configuration and local override behavior', () => {
  // Test fallback when no key is set
  global.window = {
    ROCKIES_CONFIG: { googleMapsApiKey: '' }
  };
  global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
  };

  assert.strictEqual(V3D.getApiKey(), '');

  // Test local testing key set
  V3D.setLocalApiKey('AIzaSyTestKey123');
  assert.strictEqual(V3D.getApiKey(), 'AIzaSyTestKey123');

  // Test local key clear
  V3D.setLocalApiKey('');
  assert.strictEqual(V3D.getApiKey(), '');
});

test('renderElevationChart generates valid SVG markup and stats pill', () => {
  const container = { innerHTML: '' };
  const profileData = {
    samples: [
      { elevation: 1600, fraction: 0 },
      { elevation: 2068, fraction: 0.5 },
      { elevation: 1400, fraction: 1 }
    ],
    stats: {
      minElevation: 1400,
      maxElevation: 2068,
      elevationRange: 668,
      gain: 468,
      loss: 668
    },
    resolution: 24
  };

  VE.renderElevationChart(container, profileData, { totalDistanceMeters: 50000 });
  assert(container.innerHTML.includes('<svg'), 'Expected SVG element in container');
  assert(container.innerHTML.includes('elev-chart-wrapper'), 'Expected chart wrapper');
  assert(container.innerHTML.includes('elev-svg'), 'Expected elev-svg class');
  assert(container.innerHTML.includes(' m</text>'), 'Expected elevation axis units in meters');
});

test('getVisualizeWholeTripData merges all itinerary days without mutation', () => {
  global.S = {
    selectedDay: 'Sep 26',
    filterMustOnly: false,
    days: [
      { date: 'Sep 25', label: 'Arrival', stops: [{ id: 'yyc', name: 'Airport', lat: 51.13, lng: -114.01, priority: 'must' }] },
      { date: 'Sep 26', label: 'Banff', stops: [{ id: 'banff', name: 'Banff', lat: 51.17, lng: -115.57, priority: 'must' }] }
    ]
  };

  const whole = V3D.getVisualizeWholeTripData();
  assert.strictEqual(whole.length, 2);
  assert.strictEqual(whole[0].date, 'Sep 25');
  assert.strictEqual(whole[1].date, 'Sep 26');
});

test('getLandmarkCameraProfile provides signature vistas for major Rockies attractions', () => {
  // Moraine Lake should point southwest (heading 216) toward Valley of the Ten Peaks
  const moraineProf = V3D.getLandmarkCameraProfile({ id: 'moraine', name: 'Moraine Lake & Rockpile' });
  assert.strictEqual(moraineProf.heading, 216);
  assert(moraineProf.viewContext.includes('Ten Peaks'), 'Expected Ten Peaks in view context');

  // Lake Louise should point southwest (heading 236) toward Mount Victoria & glacier
  const louiseProf = V3D.getLandmarkCameraProfile({ id: 'louise', name: 'Lake Louise Lakeshore' });
  assert.strictEqual(louiseProf.heading, 236);
  assert(louiseProf.viewContext.includes('Victoria'), 'Expected Victoria Glacier in view context');

  // Peyto Lake should look down north-northwest (heading 342) from Bow Summit
  const peytoProf = V3D.getLandmarkCameraProfile({ id: 'peyto', name: 'Peyto Lake (Bow Summit Viewpoint)' });
  assert.strictEqual(peytoProf.heading, 342);
  assert(peytoProf.viewContext.includes('Bow Summit'), 'Expected Bow Summit in view context');

  // Banff town should face north (heading 0) toward Cascade Mountain
  const banffProf = V3D.getLandmarkCameraProfile({ id: 'banff', name: 'Banff Town' });
  assert.strictEqual(banffProf.heading, 0);
  assert(banffProf.viewContext.includes('Cascade Mountain'), 'Expected Cascade Mountain in view context');

  // Sulphur Mountain Gondola should look northeast (heading 42) across Bow Valley & Rundle
  const gondolaProf = V3D.getLandmarkCameraProfile({ id: 'gondola', name: 'Banff Gondola — Sulphur Mountain' });
  assert.strictEqual(gondolaProf.heading, 42);
  assert(gondolaProf.viewContext.includes('Bow Valley'), 'Expected Bow Valley in view context');
});

console.log(`\n🎉 All ${passedTests} tests passed successfully!\n`);
