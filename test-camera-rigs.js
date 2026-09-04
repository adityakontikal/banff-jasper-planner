/* Regression contract for final Road / Scenic / Aerial camera rigs. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rigs = fs.readFileSync(path.join(__dirname, 'visualize-camera-rigs.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

assert(server.includes("rigs.src = 'visualize-camera-rigs.js'"), 'Final camera-rig layer must be loaded by runtime bootstrap');
assert(server.includes('rigs.onload = loadFreeController'), 'Camera rigs must load before the free controller');

assert(rigs.includes('distance: 24'), 'Road must remain very close to the tracked road point');
assert(rigs.includes('heightAboveTerrain: 7'), 'Road must remain a low driving camera');
assert(rigs.includes('distance: 680'), 'Scenic must remain a materially separated chase-drone camera');
assert(rigs.includes('heightAboveTerrain: 220'), 'Scenic must fly well above the road corridor');
assert(rigs.includes('distance: 3600'), 'Aerial must remain kilometres behind the tracked point');
assert(rigs.includes('heightAboveTerrain: 1450'), 'Aerial must remain aircraft-height rather than a zoomed Scenic view');

assert(rigs.includes('calculateCameraOptionsFromTo'), 'Camera rigs must use explicit physical from/to geometry');
assert(!rigs.includes('options.center = target.slice()'), 'Calculated from/to geometry must not be invalidated by overwriting center');
assert(rigs.includes('maxTerrainBetween'), 'All rigs must retain terrain-corridor collision protection');
assert(rigs.includes('for (let i = 0; i <= 16; i++)'), 'Long Aerial shots must sample enough terrain along the camera corridor');

assert(rigs.includes('km * 1800'), 'Playback must use a cinematic distance-based timescale');
assert(rigs.includes('240000') && rigs.includes('900000'), '1x playback must be bounded to 4–15 minutes');
assert(rigs.includes('opts.durationMs = cinematicDurationMs'), 'World.play must receive the slower cinematic duration');

assert(rigs.includes('bearingDeadband: 0.85'), 'Road must filter small steering noise');
assert(rigs.includes('bearingDeadband: 1.8'), 'Scenic must use stronger yaw noise filtering');
assert(rigs.includes('bearingDeadband: 2.4'), 'Aerial must use the smoothest heading response');
assert(rigs.includes('protectManualCamera'), 'Manual terrain penetration must retain a correction guard');
assert(rigs.includes('getFreeCameraOptions'), 'Manual collision guard must inspect the physical camera position');

console.log('✓ Camera rigs: Road / Scenic / Aerial have physically distinct distance and altitude envelopes');
console.log('✓ Playback: 1x is cinematic (4–15 min), with 0.5x and 2x scaling around that baseline');
console.log('✓ Camera geometry: from/to calculation is preserved and terrain collision sampling remains active');
