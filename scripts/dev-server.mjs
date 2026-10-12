// Local test server: serves public/ and POST /api/submit.
// - If .env.local has SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, rows go to Supabase.
// - Otherwise rows are appended to dev-responses.jsonl (nothing leaves your computer).
// Usage: npm run dev   → http://localhost:3000
import { createServer } from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

// Minimal .env.local loader
const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { validate, insertRow, requestMeta, verifyBot, publicError, logSaveError } = await import('../api/submit.js');
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const PORT = Number(process.env.PORT) || 3000;

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health') {
    const { default: health } = await import('../api/health.js');
    const shim = {
      setHeader: (k, v) => res.setHeader(k, v),
      status: code => ({ json: obj => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); } }),
    };
    return health(req, shim);
  }
  if (url.pathname === '/api/admin') {
    const { default: admin } = await import('../api/admin.js');
    const shim = {
      setHeader: (k, v) => res.setHeader(k, v),
      status: code => ({ json: obj => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); } }),
    };
    return admin(req, shim);
  }
  if (url.pathname === '/api/visit') {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const { visitRow, insertVisit } = await import('../api/visit.js');
    let body = null; try { body = JSON.parse(raw); } catch { /* invalid */ }
    const row = visitRow(body, req);
    if (!row) { res.writeHead(400).end(); return; }
    if (useSupabase) await insertVisit(row).catch(() => {});
    else await appendFile(join(root, 'dev-visits.jsonl'), JSON.stringify(row) + '\n');
    res.writeHead(204).end(); return;
  }
  if (url.pathname === '/admin') { res.writeHead(302, { Location: '/admin.html' }); res.end(); return; }
  if (url.pathname === '/api/submit') {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body;
    try { body = JSON.parse(raw); } catch { res.writeHead(400).end('{"error":"Invalid JSON"}'); return; }
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (body.website) return send(200, { ok: true });
    const v = validate(body);
    if (!v.ok) { console.log('✗ rejected:', v.error); return send(400, { error: v.error }); }
    const meta = requestMeta(req);
    const bot = await verifyBot(body.bot_token, meta.ip);
    if (bot === 'failed') return send(403, { error: 'Bot check failed' });
    const row = { ...v.row, ip_hash: meta.ip_hash, device_type: meta.device_type, bot_check: bot };
    try {
      if (useSupabase) await insertRow(row);
      else await appendFile(join(root, 'dev-responses.jsonl'), JSON.stringify(row) + '\n');
      console.log(`✓ saved ${row.receipt_code} → ${useSupabase ? 'Supabase' : 'dev-responses.jsonl'}`);
      return send(200, { ok: true, receipt: row.receipt_code });
    } catch (e) {
      logSaveError(e);
      const pe = publicError(e);
      return send(pe.status, { error: pe.error, code: pe.code });
    }
  }
  const path = normalize(url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname));
  const file = join(pub, path);
  if (!file.startsWith(pub)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Survey running at http://localhost:${PORT}  (saving to ${useSupabase ? 'Supabase' : 'dev-responses.jsonl'})`);
});
