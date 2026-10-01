import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve('dist');
const headersFile = await readFile(`${root}/_headers`, 'utf8');
const csp = headersFile.match(/Content-Security-Policy: (.+)/)?.[1];
if (!csp) throw new Error('Run pnpm build before starting the test server');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(
      new URL(request.url, 'http://127.0.0.1').pathname,
    );
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${root}/`) || !mime[extname(file)]) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const source = await readFile(file);
    const compress =
      /\.(html|css|js|svg|txt)$/.test(file) &&
      /\bgzip\b/.test(request.headers['accept-encoding'] || '');
    const body = compress ? gzipSync(source) : source;
    response.writeHead(200, {
      'Content-Type': mime[extname(file)],
      'Content-Length': body.length,
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      Vary: 'Accept-Encoding',
      ...(compress ? { 'Content-Encoding': 'gzip' } : {}),
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR')
      response.writeHead(404).end('Not found');
    else {
      console.error('Static test server:', error);
      response.writeHead(500).end('Server error');
    }
  }
});
server.listen(4322, '127.0.0.1', () =>
  console.log('Test-only static server: http://127.0.0.1:4322'),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => server.close());
