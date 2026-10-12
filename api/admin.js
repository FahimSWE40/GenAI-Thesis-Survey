// GET /api/admin — submission tracking for the researcher (read-only).
// Requires header  x-admin-token: <ADMIN_TOKEN>  (Vercel environment variable).
// Applies the same screening rules as the export_spss / export_smartpls views
// (scripts/exports.mjs), so the counts here match the analysis files.
// Never returns ip_hash, respondent_id/visitor_id or item answers — only summaries and a short submission list.
// Link visits (table visits) give unique visitors per day and source and the visit → submission funnel.
import { createHash, timingSafeEqual } from 'node:crypto';
import { SECTIONS, fieldList } from '../public/questions.js';
import { MIN_SECONDS } from '../scripts/exports.mjs';

export const TARGET_N = 400;      // planned sample size (Context.md)
const RECENT_LIMIT = 200;

const digest = s => createHash('sha256').update(String(s), 'utf8').digest();
export function adminTokenOk(given) {
  const want = process.env.ADMIN_TOKEN;
  if (!want || want.length < 12 || typeof given !== 'string' || !given) return false;
  try { return timingSafeEqual(digest(given), digest(want)); } catch { return false; }
}

const LIKERT = SECTIONS.filter(s => s.kind === 'likert').map(s => ({ short: s.short, cols: s.items.filter(i => !i.attention).map(i => i.id.toLowerCase()) }));
const QMAP = Object.fromEntries(fieldList().filter(f => f.kind === 'single').map(f => [f.col, f.q]));
const label = (col, v) => QMAP[col]?.options.find(o => o.v === v)?.en ?? (v == null ? 'No answer' : String(v));
const SELECT = ['id', 'created_at', 'duration_sec', 'form_version', 'ui_lang', 'attention_pass', 'respondent_id', 'device_type', 'src',
  'receipt_code', 'bot_check', 'dem2', 'dem3', 'dem4', 'dem6', 'dem7', ...LIKERT.flatMap(s => s.cols)].join(',');

