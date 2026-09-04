const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load local .env file if present (zero-dependency)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  try {
    const raw = fs.readFileSync(envFile, 'utf8');
    raw.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch (_) {}
}

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolveLocalTerrainConfig() {
  const localTerrainDir = path.join(__dirname, 'terrain');
  const manifestPath = path.join(localTerrainDir, 'terrain-manifest.json');
  const requested = process.env.ROCKIES_LOCAL_TERRAIN === '1';

  if (!requested || !fs.existsSync(localTerrainDir) || !fs.existsSync(manifestPath)) {
    return { enabled: false, verified: false, reason: 'Local terrain is not explicitly enabled with a verified manifest.' };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const source = String(manifest.source || manifest.dataset || '');
    const encoding = String(manifest.encoding || manifest.format || '').toLowerCase();
    const isRealNrcan = /nrcan|natural resources canada/i.test(source);
    const isTerrarium = /terrarium/.test(encoding);
    const explicitlyNonSynthetic = manifest.synthetic === false;

    if (isRealNrcan && isTerrarium && explicitlyNonSynthetic) {
      return { enabled: true, verified: true, reason: 'Verified NRCan Terrarium manifest.' };
    }
    return { enabled: false, verified: false, reason: 'Manifest did not prove genuine non-synthetic NRCan Terrarium data.' };
  } catch (err) {
    return { enabled: false, verified: false, reason: 'Local terrain manifest could not be validated: ' + err.message };
  }
}

const server = http.createServer((req, res) => {
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('400 Bad Request');
    return;
  }
  if (reqPath === '/' || !reqPath) reqPath = '/index.html';

  if (reqPath === '/runtime-config.js') {
    // Google is strictly optional/legacy. The default Visualize experience is
    // a keyless MapLibre/OpenFreeMap/AWS Open Terrain world.
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const localTerrain = resolveLocalTerrainConfig();
    const config = {
      googleMapsApiKey: apiKey,
      freeWorld: true,
      paidApiRequired: false,
      localTerrain: localTerrain.enabled,
      localTerrainVerified: localTerrain.verified,
      localTerrainReason: localTerrain.reason,
      terrainTileUrl: localTerrain.enabled ? '/terrain/{z}/{x}/{y}.png' : null
    };
    const configBody = `
window.ROCKIES_CONFIG = Object.assign(window.ROCKIES_CONFIG || {}, ${JSON.stringify(config)});
(function bootstrapFreeWorld(){
  if (typeof document === 'undefined') return;

  if (!document.getElementById('visualizeFreeCss')) {
    var link = document.createElement('link');
    link.id = 'visualizeFreeCss';
    link.rel = 'stylesheet';
    link.href = 'visualize-free.css';
    document.head.appendChild(link);
  }

  function loadFreeController(){
    if (document.getElementById('visualizeFreeScript')) return;
    var script = document.createElement('script');
    script.id = 'visualizeFreeScript';
    script.src = 'visualize-free.js';
    script.async = false;
    document.body.appendChild(script);
  }

  function loadCameraRigsThenController(){
    if (document.getElementById('visualizeCameraRigsScript')) {
      loadFreeController();
      return;
    }
    var rigs = document.createElement('script');
    rigs.id = 'visualizeCameraRigsScript';
    rigs.src = 'visualize-camera-rigs.js';
    rigs.async = false;
    rigs.onload = loadFreeController;
    rigs.onerror = loadFreeController;
    document.body.appendChild(rigs);
  }

  function loadStabilityThenController(){
    if (document.getElementById('visualizeStabilityScript')) {
      loadCameraRigsThenController();
      return;
    }
    var stability = document.createElement('script');
    stability.id = 'visualizeStabilityScript';
    stability.src = 'visualize-stability.js';
    stability.async = false;
    stability.onload = loadCameraRigsThenController;
    stability.onerror = loadCameraRigsThenController;
    document.body.appendChild(stability);
  }

  var attempts = 0;
  function loadController(){
    if (document.getElementById('visualizeFreeScript')) return;
    if (window.Visualize3D && window.VisualizeWorld) {
      loadStabilityThenController();
      return;
    }
    attempts += 1;
    if (attempts < 240) setTimeout(loadController, 25);
  }
  setTimeout(loadController, 0);
})();
`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(configBody);
    return;
  }

  if (reqPath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  if (reqPath.startsWith('/terrain/')) {
    const localTerrain = resolveLocalTerrainConfig();
    if (!localTerrain.enabled) {
      res.writeHead(404, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      });
      res.end('Local terrain disabled: ' + localTerrain.reason);
      return;
    }

    const terrainFile = path.resolve(__dirname, '.' + path.sep + path.normalize(reqPath));
    if (fs.existsSync(terrainFile)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, immutable'
      });
      fs.createReadStream(terrainFile).pipe(res);
      return;
    }

    // A verified local pyramid may be intentionally sparse. Missing tiles use
    // the consistent AWS Open Data Terrarium DEM rather than fabricated relief.
    const relTile = reqPath.replace(/^\/terrain\//, '');
    const awsFallback = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${relTile}`;
    https.get(awsFallback, (s3Res) => {
      if (s3Res.statusCode === 200) {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, immutable'
        });
        s3Res.pipe(res);
      } else {
        res.writeHead(s3Res.statusCode || 404, {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('Tile not found');
      }
    }).on('error', (err) => {
      res.writeHead(502, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      });
      res.end('Elevation upstream error: ' + err.message);
    });
    return;
  }

  const filePath = path.resolve(__dirname, '.' + path.sep + path.normalize(reqPath));

  if (!filePath.startsWith(__dirname + path.sep) && filePath !== path.join(__dirname, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        if (reqPath.startsWith('/terrain/') || /\.(png|jpg|jpeg|webp|pbf|bin|svg|css|js|json)$/i.test(reqPath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        fs.readFile(path.join(__dirname, 'index.html'), (err2, indexData) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(indexData);
          }
        });
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.js' || ext === '.css' || ext === '.json' || ext === '.html') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Start with an available port, e.g.: PORT=${Number(PORT) + 1} npm start`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});