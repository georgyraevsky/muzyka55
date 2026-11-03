// Минимальный статический сервер для локальной проверки.
// node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.argv[2] ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    const target = normalize(join(ROOT, pathname));
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(target);
    if (info.isDirectory()) {
      const body = await readFile(join(target, 'index.html'));
      res.writeHead(200, { 'Content-Type': TYPES['.html'] }).end(body);
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} at http://127.0.0.1:${PORT}`);
});