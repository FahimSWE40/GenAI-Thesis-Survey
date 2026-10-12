// POST /api/visit — records an anonymous link-visit event for the admin dashboard.
// Body: { visitor_id: uuid, event: 'view' | 'start' | 'screened_out', src?: string }
// Stores no answers and no IP; at most one row per visitor, event and day (database unique key).
// Never blocks the form: the browser ignores the result.
import { requestMeta } from './submit.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const VISIT_EVENTS = ['view', 'start', 'screened_out'];

export function visitRow(body, req) {
  if (!body || typeof body !== 'object') return null;
  if (!UUID_RE.test(String(body.visitor_id || ''))) return null;
  if (!VISIT_EVENTS.includes(body.event)) return null;
  const src = String(body.src || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60) || null;
  return { visitor_id: body.visitor_id.toLowerCase(), event: body.event, src, device_type: requestMeta(req).device_type };
}

export async function insertVisit(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing settings');
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/visits?on_conflict=visitor_id,event,day`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`db ${r.status}`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const row = visitRow(body, req);
  if (!row) return res.status(400).json({ error: 'Invalid visit' });
  try {
    await insertVisit(row);
  } catch (e) {
    console.error('visit: save failed', String(e.message || e).slice(0, 40));
  }
  return res.status(204).end();
}
