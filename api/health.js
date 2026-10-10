// GET /api/health — deployment check.
// Public:  /api/health                 → { ready: true|false } only
// Private: /api/health?token=<HEALTH_TOKEN> → which settings are present and whether
//          the database table is reachable. Never returns key values.
import { timingSafeEqual } from 'node:crypto';

function tokenOk(given) {
  const want = process.env.HEALTH_TOKEN;
  if (!want || typeof given !== 'string' || given.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let database = 'not checked';
  if (url && key) {
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/responses?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const body = await r.text();
      database = r.ok ? 'ok — responses table reachable'
        : body.includes('PGRST205') ? 'table missing — run supabase/schema.sql in the SQL Editor'
        : r.status === 401 || r.status === 403 ? 'access denied — check SUPABASE_SERVICE_ROLE_KEY (use the secret key)'
        : `error ${r.status}`;
    } catch {
      database = 'cannot reach Supabase — check SUPABASE_URL';
    }
  }
  const ready = Boolean(url && key && process.env.IP_HASH_SALT && database.startsWith('ok'));
  res.setHeader('Cache-Control', 'no-store');

  const q = new URL(req.url || '/', 'http://x').searchParams;
  if (!tokenOk(q.get('token'))) return res.status(200).json({ ready });

  return res.status(200).json({
    ready,
    database,
    settings: {
      SUPABASE_URL: Boolean(url),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(key),
      IP_HASH_SALT: Boolean(process.env.IP_HASH_SALT),
      TURNSTILE_SECRET_KEY: Boolean(process.env.TURNSTILE_SECRET_KEY),
    },
  });
}