async function rest(path, rangeFrom, rangeTo) {
  const url = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${rangeFrom}-${rangeTo}`, 'Range-Unit': 'items' },
  });
  if (!r.ok) throw new Error(`db ${r.status}`);
  return r.json();
}
async function fetchAll(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest(path, from, from + 999);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

const dhakaDay = iso => new Date(new Date(iso).getTime() + 6 * 3600e3).toISOString().slice(0, 10); // Bangladesh time (UTC+6)
function countBy(rows, fn) {
  const m = new Map();
  for (const r of rows) { const k = fn(r); m.set(k, (m.get(k) || 0) + 1); }
  return [...m].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key)));
}

// Pure function (tested in scripts/test-validate.mjs)
export function summarize(rows, withdrawnCodes, visits = []) {
  const withdrawn = new Set(withdrawnCodes);
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  const seen = new Map();
  const cases = sorted.map(r => {
    const test = (r.src || '') === 'test';
    const devKey = `${r.respondent_id || 'row' + r.id}|${test}`;
    const seq = (seen.get(devKey) || 0) + 1;
    seen.set(devKey, seq);
    const straight = LIKERT.filter(s => {
      const vals = s.cols.map(c => r[c]).filter(v => v != null);
      return vals.length >= 3 && new Set(vals).size === 1;
    }).map(s => s.short.toUpperCase());
    const flags = [];
    if (test) flags.push('test');
    if (withdrawn.has(r.receipt_code)) flags.push('withdrawn');
    if (!r.attention_pass) flags.push('attention');
    if ((r.duration_sec ?? 0) < MIN_SECONDS) flags.push('too_fast');
    if (seq > 1) flags.push('repeat_device');
    return {
      id: r.id, created_at: r.created_at, receipt: r.receipt_code, src: r.src || '', device: r.device_type || 'unknown',
      lang: r.ui_lang || '', duration_sec: r.duration_sec, form_version: r.form_version, university: r.dem3 || '',
      dem2: r.dem2, dem4: r.dem4, dem6: r.dem6, dem7: r.dem7, flags, straightline: straight, valid: flags.length === 0, _dev: r.respondent_id,
    };
  });

  const real = cases.filter(c => !c.flags.includes('test'));
  const valid = cases.filter(c => c.valid);
  const today = dhakaDay(new Date().toISOString());
  const durations = real.map(c => c.duration_sec).filter(Number.isFinite).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor((durations.length - 1) / 2)] : null;

  const days = new Map();
  for (const c of real) {
    const d = dhakaDay(c.created_at);
    const e = days.get(d) || { day: d, total: 0, valid: 0 };
    e.total++; if (c.valid) e.valid++;
    days.set(d, e);
  }

  // Exclusions in the reporting order of the analysis plan (each case counted once, at its first reason)
  const order = ['test', 'withdrawn', 'attention', 'too_fast', 'repeat_device'];
  const exclusions = Object.fromEntries(order.map(k => [k, 0]));
  for (const c of cases) { const first = order.find(k => c.flags.includes(k)); if (first) exclusions[first]++; }

  return {
    generated_at: new Date().toISOString(),
    target: TARGET_N,
    min_seconds: MIN_SECONDS,
    totals: {
      all: cases.length, tests: cases.length - real.length, real: real.length, valid: valid.length,
      excluded: real.length - valid.length, today: real.filter(c => dhakaDay(c.created_at) === today).length,
      straightline_flagged: valid.filter(c => c.straightline.length).length, median_duration_sec: median,
      last_at: real.length ? real[real.length - 1].created_at : null,
    },
    exclusions,
    daily: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    breakdowns: {   // valid cases only
      source: countBy(valid, c => c.src || '(no tag)'),
      institution: countBy(valid, c => label('dem4', c.dem4)),
      university: countBy(valid, c => c.university || '(blank)').slice(0, 25),
      gender: countBy(valid, c => label('dem2', c.dem2)),
      year: countBy(valid, c => label('dem7', c.dem7)),
      subject: countBy(valid, c => label('dem6', c.dem6)),
      device: countBy(valid, c => c.device),
      language: countBy(valid, c => ({ en: 'English', bn: 'Bangla', both: 'English + Bangla' })[c.lang] || c.lang || '(unknown)'),
    },
    visits: visitSummary(visits, real),
    recent: cases.slice(-RECENT_LIMIT).reverse().map(({ dem2, dem4, dem6, dem7, _dev, ...c }) => c),
  };
}

// Unique visitors (by browser ID) and the funnel view → start → submit → valid; test traffic excluded.
function visitSummary(visits, realCases) {
  const v = visits.filter(x => (x.src || '') !== 'test');
  const people = ev => new Set(v.filter(x => x.event === ev).map(x => x.visitor_id));
  const viewers = people('view'), starters = people('start'), screened = people('screened_out');
  const submitters = new Set(realCases.map(c => c._dev || 'case' + c.id));
  const validSubmitters = new Set(realCases.filter(c => c.valid).map(c => c._dev || 'case' + c.id));
  const today = dhakaDay(new Date().toISOString());

  const firstSrc = new Map();   // a visitor's source = the tag on their first visit
  for (const x of [...v].sort((a, b) => a.created_at.localeCompare(b.created_at))) if (!firstSrc.has(x.visitor_id)) firstSrc.set(x.visitor_id, x.src || '(no tag)');
  const bySrc = new Map();
  const row = k => bySrc.get(k) || bySrc.set(k, { key: k, visitors: 0, started: 0, submitted: 0, valid: 0 }).get(k);
  for (const id of viewers) row(firstSrc.get(id) || '(no tag)').visitors++;
  for (const id of starters) row(firstSrc.get(id) || '(no tag)').started++;
  for (const c of realCases) { const r = row(c.src || '(no tag)'); r.submitted++; if (c.valid) r.valid++; }

  const days = new Map();
  const day = d => days.get(d) || days.set(d, { day: d, visitors: new Set(), submitted: 0 }).get(d);
  for (const x of v) if (x.event === 'view') day(x.day).visitors.add(x.visitor_id);
  for (const c of realCases) day(dhakaDay(c.created_at)).submitted++;

  return {
    since: v.length ? v.map(x => x.created_at).sort()[0] : null,
    unique_visitors: viewers.size,
    today_visitors: new Set(v.filter(x => x.event === 'view' && x.day === today).map(x => x.visitor_id)).size,
    started: starters.size,
    screened_out: screened.size,
    submitted: submitters.size,
    valid: validSubmitters.size,
    by_source: [...bySrc.values()].sort((a, b) => b.visitors - a.visitors || b.submitted - a.submitted),
    daily: [...days.values()].map(d => ({ day: d.day, visitors: d.visitors.size, submitted: d.submitted })).sort((a, b) => a.day.localeCompare(b.day)),
    devices: countBy([...viewers].map(id => v.find(x => x.visitor_id === id && x.event === 'view')), x => x.device_type || 'unknown'),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_TOKEN) return res.status(503).json({ error: 'Admin access is not set up (ADMIN_TOKEN missing)' });
  const given = req.headers && req.headers['x-admin-token'];
  if (!adminTokenOk(Array.isArray(given) ? given[0] : given)) {
    await new Promise(r => setTimeout(r, 600));   // slows down password guessing
    return res.status(401).json({ error: 'Wrong password' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Database settings missing' });
  try {
    const [rows, wd, visits] = await Promise.all([
      fetchAll(`responses?select=${SELECT}&order=id.asc`),
      fetchAll('withdrawals?select=receipt_code'),
      fetchAll('visits?select=created_at,day,visitor_id,event,src,device_type&order=id.asc'),
    ]);
    return res.status(200).json(summarize(rows, wd.map(w => w.receipt_code), visits));
  } catch (e) {
    console.error('admin: load failed', String(e.message || e).slice(0, 80));
    return res.status(502).json({ error: 'Could not load submissions' });
  }
}
