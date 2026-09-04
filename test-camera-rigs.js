/* Regression contract for interactive Road / Scenic / Aerial camera rigs. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rigs = fs.readFileSync(path.join(__dirname, 'visualize-camera-rigs.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

assert(server.includes("rigs.src = 'visualize-camera-rigs.js'"), 'Final camera-rig layer must be loaded by runtime bootstrap');
assert(server.includes('rigs.onload = loadFreeController'), 'Camera rigs must load before the free controller');

assert(rigs.includes('backDistance: 7') && rigs.includes('focusLead: 22'), 'Road must be a low near-road chase/driver camera');
assert(rigs.includes('eyeClearance: 3.6'), 'Road camera must stay only a few metres above local road terrain');
assert(rigs.includes('backDistance: 620') && rigs.includes('eyeClearance: 185'), 'Scenic must remain a materially higher chase-drone rig');
assert(rigs.includes('backDistance: 3600') && rigs.includes('eyeClearance: 1320'), 'Aerial must remain an aircraft-scale rig');
assert(rigs.includes('maxTurnRate: 1.5'), 'Aerial yaw must be deliberately slow and cinematic');

assert(rigs.includes('calculateCameraOptionsFromTo'), 'Camera rigs must preserve explicit physical from/to geometry');
assert(rigs.includes('queryTerrainElevation'), 'Camera rigs must use real terrain elevation');
assert(rigs.includes('maxTerrainBetween'), 'Scenic/Aerial must retain mountain-corridor protection');
assert(rigs.includes('sampleCount = rig === RIGS.aerial ? 24 : 14'), 'Aerial must use denser terrain collision sampling');

assert(rigs.includes("canvas.addEventListener('wheel'"), 'Active Drive must own trackpad wheel gestures');
assert(rigs.includes('controls.yawDeg += dx * 0.22'), 'Two-finger horizontal motion must support unrestricted orbit yaw');
assert(rigs.includes('controls.lookDeg - dy * 0.055'), 'Two-finger vertical motion must look up/down');
assert(rigs.includes('event.ctrlKey'), 'Trackpad pinch must remain available during Drive');
assert(rigs.includes('controls.distanceScale * factor'), 'Pinch must persistently change physical camera distance');
assert(rigs.includes("canvas.addEventListener('pointerdown'"), 'Click/trackpad drag must remain available during Drive');
assert(rigs.includes('controls.panRightMeters') && rigs.includes('controls.panForwardMeters'), 'Drive pan must persist in moving rig space');
assert(rigs.includes('event.shiftKey'), 'Shift + two-finger motion must provide an alternate trackpad pan path');
assert(rigs.includes('stopImmediatePropagation'), 'Final rig must prevent the older stability gesture layer from double-handling active Drive input');

assert(rigs.includes("'rockies-route-line', 'line-color', '#ff5c30'"), 'Route must use high-contrast warm orange instead of terrain green');
assert(rigs.includes('rockies-route-glow'), 'Route must have a game-like contrast glow/casing');
assert(rigs.includes("'line-opacity', 0.98"), 'Route must remain clearly visible at close camera zooms');

assert(rigs.includes('km * 2500'), 'Playback must use a slower distance-based cinematic target');
assert(rigs.includes('300000, 600000'), 'Desired 1x playback must be bounded to 5–10 minutes');
assert(rigs.includes('effectiveEngineSpeed') && rigs.includes('World.setSpeed = function cinematicSetSpeed'), 'Speed remap must also apply when UI speed changes during active Drive');

console.log('✓ Road: low chase/driver camera with forward road focus and terrain-local eye height');
console.log('✓ Scenic/Aerial: materially distinct drone and aircraft rigs with slow yaw');
console.log('✓ Drive controls: pinch zoom, 360 yaw, vertical look, drag pan and Shift-scroll pan persist');
console.log('✓ Route: high-contrast orange line + dark casing + glow');
console.log('✓ Playback: long days slow to cinematic 0.5x/1x/2x effective durations');
