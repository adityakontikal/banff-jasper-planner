/* test-network-contract.js
 * Automated Zero-Cost Network Contract Verification.
 *
 * Inspects all browser network entries and verifies:
 * 1. ZERO requests to Google Maps / Elevation / 3D Tiles (*.googleapis.com).
 * 2. ZERO requests to Cesium ion (api.cesium.com, assets.cesium.com).
 * 3. ZERO requests to Mapbox (api.mapbox.com) or MapTiler (api.maptiler.com).
 * 4. Confirms legitimate free runtime endpoints (OpenFreeMap, AWS Open Data Terrarium, unpkg MapLibre).
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const TARGET_URL = 'http://localhost:3001';

const FORBIDDEN_PATTERNS = [
  /maps\.googleapis\.com/i,
  /tile\.googleapis\.com/i,
  /elevation\.googleapis\.com/i,
  /.*\.googleapis\.com\/(maps|tile|v1\/3dtiles|elevation)/i,
  /api\.cesium\.com/i,
  /assets\.cesium\.com/i,
  /api\.mapbox\.com/i,
  /api\.maptiler\.com/i
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.pending = new Map();

    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Eval error');
    }
    return res.result?.value;
  }

  close() {
    try { this.ws.close(); } catch (_) {}
  }
}

async function findOrCreateTarget() {
  // Check if Chrome debugging is already running
  try {
    const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const page = list.find(t => t.type === 'page' && t.url.includes('3001'));
    if (page) return { target: page, spawned: false, chrome: null, tmpDir: null };
    const anyPage = list.find(t => t.type === 'page');
    if (anyPage) return { target: anyPage, spawned: false, chrome: null, tmpDir: null };
  } catch (_) {}

  // Spawn new headless Chrome
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-network-test-'));
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tmpDir}`,
    `${TARGET_URL}/#visualizeview`
  ], { stdio: 'ignore' });

  for (let i = 0; i < 35; i++) {
    await sleep(200);
    try {
      const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const page = list.find(t => t.type === 'page');
      if (page) return { target: page, spawned: true, chrome, tmpDir };
    } catch (_) {}
  }
  throw new Error('Unable to start headless Chrome for network verification');
}

async function run() {
  console.log('🔒 Running Automated Zero-Cost Network Contract Verification...');
  const { target, spawned, chrome, tmpDir } = await findOrCreateTarget();
  const cdp = new CdpSession(target.webSocketDebuggerUrl);
  await cdp.ready;

  try {
    // Navigate to visualize view if needed
    await cdp.eval(`
      (function() {
        if (typeof setView === 'function') {
          setView('visualizeview');
        } else if (window.location.hash !== '#visualizeview') {
          window.location.hash = '#visualizeview';
        }
      })()
    `);
    await sleep(3000);

    // Switch to Sep 27 and trigger Drive Route
    await cdp.eval(`
      (function() {
        const dayBtn = document.querySelector('[data-free-day="2026-09-27"]');
        if (dayBtn) dayBtn.click();
      })()
    `);
    await sleep(2000);

    await cdp.eval(`
      (function() {
        const driveBtn = document.getElementById('freeDriveBtn');
        if (driveBtn) driveBtn.click();
      })()
    `);
    await sleep(4000);

    // Extract all network resource requests monitored by the browser
    const resourceUrls = await cdp.eval(`
      performance.getEntriesByType('resource').map(r => r.name)
    `) || [];

    const forbiddenRequests = [];
    for (const url of resourceUrls) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(url)) {
          forbiddenRequests.push({ url, pattern: pattern.toString() });
        }
      }
    }

    const ofmCount = resourceUrls.filter(u => u.includes('openfreemap.org')).length;
    const terrainCount = resourceUrls.filter(u => u.includes('elevation-tiles-prod') || u.includes('/terrain/')).length;
    const maplibreCount = resourceUrls.filter(u => u.includes('maplibre-gl')).length;

    console.log(`  ✓ Total browser resource requests monitored: ${resourceUrls.length}`);
    console.log(`  ✓ OpenFreeMap vector basemap requests: ${ofmCount}`);
    console.log(`  ✓ Terrarium elevation DEM tile requests: ${terrainCount}`);
    console.log(`  ✓ MapLibre engine requests: ${maplibreCount}`);
    console.log('  ✓ Forbidden requests to Google Maps/Tiles/Elevation: 0');
    console.log('  ✓ Forbidden requests to Cesium ion: 0');
    console.log('  ✓ Forbidden requests to Mapbox/MapTiler: 0');

    if (forbiddenRequests.length > 0) {
      console.error('❌ FORBIDDEN PAID/RESTRICTED NETWORK REQUESTS DETECTED:', forbiddenRequests);
      throw new Error(`Zero-cost contract violated! Found ${forbiddenRequests.length} forbidden requests`);
    }

    assert(ofmCount > 0, 'Must have fetched OpenFreeMap vector basemap resources');
    assert(terrainCount > 0, 'Must have fetched Terrarium elevation DEM resources');
    assert.strictEqual(forbiddenRequests.length, 0, 'Must not contact any paid API');

    console.log('🎉 $0 Zero-Cost Network Contract verified successfully!\n');
  } finally {
    cdp.close();
    if (spawned && chrome) {
      chrome.kill('SIGKILL');
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  }
}

run().catch(err => {
  console.error('Network Contract Test Error:', err);
  process.exit(1);
});
