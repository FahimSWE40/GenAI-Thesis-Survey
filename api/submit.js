// Vercel serverless function: POST /api/submit
// Validates a completed survey against public/questions.js and inserts one row
// into the Supabase `responses` table using the service-role key (server-side only).

import { SCREENING, FORM_VERSION, fieldList, ATTENTION_ITEMS } from '../public/questions.js';

const FIELDS = fieldList();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OTHER = 200;

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
    throw new Error(`Supabase insert failed (${r.status}): ${detail.slice(0, 300)}`);
  }
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

  try {
    await insertRow(v.row);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not save your response. Please try again.' });
  }
}
