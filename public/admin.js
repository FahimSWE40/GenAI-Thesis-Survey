// Admin dashboard: reads /api/admin with the password in a header; nothing is stored except
// the password for this browser tab (sessionStorage, cleared when the tab closes).
// Charts: Chart.js (loaded in admin.html with an integrity hash). All statistics arrive pre-computed
// from the server (valid cases only); the page never receives individual answers.
const KEY = 'genai-admin-token';
const TAB_KEY = 'genai-admin-tab';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = iso => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDur = s => (Number.isFinite(s) ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : '–');
const f2 = v => (v == null ? '–' : Number(v).toFixed(2));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const FLAG_TEXT = { test: 'Test', withdrawn: 'Withdrawn', attention: 'Failed attention check', too_fast: 'Too fast', repeat_device: 'Repeat device' };

// ---------- colours (soft, distinguishable, colour-blind friendly order) ----------
const C = { accent: '#467c69', accentSoft: '#b9d3c6', mark: '#c98f7f', ink: '#3a413d', muted: '#6a736e', rule: '#ece8e1' };
const PAL = ['#467c69', '#d8a47f', '#6b8fb5', '#b48ead', '#c9b458', '#8fb9a8', '#a65945', '#7d8fa3', '#d4b9a0', '#5f9ea0', '#9aa5b1', '#e0c3a0'];
const LIKERT_COLORS = ['#c27b68', '#e3b5a8', '#dcd7cd', '#a8cbb9', '#467c69'];   // 1 → 5

let data = null;
let timer = null;
let firstDraw = true;
const charts = {};

function getToken() { try { return sessionStorage.getItem(KEY); } catch { return null; } }
function setToken(t) { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch {} }

// ---------- data ----------
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
  timer = setTimeout(() => (document.visibilityState === 'visible' ? load() : null), 60000);
}

function showLogin(msg = '') {
  $('login').hidden = false; $('dash').hidden = true; $('topActions').hidden = true; $('tabs').hidden = true;
  $('loginErr').textContent = msg;
  $('pw').focus();
}

// ---------- tabs ----------
function currentTab() {
  const h = location.hash.slice(1);
  if (document.querySelector(`[data-panel="${h}"]`)) return h;
  try { return sessionStorage.getItem(TAB_KEY) || 'overview'; } catch { return 'overview'; }
}
function showTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  try { sessionStorage.setItem(TAB_KEY, tab); } catch {}
  if (location.hash.slice(1) !== tab) history.replaceState(null, '', '#' + tab);
  if (data) drawCharts(tab);
}

// ---------- chart helpers ----------
function setupChartDefaults() {
  if (!window.Chart) return;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.rule;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.boxHeight = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = '#3a413d';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.maintainAspectRatio = false;
}
function chart(id, config) {
  const canvas = $(id);
  if (!canvas || !window.Chart) return;
  charts[id]?.destroy();
  config.options = { animation: firstDraw ? undefined : false, ...config.options };
  charts[id] = new Chart(canvas, config);
}
const wrap = (label, max = 22) => {   // split long labels over lines
  const words = String(label).split(' '); const lines = []; let line = '';
  for (const w of words) { if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) lines.push(line);
  return lines;
};
const pctTip = total => ({ callbacks: { label: c => ` ${c.raw} (${pct(c.raw, total)})` } });

function barChart(id, labels, values, { horizontal = false, color = C.accent, total = 0, max, tip } = {}) {
  chart(id, {
    type: 'bar',
    data: { labels: labels.map(l => wrap(l, horizontal ? 34 : 14)), datasets: [{ data: values, backgroundColor: color, borderRadius: 5, maxBarThickness: horizontal ? 22 : 46 }] },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { legend: { display: false }, tooltip: tip || (total ? pctTip(total) : {}) },
      scales: {
        [horizontal ? 'x' : 'y']: { beginAtZero: true, max, ticks: tip && !total ? { precision: 0, callback: v => v + '%' } : { precision: 0 }, grid: { color: C.rule } },
        [horizontal ? 'y' : 'x']: { grid: { display: false }, ticks: { autoSkip: false } },
      },
    },
  });
}
function pieChart(id, labels, values, total) {
  chart(id, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: PAL.slice(0, labels.length), borderColor: '#fdfcfa', borderWidth: 2 }] },
    options: {
      cutout: '58%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 10, font: { size: 11.5 } } },
        tooltip: pctTip(total),
      },
    },
  });
}
// error bars (mean ± SD) for the construct-means chart
const errorBars = {
  id: 'errorBars',
  afterDatasetsDraw(ch, _args, opts) {
    const sds = opts.sds || []; const { ctx } = ch; const xs = ch.scales.x;
    ch.getDatasetMeta(0).data.forEach((bar, i) => {
      const mean = ch.data.datasets[0].data[i]; const sd = sds[i];
      if (mean == null || sd == null) return;
      const x1 = xs.getPixelForValue(Math.max(xs.min, mean - sd)), x2 = xs.getPixelForValue(Math.min(xs.max, mean + sd)), y = bar.y;
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
      ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.moveTo(x2, y - 5); ctx.lineTo(x2, y + 5); ctx.stroke(); ctx.restore();
    });
  },
};

