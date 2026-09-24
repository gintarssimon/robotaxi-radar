import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const base = resolve('public');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = resolve(base, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(base + sep)) { res.writeHead(403).end(); return; }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"not_found"}'); }
}).listen(Number(process.env.PORT || 5173), '0.0.0.0', () => console.log('Vorschau läuft auf Port ' + (process.env.PORT || 5173)));
