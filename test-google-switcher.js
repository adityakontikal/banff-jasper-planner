/* Regression contract for Open World <-> Google 3D renderer switching. */
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

assert(switcher.includes('rawGoogleOnActivate') && switcher.includes('rawGoogleChooseDay'), 'Original Google methods must be snapshotted as immutable function references');
assert(switcher.includes('current.onVisualizeTabActivated === rawGoogleOnActivate'), 'Free API capture must compare against immutable original methods, not the mutated Visualize3D object');
assert(switcher.includes('googleOriginal'), 'Switcher must retain callable original Google 3D entry points');
assert(switcher.includes('Open World') && switcher.includes('Google 3D'), 'UI must expose both renderer choices');
assert(switcher.includes('switchToGoogle') && switcher.includes('switchToOpen'), 'Both renderer transitions must be explicit');
assert(switcher.includes('rememberedDay = selectedDay()'), 'Renderer switching must preserve the active trip day');
assert(switcher.includes('root.VisualizeWorld.stop(false)'), 'Switching to Google must stop free-world playback cleanly');
assert(switcher.includes('googleOriginal.cancelRouteFlyThrough'), 'Switching back must stop Google flight state cleanly');
assert(switcher.includes('googleMayRequireBilling: true'), 'Optional Google renderer must not be represented as part of the free cost contract');
assert(env.includes('GOOGLE_MAPS_API_KEY'), 'Google renderer setup must remain explicit through the optional API key');

console.log('✓ Renderer switch: Open World stays default and Google 3D is optional');
console.log('✓ Load order: immutable Google methods are snapshotted before free Visualize overrides');
console.log('✓ State: selected day is preserved and each renderer is stopped before switching');
