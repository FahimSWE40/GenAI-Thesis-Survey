// Admin dashboard: reads /api/admin with the password in a header; nothing is stored except
// the password for this browser tab (sessionStorage, cleared when the tab closes).
const KEY = 'genai-admin-token';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = iso => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDur = s => (Number.isFinite(s) ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : '–');
const FLAG_TEXT = { test: 'Test', withdrawn: 'Withdrawn', attention: 'Failed attention check', too_fast: 'Too fast', repeat_device: 'Repeat device' };

let data = null;
let timer = null;

function getToken() { try { return sessionStorage.getItem(KEY); } catch { return null; } }
function setToken(t) { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch {} }

async function load(token = getToken()) {
  if (!token) return showLogin();
  let r;
  try {
    r = await fetch('/api/admin', { headers: { 'x-admin-token': token }, cache: 'no-store' });
  } catch {
    $('updated').textContent = 'Offline: could not reach the server';
    return;
  }
  if (r.status === 401) { setToken(null); return showLogin('Wrong password.'); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (!data) return showLogin(body.error || `Server error ${r.status}`);
    $('updated').textContent = `Refresh failed (${r.status})`;
    return;
  }
  setToken(token);
  data = body;
  render();
  clearTimeout(timer);
  timer = setTimeout(() => document.visibilityState === 'visible' ? load() : null, 60000);
}

function showLogin(msg = '') {
  $('login').hidden = false; $('dash').hidden = true; $('topActions').hidden = true;
  $('loginErr').textContent = msg;
  $('pw').focus();
}

function bars(items, total, cls = '') {
  if (!items.length) return '<p class="empty">No data yet</p>';
  const max = Math.max(...items.map(i => i.n));
  return `<div class="bars ${cls}">${items.map(i => `
    <div class="bar-row"><span class="k" title="${esc(i.key)}">${esc(i.key)}</span>
      <span class="n">${i.n}${total ? ` · ${Math.round((i.n / total) * 100)}%` : ''}</span>
      <div class="track"><div class="fill" style="width:${max ? (i.n / max) * 100 : 0}%"></div></div></div>`).join('')}</div>`;
}

