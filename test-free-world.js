/* test-free-world.js
 * Focused tests for the keyless/free terrain world.
 */
const assert = require('assert');
const World = require('./visualize-world.js');

const status = World.getStatus();
assert.strictEqual(status.paidApiRequired, false, 'Free World must never require a paid API');
assert.strictEqual(status.renderer, 'maplibre-open-world');
assert(/openfreemap/i.test(World.OPENFREEMAP_STYLE), 'Expected OpenFreeMap basemap');
assert(/amazonaws\.com\/elevation-tiles-prod\/terrarium/.test(World.TERRAIN_TILE_URL), 'Expected AWS Open Data Terrarium DEM');

const route = [
  [-116.212, 51.417],
  [-116.447, 51.681],
  [-116.493, 51.717],
  [-117.224, 52.220]
];
const cumulative = World.computeCumulative(route);
assert(cumulative.totalDistanceMeters > 80000, 'Representative Rockies route must have real cumulative distance');
const halfway = World.sampleRouteAtDistance(
  cumulative.route,
  cumulative.cumulative,
  cumulative.totalDistanceMeters,
  cumulative.totalDistanceMeters / 2
);
assert(halfway && Number.isFinite(halfway.lat) && Number.isFinite(halfway.lng));

const crossing = World.smoothHeading(358, 4, 0.5);
assert(crossing < 5 || crossing > 355, `Heading smoothing must cross north cleanly, got ${crossing}`);

const terrainHeight = World.smoothValue(1500, 1600, 0.2, 35);
assert(terrainHeight > 1500 && terrainHeight < 1510, 'Vertical smoothing should limit terrain popping');

const tripIso = World.buildTripIsoDate('2026-09-27', '07:30');
assert.strictEqual(tripIso, '2026-09-27T07:30:00-06:00');
const sun = World.solarPosition(new Date(tripIso), 51.7, -116.5);
assert(Number.isFinite(sun.azimuth) && Number.isFinite(sun.altitude));

// Rolling median filter rejects DEM tile LOD pop spikes
assert.strictEqual(World.median([1500, 1502, 1900, 1501, 1499]), 1501, 'Median should reject single-sample spike');

// Frame-rate independent exponential heading smoothing
const expHeading = World.smoothHeadingExp(358, 4, 6.0, 0.016);
assert(expHeading > 357 && expHeading < 360, `Exp heading should smoothly ease toward target across north, got ${expHeading}`);
const expHeadingNorth = World.smoothHeadingExp(359, 1, 6.0, 0.5);
assert(expHeadingNorth < 2 || expHeadingNorth > 358, `Exp heading damping across north got ${expHeadingNorth}`);

// Adaptive lookahead for curves vs straights
const straightLookahead = World.computeAdaptiveLookahead(cumulative.route, cumulative.cumulative, cumulative.totalDistanceMeters, 1000, 'road');
assert(straightLookahead >= 200, `Expected straightaway lookahead >= 200, got ${straightLookahead}`);
assert.strictEqual(World.computeAdaptiveLookahead(cumulative.route, cumulative.cumulative, cumulative.totalDistanceMeters, 1000, 'scenic'), 550);
assert.strictEqual(World.computeAdaptiveLookahead(cumulative.route, cumulative.cumulative, cumulative.totalDistanceMeters, 1000, 'aerial'), 1400);

// Subtle scenic yaw bias at iconic landmarks
const bowLakePoint = { lat: 51.668, lng: -116.452 };
const yawBias = World.computeScenicYawBias(bowLakePoint, 'road');
assert(yawBias < -10 && yawBias >= -15, `Expected subtle leftward lake yaw bias at Bow Lake, got ${yawBias}`);
const farPoint = { lat: 51.0, lng: -115.0 };
assert.strictEqual(World.computeScenicYawBias(farPoint, 'road'), 0, 'No bias far from landmarks');
assert.strictEqual(World.computeScenicYawBias(bowLakePoint, 'aerial'), 0, 'Aerial mode should not apply yaw bias');

console.log('✓ Free World: keyless provider contract');
console.log('✓ Free World: route/camera smoothing & adaptive lookahead math');
console.log('✓ Free World: Alberta sun/time math & scenic vista bias');

