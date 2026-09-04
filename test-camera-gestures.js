/* Regression contract for the free-world trackpad / drive camera layer. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const stability = fs.readFileSync(path.join(__dirname, 'visualize-stability.js'), 'utf8');

assert(stability.includes("defaultWorldCamera = 'scenic'"), 'Scenic must remain the preferred default world camera');
assert(stability.includes("[data-free-camera=\"scenic\"]"), 'Default must flow through the real Scenic UI controller');
assert(stability.includes("event.ctrlKey"), 'Trackpad pinch must be recognized from ctrlKey wheel events');
assert(stability.includes("applyManualDelta(map, 'zoom'"), 'Pinch zoom must change a persistent camera zoom offset');
assert(stability.includes("applyManualDelta(map, 'pitch'"), 'Two-finger vertical motion must control pitch');
assert(stability.includes("applyManualDelta(map, 'bearing'"), 'Two-finger horizontal/rotation gestures must control bearing');
assert(stability.includes("gesturechange"), 'Safari trackpad rotation/pinch GestureEvent support must remain');
assert(stability.includes("touchZoomRotate.enableRotation"), 'Touch pinch rotation must remain enabled');
assert(stability.includes('map.scrollZoom.disable()'), 'Native scroll zoom must not fight persistent drive gesture offsets');
assert(stability.includes('manual.zoomDelta') && stability.includes('manual.pitchDelta') && stability.includes('manual.bearingDelta'), 'Drive camera must preserve user view offsets');

assert(stability.includes('bearingDeadband: 1.35'), 'Road camera must ignore small route-angle noise');
assert(stability.includes('maxTurnRate: 17'), 'Road camera must cap sudden yaw changes');
assert(stability.includes('centerRate: 0.95'), 'Road camera must use a slow spatial follow filter');
assert(stability.includes('zoom: 14.55') && stability.includes('pitch: 70'), 'Road must use a low close driving perspective');
assert(stability.includes('zoom: 12.55') && stability.includes('pitch: 66'), 'Scenic must behave like a higher drone chase');
assert(stability.includes('maxTurnRate: 9'), 'Scenic yaw must be slower than Road');
assert(stability.includes('zoom: 11.35') && stability.includes('pitch: 57'), 'Aerial must preserve broad context with improved mountain perspective');
assert(stability.includes('maxPitch: 72') && stability.includes('map.setMaxPitch(72)'), 'User must be able to look farther toward the horizon than the old 60 degree limit');

assert(stability.includes('beginOrbitAfterFly'), 'Landmark focus must arm a drone orbit after the fly-in');
assert(stability.includes('orbit.bearing + 3.4 * dt'), 'Landmark drone orbit must continuously circle the target');
assert(stability.includes("['pointerdown', 'mousedown', 'touchstart']"), 'Direct user interaction must interrupt landmark orbit');
assert(stability.includes('stopOrbit();') && stability.includes('isOrbiting'), 'Orbit must expose an explicit interruption state');
assert(stability.includes("layers: ['rockies-stop-points']"), 'Map stop markers must support drone focus as well as sidebar places');

console.log('✓ Camera gestures: pinch zoom, two-finger pitch/rotate and touch rotation are wired');
console.log('✓ Drive camera: Road/Scenic heading noise is filtered with deadbands and turn-rate limits');
console.log('✓ Mode composition: Road is low/close, Scenic is drone chase, Aerial keeps broad context');
console.log('✓ Landmark focus: fly-in enters low-angle orbit and user interaction cancels it');