function render() {
  const t = data.totals;
  $('login').hidden = true; $('dash').hidden = false; $('topActions').hidden = false;
  $('updated').textContent = `Updated ${fmtTime(data.generated_at)}`;

  const kpi = (v, l, main) => `<div class="kpi${main ? ' main' : ''}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  $('kpis').innerHTML = [
    kpi(t.valid, 'Valid responses', true),
    kpi(t.real, 'Total submissions (excl. tests)'),
    kpi(t.today, 'Today (Bangladesh time)'),
    kpi(t.excluded, 'Excluded'),
    kpi(fmtDur(t.median_duration_sec), 'Median completion time'),
    kpi(`<span class="sm">${t.last_at ? fmtTime(t.last_at) : '–'}</span>`, 'Last submission'),
  ].join('');

  const pct = Math.min(100, Math.round((t.valid / data.target) * 100));
  $('targetText').textContent = `${t.valid} of ${data.target} valid (${pct}%) · ${Math.max(0, data.target - t.valid)} to go`;
  $('meterBar').style.width = pct + '%';

  renderVisits();

  // daily chart
  const days = data.daily;
  if (!days.length) $('daily').innerHTML = '<p class="empty">No submissions yet</p>';
  else {
    const max = Math.max(...days.map(d => d.total));
    $('daily').innerHTML = days.map(d => `<div class="day" title="${d.day}: ${d.total} submitted, ${d.valid} valid">
      <span class="n">${d.total}</span>
      <div class="b-excl" style="height:${((d.total - d.valid) / max) * 100}%"></div>
      <div class="b-valid" style="height:${(d.valid / max) * 100}%"></div></div>`).join('');
    const lbl = document.querySelector('.day-labels') || Object.assign(document.createElement('div'), { className: 'day-labels' });
    lbl.innerHTML = `<span>${days[0].day}</span><span>${days.length > 1 ? days[days.length - 1].day : ''}</span>`;
    $('daily').after(lbl);
  }

  const ex = data.exclusions;
  const exItems = Object.entries(ex).map(([k, n]) => ({ key: FLAG_TEXT[k] + (k === 'too_fast' ? ` (< ${data.min_seconds / 60} min)` : ''), n }));
  $('exclusions').innerHTML = bars(exItems, 0, 'warn') +
    `<p class="muted small">Straight-lining (same answer in a whole section): <strong>${t.straightline_flagged}</strong> valid responses flagged. Check these in SPSS (<code>Flag_straightline_n</code>).</p>`;

  const b = data.breakdowns;
  const box = (title, items) => `<section class="card"><div class="card-head"><h2>${title}</h2><span class="muted">valid only</span></div>${bars(items, t.valid)}</section>`;
  $('breakdowns').innerHTML = [
    box('Recruitment source', b.source), box('Institution type', b.institution), box('Universities (top 25)', b.university),
    box('Gender', b.gender), box('Year of study', b.year), box('Subject group', b.subject),
    box('Device', b.device), box('Form language', b.language),
  ].join('');

  renderRows();
}

function renderVisits() {
  const v = data.visits;
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
  $('visitsSince').textContent = v.since ? `counting since ${fmtTime(v.since)}` : 'no visits recorded yet';
  const k = (val, l) => `<div class="vkpi"><div class="v">${val}</div><div class="l">${l}</div></div>`;
  $('visitKpis').innerHTML = [
    k(v.unique_visitors, 'Unique visitors'),
    k(v.today_visitors, 'Visitors today'),
    k(v.started, 'Started answering'),
    k(v.screened_out, 'Not eligible (screened out)'),
    k(pct(v.submitted, v.unique_visitors), 'Visitors who submitted'),
  ].join('');

  const steps = [
    { key: 'Opened the link', n: v.unique_visitors },
    { key: 'Started answering', n: v.started },
    { key: 'Submitted', n: v.submitted },
    { key: 'Valid response', n: v.valid },
  ];
  $('funnel').innerHTML = `<div class="funnel">${bars(steps, v.unique_visitors)}</div>` +
    `<p class="muted small">Submissions made before visit counting started are included in Submitted, so early percentages can exceed 100%.</p>`;

  const days = v.daily;
  if (!days.length) $('visitDaily').innerHTML = '<p class="empty">No visits yet</p>';
  else {
    const max = Math.max(1, ...days.map(d => Math.max(d.visitors, d.submitted)));
    $('visitDaily').innerHTML = days.map(d => `<div class="day pair" title="${d.day}: ${d.visitors} visitors, ${d.submitted} submitted">
      <span class="n">${d.visitors}</span>
      <div class="b-visit" style="height:${(d.visitors / max) * 100}%"></div>
      <div class="b-valid" style="height:${(d.submitted / max) * 100}%"></div></div>`).join('');
  }

  $('srcRows').innerHTML = v.by_source.length ? v.by_source.map(r => `<tr>
    <td>${esc(r.key)}</td><td class="num">${r.visitors}</td><td class="num">${r.started}</td>
    <td class="num">${r.submitted}</td><td class="num">${r.valid}</td><td class="num">${pct(r.submitted, r.visitors)}</td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">No visits yet</td></tr>';
}

function renderRows() {
  const show = $('fShow').value;
  const q = $('fSearch').value.trim().toLowerCase();
  const rows = data.recent.filter(c =>
    (show === 'all' || (show === 'valid' && c.valid) || (show === 'excluded' && !c.valid && !c.flags.includes('test')) || (show === 'test' && c.flags.includes('test'))) &&
    (!q || `${c.receipt} ${c.university} ${c.src}`.toLowerCase().includes(q)));
  $('rows').innerHTML = rows.length ? rows.map(c => `<tr>
    <td class="mono">${c.id}</td>
    <td class="mono">${fmtTime(c.created_at)}</td>
    <td class="mono">${esc(c.receipt)}</td>
    <td class="uni">${esc(c.university)}</td>
    <td>${esc(c.src || '–')}</td>
    <td>${esc(c.device)}</td>
    <td class="mono">${fmtDur(c.duration_sec)}</td>
    <td>${c.valid ? '<span class="tag ok">Valid</span>' : ''}${c.flags.map(f => `<span class="tag bad">${FLAG_TEXT[f]}</span>`).join('')}${c.straightline.length ? `<span class="tag info" title="Same answer throughout these sections">Straight-line: ${c.straightline.join(', ')}</span>` : ''}</td>
  </tr>`).join('') : '<tr><td colspan="8" class="empty">No submissions match</td></tr>';
  $('rowsNote').textContent = `Showing ${rows.length} of the latest ${data.recent.length} submissions (newest first).`;
}

$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  $('loginErr').textContent = 'Checking…';
  load($('pw').value.trim());
  $('pw').value = '';
});
$('refresh').addEventListener('click', () => load());
$('logout').addEventListener('click', () => { setToken(null); data = null; clearTimeout(timer); showLogin(); });
$('fShow').addEventListener('change', () => data && renderRows());
$('fSearch').addEventListener('input', () => data && renderRows());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) load(); });

load();