// ---------- render ----------
function render() {
  $('login').hidden = true; $('dash').hidden = false; $('topActions').hidden = false; $('tabs').hidden = false;
  $('updated').textContent = `Updated ${fmtTime(data.generated_at)}`;
  renderOverviewText();
  renderParticipantsText();
  renderUseText();
  renderStatsText();
  renderSubmissions();
  showTab(currentTab());
  firstDraw = false;
}

function drawCharts(tab) {
  if (tab === 'overview') drawOverview();
  if (tab === 'participants') drawParticipants();
  if (tab === 'use') drawUse();
  if (tab === 'stats') { drawMeans(); drawItems(); }
}

// ----- overview -----
function renderOverviewText() {
  const t = data.totals, v = data.visits;
  const kpi = (val, l, main) => `<div class="kpi${main ? ' main' : ''}"><div class="v">${val}</div><div class="l">${l}</div></div>`;
  $('kpis').innerHTML = [
    kpi(t.valid, 'Valid responses', true),
    kpi(t.real, 'Submissions (excl. tests)'),
    kpi(t.today, 'Submitted today'),
    kpi(v.unique_visitors, 'Unique link visitors'),
    kpi(fmtDur(t.median_duration_sec), 'Median completion time'),
    kpi(`<span class="sm">${t.last_at ? fmtTime(t.last_at) : '–'}</span>`, 'Last submission'),
  ].join('');
  const p = Math.min(100, Math.round((t.valid / data.target) * 100));
  $('targetText').textContent = `${t.valid} of ${data.target} valid (${p}%) · ${Math.max(0, data.target - t.valid)} to go`;
  $('meterBar').style.width = p + '%';
  $('slNote').textContent = `Straight-lining (same answer through a whole section) is flagged, not excluded: ${t.straightline_flagged} valid response(s). Review them in SPSS (Flag_straightline_n).`;
  $('visitsSince').textContent = v.since ? `visits counted since ${fmtTime(v.since)}` : 'no visits recorded yet';
}
function drawOverview() {
  const d = data.daily;
  chart('cDaily', {
    type: 'bar',
    data: { labels: d.map(x => x.day.slice(5)), datasets: [
      { label: 'Valid', data: d.map(x => x.valid), backgroundColor: C.accent, borderRadius: 4, maxBarThickness: 36 },
      { label: 'Excluded', data: d.map(x => x.total - x.valid), backgroundColor: C.mark, borderRadius: 4, maxBarThickness: 36 },
    ] },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } },
  });
  const ex = data.exclusions;
  barChart('cExcl', Object.keys(ex).map(k => FLAG_TEXT[k] + (k === 'too_fast' ? ` (< ${data.min_seconds / 60} min)` : '')), Object.values(ex), { horizontal: true, color: C.mark });
  const v = data.visits;
  barChart('cFunnel', ['Opened the link', 'Started answering', 'Submitted', 'Valid response'], [v.unique_visitors, v.started, v.submitted, v.valid],
    { horizontal: true, color: [C.accentSoft, '#8fb9a8', '#6a9c88', C.accent], total: v.unique_visitors });
  chart('cVisits', {
    type: 'bar',
    data: { labels: v.daily.map(x => x.day.slice(5)), datasets: [
      { label: 'Visitors', data: v.daily.map(x => x.visitors), backgroundColor: C.accentSoft, borderRadius: 4, maxBarThickness: 26 },
      { label: 'Submitted', data: v.daily.map(x => x.submitted), backgroundColor: C.accent, borderRadius: 4, maxBarThickness: 26 },
    ] },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

// ----- participants -----
const A = () => data.analysis;
const byId = (list, id) => list.find(q => q.id === id);
const nNote = (label) => {
  const n = A().n;
  return `<strong>${label}</strong> · valid responses only (n = ${n})` + (n < 30 ? ` · <span class="warn">small sample: figures will change as data comes in</span>` : '');
};
const PIES = [
  ['pGender', 'DEM2', 'Gender'], ['pAge', 'DEM1', 'Age'], ['pInst', 'DEM4', 'Institution type'],
  ['pYear', 'DEM7', 'Year of study'], ['pDevice', 'DEM9', 'Main study device'], ['pLang', null, 'Form language used'],
];
const PART_BARS = [
  ['bSubject', 'DEM6', 'Subject group', true], ['bUni', null, 'Universities (top 15)', true],
  ['bCgpa', 'DEM8', 'CGPA (optional)', false], ['bNet', 'DEM10', 'Internet speed for studying', false],
  ['bSource', null, 'Recruitment source (link)', true], ['bSurveyDev', null, 'Device used for this survey', false],
];
function renderParticipantsText() {
  $('partNote').innerHTML = nNote('Who took part');
  $('pies').innerHTML = PIES.map(([id, , title]) => `<div class="card"><div class="card-head"><h2>${title}</h2></div><div class="chart pie-box"><canvas id="${id}"></canvas></div></div>`).join('');
  $('partBars').innerHTML = PART_BARS.map(([id, , title, h]) => `<div class="card"><div class="card-head"><h2>${title}</h2></div><div class="chart ${h ? 'h300' : 'h260'}"><canvas id="${id}"></canvas></div></div>`).join('');
  $('profileTable').innerHTML = freqTable(A().profile);
}
function drawParticipants() {
  const a = A(), b = data.breakdowns;
  for (const [id, qid] of PIES) {
    if (qid) { const q = byId(a.profile, qid); pieChart(id, q.options.map(o => o.label), q.options.map(o => o.n), q.n); }
    else pieChart(id, b.language.map(x => x.key), b.language.map(x => x.n), a.n);
  }
  for (const [id, qid, , h] of PART_BARS) {
    if (qid) {
      const q = byId(a.profile, qid);
      const labels = q.options.map(o => o.label), vals = q.options.map(o => o.n);
      if (q.missing) { labels.push('No answer'); vals.push(q.missing); }
      barChart(id, labels, vals, { horizontal: h, total: a.n, color: qid === 'DEM6' ? C.accent : PAL[2] });
    }
  }
  barChart('bUni', b.university.slice(0, 15).map(x => x.key), b.university.slice(0, 15).map(x => x.n), { horizontal: true, total: a.n });
  barChart('bSource', b.source.map(x => x.key), b.source.map(x => x.n), { horizontal: true, total: a.n, color: PAL[1] });
  barChart('bSurveyDev', b.device.map(x => x.key), b.device.map(x => x.n), { total: a.n, color: PAL[3] });
}
function freqTable(qs, multi = false) {
  return `<thead><tr><th>Variable / category</th><th class="num">n</th><th class="num">%</th></tr></thead><tbody>` + qs.map(q =>
    `<tr><td class="group" colspan="3">${esc(q.id)}: ${esc(q.question)}${multi ? ' <span class="muted">(multiple answers; % of respondents)</span>' : ''}</td></tr>` +
    q.options.map(o => `<tr><td>${esc(o.label)}</td><td class="num">${o.n}</td><td class="num">${o.pct == null ? '–' : Number(o.pct).toFixed(1)}</td></tr>`).join('') +
    (q.missing ? `<tr><td class="muted">No answer</td><td class="num">${q.missing}</td><td class="num">–</td></tr>` : '')).join('') + '</tbody>';
}

// ----- GenAI use -----
const USE_CHARTS = [
  ['uTools', 'USE1', 'multi', 'Tools used for studies'], ['uPurpose', 'USE5', 'multi', 'What GenAI is used for'],
  ['uHowLong', 'USE2', 'v', 'How long using GenAI'], ['uFreq', 'USE3', 'v', 'How often per week'],
  ['uDaily', 'USE4', 'v', 'Time per day of use'], ['uAnswer', 'USE6', 'h', 'What they do with an answer'],
  ['uTraining', 'USE8', 'pie', 'Training or guidelines received'], ['uCompany', 'USE9', 'v', 'AI for company or emotional support'],
  ['uOther', 'USE10', 'multi', 'Uses outside studies'],
];
function renderUseText() {
  $('useNote').innerHTML = nNote('How participants use GenAI');
  $('useCharts').innerHTML = USE_CHARTS.map(([id, , kind, title]) =>
    `<div class="card"><div class="card-head"><h2>${title}</h2>${kind === 'multi' ? '<span class="muted">% of respondents</span>' : ''}</div><div class="chart ${kind === 'multi' || kind === 'h' ? 'h300' : 'h260'}"><canvas id="${id}"></canvas></div></div>`).join('');
  $('useTable').innerHTML = freqTable(A().use) + freqTable(A().use_multi, true).replace(/<thead>.*?<\/thead>/, '');
}
function drawUse() {
  const a = A();
  for (const [id, qid, kind] of USE_CHARTS) {
    const q = byId(kind === 'multi' ? a.use_multi : a.use, qid);
    if (!q) continue;
    const labels = q.options.map(o => o.label);
    if (kind === 'pie') pieChart(id, labels, q.options.map(o => o.n), q.n);
    else if (kind === 'multi') barChart(id, labels, q.options.map(o => o.pct), { horizontal: true, color: PAL[2],
      tip: { callbacks: { label: c => ` ${q.options[c.dataIndex].n} respondents (${f2(c.raw)}%)` } } });
    else barChart(id, labels, q.options.map(o => o.n), { horizontal: kind === 'h', total: q.n });
  }
}

// ----- descriptive statistics -----
function renderStatsText() {
  const a = A();
  $('statsNote').innerHTML = nNote('Descriptive statistics for the thesis');
  $('constructTable').innerHTML = `<thead><tr><th>Construct</th><th class="num">Items</th><th class="num">n</th><th class="num">M</th><th class="num">SD</th><th class="num">Mdn</th><th class="num">Min</th><th class="num">Max</th><th class="num">Skewness</th><th class="num">Kurtosis</th><th class="num">α</th></tr></thead><tbody>` +
    a.constructs.map(c => `<tr><td><strong>${esc(c.code)}</strong> <span class="muted">${esc(c.name)}</span></td><td class="num">${c.k}</td><td class="num">${c.n}</td>
      <td class="num">${f2(c.mean)}</td><td class="num">${f2(c.sd)}</td><td class="num">${f2(c.median)}</td><td class="num">${f2(c.min)}</td><td class="num">${f2(c.max)}</td>
      <td class="num">${f2(c.skew)}</td><td class="num">${f2(c.kurt)}</td><td class="num ${c.alpha == null ? '' : c.alpha >= 0.7 ? 'good' : 'weak'}" title="n = ${c.alpha_n} complete cases">${f2(c.alpha)}</td></tr>`).join('') + '</tbody>';

  const L = a.correlations.labels, R = a.correlations.r;
  const cell = r => {
    if (r == null) return '<td>–</td>';
    const s = Math.min(1, Math.abs(r)); const col = r >= 0 ? `rgba(70,124,105,${0.12 + s * 0.78})` : `rgba(166,89,69,${0.12 + s * 0.78})`;
    return `<td style="background:${col};color:${s > 0.55 ? '#fff' : C.ink}">${r === 1 ? '1' : f2(r).replace(/^(-?)0\./, '$1.')}</td>`;
  };
  $('corrTable').innerHTML = `<thead><tr><th></th>${L.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>` +
    L.map((l, i) => `<tr><th>${esc(l)}</th>${R[i].map((r, j) => (j > i ? '<td></td>' : cell(r))).join('')}</tr>`).join('') + '</tbody>';

  const sel = $('itemConstruct'); const prev = sel.value;
  sel.innerHTML = a.constructs.map(c => `<option value="${esc(c.code)}">${esc(c.code)}: ${esc(c.name)}</option>`).join('');
  if (prev) sel.value = prev;
  renderItemTable();
}
function renderItemTable() {
  const code = $('itemConstruct').value;
  const items = A().items.filter(i => i.construct === code);
  $('itemTable').innerHTML = `<thead><tr><th>Item</th><th>Statement</th><th class="num">n</th><th class="num">M</th><th class="num">SD</th><th class="num">Skewness</th><th class="num">Kurtosis</th></tr></thead><tbody>` +
    items.map(i => `<tr><td class="mono">${esc(i.id)}${i.reverse ? ' (R)' : ''}</td><td class="stmt">${esc(i.text)}${i.optional ? ' <span class="tag info">optional</span>' : ''}</td><td class="num">${i.n}</td><td class="num">${f2(i.mean)}</td><td class="num">${f2(i.sd)}</td><td class="num">${f2(i.skew)}</td><td class="num">${f2(i.kurt)}</td></tr>`).join('') + '</tbody>' +
    (items.some(i => i.reverse) ? '<caption class="note" style="caption-side:bottom;text-align:left">(R) = reverse-coded; M and SD shown after reversing.</caption>' : '');
}
function drawMeans() {
  const cs = A().constructs;
  chart('cMeans', {
    type: 'bar',
    data: { labels: cs.map(c => c.code), datasets: [{ data: cs.map(c => c.mean), backgroundColor: cs.map((_, i) => PAL[i % PAL.length]), borderRadius: 5, maxBarThickness: 26 }] },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, errorBars: { sds: cs.map(c => c.sd) },
        tooltip: { callbacks: { title: c => cs[c[0].dataIndex].name, label: c => ` M = ${f2(c.raw)}, SD = ${f2(cs[c.dataIndex].sd)}, n = ${cs[c.dataIndex].n}` } } },
      scales: { x: { min: 1, max: 5, ticks: { stepSize: 1 } }, y: { grid: { display: false } } },
    },
    plugins: [errorBars],
  });
}
function drawItems() {
  const code = $('itemConstruct').value;
  const items = A().items.filter(i => i.construct === code);
  const labels = A().scales[code] || ['1', '2', '3', '4', '5'];
  $('itemChartBox').style.height = `${Math.max(180, items.length * 34 + 70)}px`;
  chart('cItems', {
    type: 'bar',
    data: {
      labels: items.map(i => i.id),
      datasets: labels.map((l, k) => ({
        label: `${k + 1} ${l}`, backgroundColor: LIKERT_COLORS[k], maxBarThickness: 24,
        data: items.map(i => { const tot = i.counts.reduce((a, b) => a + b, 0); return tot ? Math.round((i.counts[k] / tot) * 1000) / 10 : 0; }),
      })),
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { title: c => items[c[0].dataIndex].text, label: c => ` ${c.dataset.label}: ${c.raw}% (${items[c.dataIndex].counts[c.datasetIndex]})` } } },
      scales: { x: { stacked: true, max: 100, ticks: { callback: v => v + '%' } }, y: { stacked: true, grid: { display: false } } },
    },
  });
}

