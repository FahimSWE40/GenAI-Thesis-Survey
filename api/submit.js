// Vercel serverless function: POST /api/submit
// Validates a completed survey against public/questions.js and inserts one row
// into the Supabase `responses` table using the service-role key (server-side only).

import { createHash, createHmac } from 'node:crypto';
import { SCREENING, FORM_VERSION, fieldList, ATTENTION_ITEMS } from '../public/questions.js';

const FIELDS = fieldList();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OTHER = 200;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // no 0/O, 1/I/L, U

// Receipt code shown to the participant, e.g. "GA-7K2P-QX9M". Derived from the
// random submission_id, so a retried submission always gets the same code.
export function receiptCode(submissionId) {
  const h = createHash('sha256').update('receipt:' + submissionId).digest();
  let out = '';
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[h[i] % CODE_ALPHABET.length];
  return `GA-${out.slice(0, 4)}-${out.slice(4)}`;
}

// Authenticity data taken from the request itself (never from the browser's word).
// The IP address is only used to make a one-way salted hash; it is not stored.
export function requestMeta(req) {
  const hdr = name => (req.headers && (req.headers[name] || req.headers[name.toLowerCase()])) || '';
  const ip = String(hdr('x-forwarded-for')).split(',')[0].trim() || String(hdr('x-real-ip')) || req.socket?.remoteAddress || '';
  const salt = process.env.IP_HASH_SALT;
  const ua = String(hdr('user-agent'));
  const device_type = !ua ? 'unknown'
    : /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'tablet'
    : /Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(ua) ? 'mobile' : 'desktop';
  return {
    ip,
    device_type,
    ip_hash: salt && ip ? createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32) : null,
  };
}

// Cloudflare Turnstile bot check. Returns 'passed', 'failed' or 'not_configured'.
export async function verifyBot(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return 'not_configured';
  if (!token || typeof token !== 'string') return 'failed';
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const data = await r.json();
    return data.success ? 'passed' : 'failed';
  } catch {
    return 'failed';
  }
}

// Returns { ok: true, row } or { ok: false, error }
export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' };
  const a = body.answers;
  if (!a || typeof a !== 'object') return { ok: false, error: 'Missing answers' };

  // Screening must all be "yes" (v=1); ineligible people are never submitted by the form.
  for (const q of SCREENING) {
    if (a[q.id] !== 1) return { ok: false, error: `Not eligible (${q.id})` };
  }

  if (!UUID_RE.test(String(body.submission_id || ''))) return { ok: false, error: 'Invalid submission_id' };

  const row = {
    submission_id: body.submission_id,
    form_version: FORM_VERSION,
    ui_lang: ['en', 'bn', 'both'].includes(body.ui_lang) ? body.ui_lang : 'both',
    respondent_id: UUID_RE.test(String(body.respondent_id || '')) ? body.respondent_id : null,
    src: String(body.src || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60) || null,
    receipt_code: receiptCode(body.submission_id),
  };

  const started = Date.parse(body.started_at);
  if (!Number.isNaN(started)) {
    row.started_at = new Date(started).toISOString();
    const secs = Math.round((Date.now() - started) / 1000);
    if (secs >= 0 && secs < 7 * 24 * 3600) row.duration_sec = secs;
  }

  for (const f of FIELDS) {
    const id = f.q.id;
    if (f.kind === 'likert') {
      const v = a[id];
      if (f.q.optional && (v === undefined || v === null)) { row[f.col] = null; continue; }
      if (!Number.isInteger(v) || v < 1 || v > 5) return { ok: false, error: `Missing or invalid ${id}` };
      row[f.col] = v;
    } else if (f.kind === 'single') {
      const v = a[id];
      if (f.q.optional && (v === undefined || v === null)) { row[f.col] = null; continue; }
      if (!f.q.options.some(o => o.v === v)) return { ok: false, error: `Missing or invalid ${id}` };
      row[f.col] = v;
    } else if (f.kind === 'multi') {
      const v = a[id];
      const allowed = new Set(f.q.options.map(o => o.v));
      if (!Array.isArray(v) || v.length === 0 || !v.every(x => allowed.has(x))) {
        return { ok: false, error: `Missing or invalid ${id}` };
      }
      row[f.col] = [...new Set(v)];
    } else if (f.kind === 'text') {
      const txt = typeof a[id] === 'string' ? a[id].trim().replace(/\s+/g, ' ').slice(0, f.q.maxLength || 150) : '';
      if (txt.length < 2) return { ok: false, error: `Missing or invalid ${id}` };
      row[f.col] = txt;
    } else if (f.kind === 'other_text') {
      const otherOpt = f.q.options.find(o => o.other);
      const chosen = f.q.type === 'multi' ? (a[id] || []).includes(otherOpt.v) : a[id] === otherOpt.v;
      const txt = typeof a[id + '_other'] === 'string' ? a[id + '_other'].trim().slice(0, MAX_OTHER) : '';
      row[f.col] = chosen && txt ? txt : null;
    }
  }

  row.attention_pass = ATTENTION_ITEMS.every(it => row[it.id.toLowerCase()] === it.attention);
  return { ok: true, row };
}

export async function insertRow(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');

  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/responses?on_conflict=submission_id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // A retried submission with the same submission_id is silently ignored.
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const detail = await r.text();
    const err = new Error(`Supabase insert failed (${r.status}): ${detail.slice(0, 300)}`);
    err.status = r.status;
    err.detail = detail;
    throw err;
  }
}

// Turns a save error into a message that is safe and useful to show in the form.
export function publicError(e) {
  const msg = String(e && e.message || '');
  const detail = String(e && e.detail || '');
  // Participants see a neutral message plus a short code; the code's meaning is in the README
  // (and /api/health?token=… shows the details), so setup state is not spelled out publicly.
  const unavailable = code => ({ status: 503, error: `The survey is temporarily unavailable. Please try again later. (code: ${code})`, code });
  if (msg.includes('missing SUPABASE_URL')) return unavailable('S1');
  if (detail.includes('PGRST205') || e?.status === 404) return unavailable('S2');
  if (e?.status === 401 || e?.status === 403) return unavailable('S3');
  if (detail.includes('23514') || detail.includes('23502')) return { status: 400, error: 'An answer could not be saved. Please reload the page and try again. (code: S4)', code: 'S4' };
  return { status: 500, error: 'Could not save your response. Please try again. (code: S5)', code: 'S5' };
}

// Log only what is needed to diagnose — never the database's error detail, which can echo answers.
export function logSaveError(e) {
  const pe = publicError(e);
  console.error(`save failed: code=${pe.code} status=${e?.status ?? 'n/a'}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 50_000) return res.status(413).json({ error: 'Too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success, save nothing.
  if (body && body.website) return res.status(200).json({ ok: true });

  const v = validate(body);
  if (!v.ok) return res.status(400).json({ error: v.error });

  const meta = requestMeta(req);
  const bot = await verifyBot(body.bot_token, meta.ip);
  if (bot === 'failed') return res.status(403).json({ error: 'Bot check failed. Please reload the page and try again.' });
  const row = { ...v.row, ip_hash: meta.ip_hash, device_type: meta.device_type, bot_check: bot };

  try {
    await insertRow(row);
    return res.status(200).json({ ok: true, receipt: row.receipt_code });
  } catch (e) {
    logSaveError(e);
    const pe = publicError(e);
    return res.status(pe.status).json({ error: pe.error, code: pe.code });
  }
}
