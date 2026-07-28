/* ============================================================================
   Nocturne — static host + beta signup endpoint
   Zero dependencies. Node 18+.

     node server.js                 # http://localhost:3000
     PORT=8080 node server.js

   Submissions are appended as JSON Lines to data/submissions.jsonl
   (dir 0700, file 0600, git-ignored). Each record:

     { email, message, source, timestamp, ip_hash, user_agent, ref }

   To forward submissions to your own email service later, set:

     EMAIL_ENDPOINT=https://…       # receives POST { email, message, … }
     EMAIL_ENDPOINT_TOKEN=…         # sent as Authorization: Bearer <token>

   Forwarding is fire-and-forget: the record is already durable on disk, so a
   failing endpoint never costs a signup.
   ========================================================================= */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE = path.join(DATA_DIR, 'submissions.jsonl');

const EMAIL_ENDPOINT = process.env.EMAIL_ENDPOINT || '';
const EMAIL_ENDPOINT_TOKEN = process.env.EMAIL_ENDPOINT_TOKEN || '';

/* Salt for IP hashing. Ephemeral unless pinned, so hashes are not reversible
   to an address and do not survive a restart as a stable identifier. */
const IP_SALT = process.env.IP_SALT || crypto.randomBytes(16).toString('hex');

const MAX_BODY = 16 * 1024;          // request bytes
const MAX_EMAIL = 254;               // RFC 5321
const MAX_MESSAGE = 1000;            // matches the textarea maxlength

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/* ----------------------------------------------------------------- storage */
function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(DATA_DIR, 0o700); } catch { /* non-POSIX */ }
  if (!fs.existsSync(STORE)) {
    fs.writeFileSync(STORE, '', { mode: 0o600 });
  }
  try { fs.chmodSync(STORE, 0o600); } catch { /* non-POSIX */ }
}

async function persist(record) {
  await fsp.appendFile(STORE, JSON.stringify(record) + '\n', { mode: 0o600 });
}

/* -------------------------------------------------------------- rate limit
   In-memory sliding window, keyed by hashed IP. Fine for a single-process
   landing page; swap for a shared store if this ever runs multi-instance. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
  }
}, WINDOW_MS).unref();

/* ------------------------------------------------------------------ helpers */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function hash(value) {
  return crypto.createHash('sha256').update(IP_SALT + value).digest('hex').slice(0, 16);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

/* ------------------------------------------------------------- forwarding */
async function forward(record) {
  if (!EMAIL_ENDPOINT) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (EMAIL_ENDPOINT_TOKEN) headers.Authorization = `Bearer ${EMAIL_ENDPOINT_TOKEN}`;
    const res = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(record),
      signal: controller.signal
    });
    if (!res.ok) console.warn(`[forward] ${EMAIL_ENDPOINT} → ${res.status}`);
  } catch (err) {
    console.warn(`[forward] failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------------------------------- no-JS fallback
   The page posts via fetch when JS is on. With JS off the same form does a
   native POST, so answer that in HTML rather than dropping the signup. */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sendHtml(res, status, title, body) {
  const page = Buffer.from(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — Nocturne</title>
<link rel="stylesheet" href="/assets/css/main.css">
</head><body>
<main class="wrap" style="padding-block:18vh;max-width:640px">
  <p class="kicker"><span class="mono">—</span> Nocturne</p>
  <h1 class="h2">${escapeHtml(title)}</h1>
  <p class="lede">${escapeHtml(body)}</p>
  <p style="margin-top:36px"><a class="btn btn--ghost" href="/">Back to the site</a></p>
</main>
</body></html>`);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': page.length,
    'Cache-Control': 'no-store'
  });
  res.end(page);
}

/* -------------------------------------------------------------- subscribe */
async function handleSubscribe(req, res) {
  const contentType = String(req.headers['content-type'] || '');
  const isForm = contentType.includes('application/x-www-form-urlencoded');

  // Respond in whichever dialect the client spoke.
  const fail = (status, message) => isForm
    ? sendHtml(res, status, 'That didn’t go through', message)
    : sendJson(res, status, { error: message });

  let raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    return fail(err.statusCode || 400, 'That request was too large.');
  }

  let payload;
  if (isForm) {
    payload = Object.fromEntries(new URLSearchParams(raw));
  } else {
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      return fail(400, 'Malformed request.');
    }
  }

  // Honeypot: silently accept so bots don't learn they were caught.
  if (typeof payload.company_website === 'string' && payload.company_website.trim()) {
    const decoy = 'NB-' + hash(String(Date.now())).slice(0, 6).toUpperCase();
    return isForm
      ? sendHtml(res, 200, 'You’re on the list.', 'We’ll email you when a seat opens.')
      : sendJson(res, 200, { ok: true, ref: decoy });
  }

  const ipKey = hash(clientIp(req));
  if (rateLimited(ipKey)) {
    return fail(429, 'Too many attempts. Try again in a few minutes.');
  }

  const email = String(payload.email || '').trim().slice(0, MAX_EMAIL);
  if (!email) return fail(400, 'An email address is required.');
  if (!EMAIL_RE.test(email)) return fail(400, 'That address doesn’t look valid.');

  const message = String(payload.message || '').trim().slice(0, MAX_MESSAGE);
  const source = String(payload.source || 'unknown').trim().slice(0, 32);
  const ref = 'NB-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const record = {
    email,
    message,
    source,
    timestamp: new Date().toISOString(),
    ip_hash: ipKey,
    user_agent: String(req.headers['user-agent'] || '').slice(0, 256),
    ref
  };

  try {
    await persist(record);
  } catch (err) {
    console.error('[store] write failed:', err.message);
    return fail(500, 'We couldn’t save that. Please try again.');
  }

  console.log(`[signup] ${ref} ${source} ${email}`);
  forward(record);                                 // deliberately not awaited

  return isForm
    ? sendHtml(res, 200, 'You’re on the list.',
        `We’ll email ${email} when a seat opens. Your reference is ${ref}.`)
    : sendJson(res, 200, { ok: true, ref });
}

/* ----------------------------------------------------------------- static */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.svg', '.json', '.txt']);

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';

  const filePath = path.join(ROOT, path.normalize(rel));

  // never serve outside the project root, or out of data/
  if (!filePath.startsWith(ROOT + path.sep) || filePath.startsWith(DATA_DIR + path.sep)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  let stat;
  try {
    stat = await fsp.stat(filePath);
    if (stat.isDirectory()) return serveStatic(req, res, rel + '/index.html');
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 — not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    return res.end();
  }

  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': ext === '.html'
      ? 'no-cache'
      : 'public, max-age=31536000, immutable'
  };

  let body = await fsp.readFile(filePath);

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (acceptsGzip && COMPRESSIBLE.has(ext) && body.length > 1024) {
    body = zlib.gzipSync(body, { level: 6 });
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }

  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

/* ------------------------------------------------------------------ server */
ensureStore();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (url.pathname === '/api/subscribe') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Allow': 'POST' });
      return res.end();
    }
    return handleSubscribe(req, res).catch((err) => {
      console.error('[subscribe]', err);
      sendJson(res, 500, { error: 'Unexpected error.' });
    });
  }

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, uptime: Math.round(process.uptime()) });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Allow': 'GET, HEAD' });
    return res.end();
  }

  serveStatic(req, res, url.pathname).catch((err) => {
    console.error('[static]', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 — server error');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Nocturne listening on http://localhost:${PORT}`);
  console.log(`Submissions → ${STORE}`);
  if (EMAIL_ENDPOINT) console.log(`Forwarding  → ${EMAIL_ENDPOINT}`);
});
