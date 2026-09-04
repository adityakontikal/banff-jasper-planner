const http = require('http');
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
    // Google is now strictly optional/legacy. The default Visualize experience is
    // a keyless MapLibre/OpenFreeMap/AWS Open Terrain world.
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const config = {
      googleMapsApiKey: apiKey,
      freeWorld: true,
      paidApiRequired: false
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

  var attempts = 0;
  function loadController(){
    if (document.getElementById('visualizeFreeScript')) return;
    if (window.Visualize3D && window.VisualizeWorld) {
      var script = document.createElement('script');
      script.id = 'visualizeFreeScript';
      script.src = 'visualize-free.js';
      script.async = false;
      document.body.appendChild(script);
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

  const filePath = path.resolve(__dirname, '.' + path.sep + path.normalize(reqPath));

  if (!filePath.startsWith(__dirname + path.sep) && filePath !== path.join(__dirname, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
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
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
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
