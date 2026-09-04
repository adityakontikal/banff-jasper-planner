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

console.log('✓ Free World: keyless provider contract');
console.log('✓ Free World: route/camera smoothing math');
console.log('✓ Free World: Alberta sun/time math');
