// GET /api/health — deployment check. Shows which settings are present and whether
// the database table is reachable. Never returns key values.
export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = {
    settings: {
      SUPABASE_URL: Boolean(url),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(key),
      IP_HASH_SALT: Boolean(process.env.IP_HASH_SALT),
      TURNSTILE_SECRET_KEY: Boolean(process.env.TURNSTILE_SECRET_KEY),
    },
    supabase_project: url ? url.replace(/^https?:\/\//, '').split('.')[0] : null,
    database: 'not checked',
  };
  if (url && key) {
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/responses?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const body = await r.text();
      out.database = r.ok ? 'ok — responses table reachable'
        : body.includes('PGRST205') ? 'table missing — run supabase/schema.sql in the SQL Editor'
        : r.status === 401 || r.status === 403 ? 'access denied — check SUPABASE_SERVICE_ROLE_KEY (use the secret key)'
        : `error ${r.status}`;
    } catch {
      out.database = 'cannot reach Supabase — check SUPABASE_URL';
    }
  }
  out.ready = Boolean(url && key && process.env.IP_HASH_SALT && out.database.startsWith('ok'));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}
