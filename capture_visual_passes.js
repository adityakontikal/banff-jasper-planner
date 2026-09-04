/* capture_visual_passes.js
 * Comprehensive Multi-Pass Visual Validation and Screenshot Capture.
 *
 * Executes 4 required passes:
 * Pass 1: Sep 27 (Louise -> Bow -> Peyto -> Icefield)
 * Pass 2: Sep 26 (Banff / Minnewanka / Johnston)
 * Pass 3: Sep 28 (Jasper -> Medicine -> Maligne)
 * Pass 4: Mobile Responsive (390 x 844)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9222;

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

class Cdp {
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

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filename, buffer);
    console.log(`  📸 Saved screenshot: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
    await this.send('Emulation.setVisibleSize', { width, height });
  }

  close() {
    try { this.ws.close(); } catch (_) {}
  }
}

async function main() {
  console.log('🎬 Starting Multi-Pass Visual Validation Suite...\n');
  const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const page = list.find(t => t.type === 'page' && t.url.includes('3001')) || list.find(t => t.type === 'page');
  if (!page) throw new Error('No active page found on port 9222');

  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');

  const outDir = path.resolve(__dirname, 'visual_passes');
  fs.mkdirSync(outDir, { recursive: true });

  try {
    // Desktop Viewport
    await cdp.setViewport(1440, 900, false);
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(3500);

    await cdp.eval(`setView('visualizeview');`);
    await sleep(3500);

    // ==========================================
    // ==========================================
    // PASS 1: Sep 27 (Lake Louise -> Bow Lake -> Peyto -> Columbia Icefield)
    // ==========================================
    console.log('--- PASS 1: Sep 27 Parkway Showcase ---');
    await cdp.eval(`
      (function() {
        const btn = document.querySelector('[data-free-day="2026-09-27"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass1_sep27_01_overview.png'));

    // Lake Louise approach in Road mode (~24% progress)
    await cdp.eval(`
      (function() {
        const btn = document.querySelector('[data-free-camera="road"]');
        if (btn) btn.click();
        VisualizeWorld.setProgress(0.24);
      })()
    `);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass1_sep27_02_road_louise.png'));

    // Scrub to Bow Lake (~42% progress)
    await cdp.eval(`VisualizeWorld.setProgress(0.42);`);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass1_sep27_03_road_bow_lake.png'));

    // Scrub to Columbia Icefield (~64% progress)
    await cdp.eval(`VisualizeWorld.setProgress(0.64);`);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass1_sep27_04_road_icefield.png'));

    // Switch to Scenic mode (95m altitude)
    await cdp.eval(`
      (function() {
        const btn = document.querySelector('[data-free-camera="scenic"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(3000);
    await cdp.screenshot(path.join(outDir, 'pass1_sep27_05_scenic_icefield.png'));

    // Switch to Aerial mode (480m altitude)
    await cdp.eval(`
      (function() {
        const btn = document.querySelector('[data-free-camera="aerial"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(3000);
    await cdp.screenshot(path.join(outDir, 'pass1_sep27_06_aerial_icefield.png'));

    // ==========================================
    // PASS 2: Sep 26 (Banff / Minnewanka / Johnston Canyon)
    // ==========================================
    console.log('\n--- PASS 2: Sep 26 Banff & Minnewanka ---');
    await cdp.eval(`
      (function() {
        const btn = document.querySelector('[data-free-camera="road"]');
        if (btn) btn.click();
        const dayBtn = document.querySelector('[data-free-day="2026-09-26"]');
        if (dayBtn) dayBtn.click();
      })()
    `);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass2_sep26_01_overview.png'));

    // Drive along Minnewanka / Bow Valley (~35% progress)
    await cdp.eval(`VisualizeWorld.setProgress(0.35);`);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass2_sep26_02_road_banff.png'));

    // ==========================================
    // PASS 3: Sep 28 (Jasper -> Medicine Lake -> Maligne Lake)
    // ==========================================
    console.log('\n--- PASS 3: Sep 28 Jasper & Maligne Basin ---');
    await cdp.eval(`
      (function() {
        const dayBtn = document.querySelector('[data-free-day="2026-09-28"]');
        if (dayBtn) dayBtn.click();
      })()
    `);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass3_sep28_01_overview.png'));

    // Drive into Maligne Basin (~65% progress)
    await cdp.eval(`VisualizeWorld.setProgress(0.65);`);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass3_sep28_02_maligne_basin.png'));

    // ==========================================
    // PASS 4: Mobile Responsive (390 x 844)
    // ==========================================
    console.log('\n--- PASS 4: Mobile Responsive 390x844 ---');
    await cdp.setViewport(390, 844, true);
    await cdp.eval(`VisualizeWorld.setProgress(0.42);`);
    await sleep(3500);
    await cdp.screenshot(path.join(outDir, 'pass4_mobile_390x844_sep27.png'));

    // Reset back to standard desktop viewport
    await cdp.setViewport(1440, 900, false);
    console.log('\n🎉 All 4 Visual Passes completed and recorded successfully!');
  } finally {
    cdp.close();
  }
}

main().catch(err => {
  console.error('Visual Pass Capture Error:', err);
  process.exit(1);
});