// ----- submissions -----
function renderSubmissions() {
  const v = data.visits;
  $('srcRows').innerHTML = v.by_source.length ? v.by_source.map(r => `<tr>
    <td>${esc(r.key)}</td><td class="num">${r.visitors}</td><td class="num">${r.started}</td>
    <td class="num">${r.submitted}</td><td class="num">${r.valid}</td><td class="num">${pct(r.submitted, r.visitors)}</td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">No data yet</td></tr>';
  renderRows();
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

// ---------- CSV downloads (aggregates only) ----------
function csv(name, header, rows) {
  const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const text = '﻿' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `genai-survey-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const freqRows = (qs, multi) => qs.flatMap(q => [...q.options.map(o => [q.id, q.question, o.label, o.n, o.pct, multi ? 'yes' : 'no']),
  ...(q.missing ? [[q.id, q.question, 'No answer', q.missing, '', 'no']] : [])]);
const CSV = {
  constructs: () => csv('construct-descriptives', ['Construct', 'Name', 'Items', 'n', 'Mean', 'SD', 'Median', 'Min', 'Max', 'Skewness', 'Kurtosis', 'Cronbach_alpha', 'Alpha_n'],
    A().constructs.map(c => [c.code, c.name, c.k, c.n, c.mean, c.sd, c.median, c.min, c.max, c.skew, c.kurt, c.alpha, c.alpha_n])),
  items: () => csv('item-descriptives', ['Item', 'Construct', 'Statement', 'Reverse', 'n', 'Mean', 'SD', 'Skewness', 'Kurtosis', 'n_1', 'n_2', 'n_3', 'n_4', 'n_5'],
    A().items.map(i => [i.id, i.construct, i.text, i.reverse ? 'yes' : 'no', i.n, i.mean, i.sd, i.skew, i.kurt, ...i.counts])),
  profile: () => csv('respondent-profile', ['Variable', 'Question', 'Category', 'n', 'Percent', 'Multiple_answers'], freqRows(A().profile, false)),
  use: () => csv('genai-use', ['Variable', 'Question', 'Category', 'n', 'Percent', 'Multiple_answers'], [...freqRows(A().use, false), ...freqRows(A().use_multi, true)]),
};

// ---------- events ----------
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  $('loginErr').textContent = 'Checking…';
  load($('pw').value.trim());
  $('pw').value = '';
});
$('refresh').addEventListener('click', () => load());
$('logout').addEventListener('click', () => { setToken(null); data = null; clearTimeout(timer); Object.values(charts).forEach(c => c.destroy()); showLogin(); });
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
$('fShow').addEventListener('change', () => data && renderRows());
$('fSearch').addEventListener('input', () => data && renderRows());
$('itemConstruct').addEventListener('change', () => { renderItemTable(); drawItems(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-csv]'); if (b && data) CSV[b.dataset.csv](); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) load(); });
window.addEventListener('hashchange', () => data && showTab(currentTab()));

setupChartDefaults();
load();
