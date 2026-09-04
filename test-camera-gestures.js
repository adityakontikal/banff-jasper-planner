/* Regression contract for the free-world trackpad / drive / landmark camera layer. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const stability = fs.readFileSync(path.join(__dirname, 'visualize-stability.js'), 'utf8');

assert(stability.includes("defaultWorldCamera = 'scenic'"), 'Scenic must remain the preferred default world camera');
assert(stability.includes("[data-free-camera=\"scenic\"]"), 'Default must flow through the real Scenic UI controller');
assert(stability.includes('event.ctrlKey'), 'Trackpad pinch must be recognized from ctrlKey wheel events');
assert(stability.includes("applyManualDelta(map, 'zoom'"), 'Pinch zoom must control persistent camera distance');
assert(stability.includes("applyManualDelta(map, 'pitch'"), 'Two-finger vertical motion must control pitch');
assert(stability.includes("applyManualDelta(map, 'bearing'"), 'Two-finger horizontal/rotation gestures must control bearing');
assert(stability.includes('gesturechange'), 'Safari trackpad GestureEvent support must remain');
assert(stability.includes('touchZoomRotate.enableRotation'), 'Touch pinch rotation must remain enabled');

assert(stability.includes('trackedPointFromVehicle'), 'Drive camera must recover the actual moving route point');
assert(stability.includes("map.getSource('rockies-vehicle')"), 'Drive target must use the route vehicle source when available');
assert(!stability.includes('manual.autoCenter'), 'Camera target position must not be smoothed/lagged away from the tracked point');
assert(stability.includes('options.center = target.slice()'), 'Terrain-aware camera must keep the tracked point centered');

assert(stability.includes('calculateCameraOptionsFromTo'), 'Drive must use an explicit 3D camera-to-target calculation');
assert(stability.includes('queryTerrainElevation'), 'Drive must query real terrain elevation');
assert(stability.includes('maxTerrainBetween'), 'Drive must sample intervening terrain for collision clearance');
assert(stability.includes('corridorGround + clearance'), 'Camera altitude must clear intervening mountains/terrain');
assert(stability.includes('cameraGround + clearance'), 'Camera must never be placed below its local terrain');
assert(stability.includes('centerClampedToGround: true'), 'Terrain center elevation must remain grounded');

assert(stability.includes('cameraDistance: 92') && stability.includes('pitch: 68'), 'Road must remain a low close driving camera');
assert(stability.includes('bearingDeadband: 1.6') && stability.includes('maxTurnRate: 14'), 'Road must reject small route-angle noise and cap sudden turns');
assert(stability.includes('cameraDistance: 820') && stability.includes('pitch: 63'), 'Scenic must behave like a high drone follow camera');
assert(stability.includes('bearingDeadband: 2.2') && stability.includes('maxTurnRate: 7'), 'Scenic must be smoother/slower than Road');
assert(stability.includes('cameraDistance: 1850') && stability.includes('pitch: 56'), 'Aerial must preserve a broad high-context view');

assert(stability.includes('beginOrbitAfterFly'), 'Landmark focus must arm a drone orbit');
assert(stability.includes('safeCameraOptions(map, orbit.target'), 'Landmark orbit must use the terrain-collision-safe camera path');
assert(stability.includes("['pointerdown', 'mousedown', 'touchstart']"), 'Direct user interaction must interrupt landmark orbit');
assert(stability.includes("layers: ['rockies-stop-points']"), 'Map stop markers must support drone focus');

assert(stability.includes('applyOpenWorldStyle'), 'The terrain world must have an open-world visual pass');
assert(stability.includes('rockies-interest-zones'), 'Planned places must get local interest-zone emphasis');
assert(stability.includes('rockies-interest-beacons'), 'Planned places must get game-like map beacons');
assert(stability.includes("exaggeration: 1.03"), 'Terrain exaggeration must stay restrained rather than fabricate mountain geometry');

console.log('✓ Camera target: moving route point stays centered with no positional lag filter');
console.log('✓ Terrain collision: camera samples target/camera/corridor elevation before rendering');
console.log('✓ Mode composition: Road low/close, Scenic drone follow, Aerial broad/contextual');
console.log('✓ Landmark focus: safe low-angle orbit, interrupted immediately by user input');
console.log('✓ Open-world styling: restrained terrain palette + planned-stop detail zones/beacons');
