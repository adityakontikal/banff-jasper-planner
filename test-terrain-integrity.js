/* test-terrain-integrity.js
 * Regression guards for terrain authenticity and MapLibre stability.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const stability = fs.readFileSync(path.join(root, 'visualize-stability.js'), 'utf8');

assert(
  server.includes("process.env.ROCKIES_LOCAL_TERRAIN === '1'"),
  'Local terrain must require explicit opt-in'
);
assert(
  server.includes("terrain-manifest.json"),
  'Local terrain must require a verification manifest'
);
assert(
  server.includes('manifest.synthetic === false'),
  'Manifest must explicitly prove terrain is non-synthetic'
);
assert(
  !server.includes('const hasLocalTerrain = fs.existsSync(localTerrainDir);'),
  'A terrain directory alone must never activate local terrain'
);
assert(
  server.indexOf('visualize-stability.js') < server.indexOf('visualize-free.js'),
  'Terrain stability guard must load before the free Visualize controller'
);

assert(
  stability.includes("terrainSkirtLength: 'none'"),
  'Automatic terrain skirts must remain disabled while they produce vertical wall artifacts'
);
assert(
  stability.includes('maxZoom: 15') && stability.includes('maxzoom: 15'),
  'Map and Terrarium DEM must share the native z15 ceiling'
);
assert(
  stability.includes("terrainTileUrl: null"),
  'Default stability path must use the consistent AWS/Open Data DEM, not leftover local tiles'
);
assert(
  !fs.existsSync(path.join(root, 'tools/build-terrain/generate_terrarium_tiles.py')),
  'Synthetic mountain generator must not exist'
);
assert(
  !fs.existsSync(path.join(root, 'tools/build-terrain/local_terrain_manifest.json')),
  'Synthetic terrain manifest must not exist'
);

console.log('✓ Terrain integrity: local DEM requires explicit verified non-synthetic NRCan manifest');
console.log('✓ Terrain stability: no skirts, no z13 DEM overzoom, stability guard loads first');
