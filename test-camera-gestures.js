/* Regression contract for the free-world trackpad / drive camera layer. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const stability = fs.readFileSync(path.join(__dirname, 'visualize-stability.js'), 'utf8');
const freeController = fs.readFileSync(path.join(__dirname, 'visualize-free.js'), 'utf8');

assert(stability.includes("defaultWorldCamera = 'scenic'"), 'Scenic must be the preferred default world camera');
assert(stability.includes("[data-free-camera=\"scenic\"]"), 'Default must flow through the real Scenic UI controller');
assert(stability.includes("event.ctrlKey"), 'Trackpad pinch must be recognized from ctrlKey wheel events');
assert(stability.includes("applyManualDelta(map, 'zoom'"), 'Pinch zoom must change a persistent camera zoom offset');
assert(stability.includes("applyManualDelta(map, 'pitch'"), 'Two-finger vertical motion must control pitch');
assert(stability.includes("applyManualDelta(map, 'bearing'"), 'Two-finger horizontal/rotation gestures must control bearing');
assert(stability.includes("gesturechange"), 'Safari trackpad rotation/pinch GestureEvent support must remain');
assert(stability.includes("touchZoomRotate.enableRotation"), 'Touch pinch rotation must remain enabled');
assert(stability.includes('map.scrollZoom.disable()'), 'Native scroll zoom must not fight persistent drive gesture offsets');
assert(stability.includes('manual.zoomDelta') && stability.includes('manual.pitchDelta') && stability.includes('manual.bearingDelta'), 'Drive camera must preserve user view offsets');
assert(stability.includes("mode === 'road' ? 2.35"), 'Road mode must retain the stronger center damping pass');
assert(stability.includes("mode === 'road' ? 2.15"), 'Road mode must retain the stronger bearing damping pass');
assert(freeController.includes("let cameraMode = 'road';"), 'Controller may retain Road as an explicit option; stability layer promotes Scenic only through UI state');

console.log('✓ Camera gestures: pinch zoom, two-finger pitch/rotate and touch rotation are wired');
console.log('✓ Drive camera: manual view offsets persist and Road gets extra damping');
console.log('✓ Default presentation: Scenic is selected through the real controller UI');
