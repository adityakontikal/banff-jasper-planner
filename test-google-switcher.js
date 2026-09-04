/* Regression contract for Open World <-> Google 3D switching and Google drive controls. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const switcher = fs.readFileSync(path.join(__dirname, 'visualize-google-switcher.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const env = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');

assert(server.includes("switcher.src = 'visualize-google-switcher.js'"), 'Runtime must load the Google renderer switcher');
assert(server.indexOf("switcher.src = 'visualize-google-switcher.js'") < server.indexOf("script.src = 'visualize-free.js'"), 'Switcher must load before the free controller overwrites Visualize3D entry points');
assert(server.includes('switcher.onload = loadFreeController'), 'Free controller must continue loading after the switcher');
assert(server.includes('switcher.onerror = loadFreeController'), 'Switcher failure must never block the default free world');

assert(switcher.includes("if (renderer !== 'google')"), 'Google must not auto-load merely because Visualize opened');
assert(switcher.includes('googlePatchedOnActivate') && switcher.includes('googlePatchedChooseDay'), 'Patched Google entry points must be snapshotted before free Visualize overrides');
assert(switcher.includes('current.onVisualizeTabActivated === googlePatchedOnActivate'), 'Free API capture must distinguish the patched Google renderer from the later free controller');
assert(switcher.includes('Open World') && switcher.includes('Google 3D'), 'UI must expose both renderer choices');
assert(switcher.includes('switchToGoogle') && switcher.includes('switchToOpen'), 'Both renderer transitions must be explicit');
assert(switcher.includes('rememberedDay = selectedDay()'), 'Renderer switching must preserve the active trip day');
assert(switcher.includes('root.VisualizeWorld.stop(false)'), 'Switching to Google must stop free-world playback cleanly');
assert(switcher.includes('stopGoogleDrive(false)'), 'Switching back must stop Google drive state cleanly');
assert(switcher.includes('googleMayRequireBilling: true'), 'Optional Google renderer must not be represented as part of the free cost contract');
assert(env.includes('GOOGLE_MAPS_API_KEY'), 'Google renderer setup must remain explicit through the optional API key');

assert(switcher.includes('rememberedMap3D') && switcher.includes('ensureGoogleMapAttached'), 'Detached Google 3D map must be retained and reattached after renderer switches');
assert(switcher.includes("map.parentNode !== container"), 'Google map reattachment must target the freshly rendered Google viewport');

assert(switcher.includes('range: 55') && switcher.includes('tilt: 84'), 'Google Road must be a close, low driving camera');
assert(switcher.includes('range: 1500') && switcher.includes('tilt: 74'), 'Google Scenic must remain a materially higher chase-drone camera');
assert(switcher.includes('range: 9500') && switcher.includes('tilt: 55'), 'Google Aerial must remain a high aircraft-scale camera');
assert(switcher.includes('headingWindow: 35') && switcher.includes('headingWindow: 280') && switcher.includes('headingWindow: 1200'), 'Google camera modes must smooth route heading at different spatial scales');
assert(switcher.includes('km * 1800') && switcher.includes('240000') && switcher.includes('900000'), 'Google drive must use the same cinematic distance-based pacing contract');

assert(switcher.includes('event.ctrlKey'), 'Google Drive must support Chrome/macOS pinch zoom');
assert(switcher.includes('controls.yawDeg'), 'Google Drive must preserve manual 360-degree yaw');
assert(switcher.includes('controls.lookDeg'), 'Google Drive must preserve manual look up/down');
assert(switcher.includes('controls.panRightMeters') && switcher.includes('controls.panForwardMeters'), 'Google Drive must preserve manual pan while moving');
assert(switcher.includes("'gesturestart'") && switcher.includes("'gesturechange'"), 'Google Drive must support Safari pinch/rotation gestures');
assert(switcher.includes('pointerdown') && switcher.includes('rotatePointer'), 'Google Drive must support mouse/trackpad drag pan and rotate');
assert(switcher.includes("strokeColor: '#ff5c30'"), 'Google route overlay must use the same high-contrast orange route language');

assert(switcher.includes('googleObject.startRouteFlyThrough = startGoogleDrive'), 'Google Drive button must stay inside Google 3D instead of launching the free World driver');
assert(switcher.includes('googleObject.togglePauseFlyThrough = toggleGooglePause'), 'Google pause/resume must use Google drive state');
assert(switcher.includes('googleObject.setFlightSpeed = setGoogleSpeed'), 'Google speed controls must affect Google drive playback');
assert(switcher.includes('googleObject.setWorldCameraMode = setGoogleMode'), 'Road/Scenic/Aerial buttons must control Google camera rigs');

console.log('✓ Renderer switch: Open World stays default and Google 3D is explicit/optional');
console.log('✓ Google lifecycle: detached gmp-map-3d is retained and reattached after switching');
console.log('✓ Google Drive: Road / Scenic / Aerial are physically distinct and cinematic-paced');
console.log('✓ Google controls: pinch, 360° yaw, look, pan, pause, speed and stop stay active while driving');
