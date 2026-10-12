// Descriptive statistics for the admin dashboard (valid cases only), built from public/questions.js.
// Construct scores = mean of the answered items, reverse items reversed (same as CT_mean … in export_spss).
// Returns aggregates only — never individual answers.
import { SECTIONS, LIKERT_LABELS } from '../public/questions.js';

const LIKERT = SECTIONS.filter(s => s.kind === 'likert');
const itemsOf = s => s.items.filter(i => !i.attention);
const score = (row, it) => {
  const v = row[it.id.toLowerCase()];
  return v == null ? null : it.reverse ? 6 - v : v;
};
const r3 = x => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);

export function describe(values) {
  const x = values.filter(v => v != null && Number.isFinite(v));
  const n = x.length;
  if (!n) return { n: 0, mean: null, sd: null, min: null, max: null, median: null, skew: null, kurt: null };
  const mean = x.reduce((a, b) => a + b, 0) / n;
  const m2 = x.reduce((a, b) => a + (b - mean) ** 2, 0);
  const sd = n > 1 ? Math.sqrt(m2 / (n - 1)) : null;
  const s = [...x].sort((a, b) => a - b);
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  // SPSS-style skewness (G1) and excess kurtosis (G2)
  let skew = null, kurt = null;
  if (n > 2 && sd > 0) {
    const m3 = x.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0);
    skew = (n / ((n - 1) * (n - 2))) * m3;
  }
  if (n > 3 && sd > 0) {
    const m4 = x.reduce((a, b) => a + ((b - mean) / sd) ** 4, 0);
    kurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  }
  return { n, mean: r3(mean), sd: r3(sd), min: s[0], max: s[n - 1], median: r3(median), skew: r3(skew), kurt: r3(kurt) };
}

// Cronbach's alpha on cases that answered every item (listwise), as SPSS Reliability does.
export function cronbachAlpha(matrix) {
  const rows = matrix.filter(r => r.every(v => v != null));
  const k = rows[0]?.length || 0;
  if (rows.length < 3 || k < 2) return { alpha: null, n: rows.length };
  const variance = col => { const m = col.reduce((a, b) => a + b, 0) / col.length; return col.reduce((a, b) => a + (b - m) ** 2, 0) / (col.length - 1); };
  const itemVar = Array.from({ length: k }, (_, j) => variance(rows.map(r => r[j]))).reduce((a, b) => a + b, 0);
  const totalVar = variance(rows.map(r => r.reduce((a, b) => a + b, 0)));
  return { alpha: totalVar > 0 ? r3((k / (k - 1)) * (1 - itemVar / totalVar)) : null, n: rows.length };
}

export function pearson(a, b) {
  const pairs = a.map((v, i) => [v, b[i]]).filter(([x, y]) => x != null && y != null);
  const n = pairs.length;
  if (n < 3) return { r: null, n };
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return { r: sxx > 0 && syy > 0 ? r3(sxy / Math.sqrt(sxx * syy)) : null, n };
}

const freq = (rows, q) => {
  const answered = rows.filter(r => r[q.id.toLowerCase()] != null);
  return {
    id: q.id, question: q.en, n: answered.length, missing: rows.length - answered.length,
    options: q.options.map(o => {
      const n = answered.filter(r => r[q.id.toLowerCase()] === o.v).length;
      return { v: o.v, label: o.en, n, pct: answered.length ? r3((n / answered.length) * 100) : 0 };
    }),
  };
};
const multiFreq = (rows, q) => ({
  id: q.id, question: q.en, n: rows.length,
  options: q.options.map(o => {
    const n = rows.filter(r => (r[q.id.toLowerCase()] || []).includes(o.v)).length;
    return { v: o.v, label: o.en, n, pct: rows.length ? r3((n / rows.length) * 100) : 0 };
  }).sort((a, b) => b.n - a.n),
});

export function analyse(rows) {
  const choiceQs = SECTIONS.filter(s => s.kind !== 'likert').flatMap(s => s.questions);
  const constructs = LIKERT.map(s => {
    const its = itemsOf(s);
    const scores = rows.map(r => {
      const v = its.map(it => score(r, it)).filter(x => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const rel = cronbachAlpha(rows.map(r => its.map(it => score(r, it))));
    return { code: s.short.toUpperCase(), section: s.id, name: s.construct, title: s.en, k: its.length, ...describe(scores), alpha: rel.alpha, alpha_n: rel.n, _scores: scores };
  });

  const corr = {
    labels: constructs.map(c => c.code),
    r: constructs.map(a => constructs.map(b => (a === b ? 1 : pearson(a._scores, b._scores).r))),
  };

  const items = LIKERT.flatMap(s => itemsOf(s).map(it => {
    const raw = rows.map(r => r[it.id.toLowerCase()]);
    const d = describe(rows.map(r => score(r, it)));
    return {
      id: it.id, construct: s.short.toUpperCase(), text: it.en, reverse: !!it.reverse, optional: !!it.optional, ...d,
      counts: [1, 2, 3, 4, 5].map(v => raw.filter(x => x === v).length),
    };
  }));

  return {
    n: rows.length,
    scales: Object.fromEntries(LIKERT.map(s => [s.short.toUpperCase(), (s.scale || LIKERT_LABELS).map(l => l.en)])),
    constructs: constructs.map(({ _scores, ...c }) => c),
    correlations: corr,
    items,
    profile: choiceQs.filter(q => q.id.startsWith('DEM') && q.type === 'single').map(q => freq(rows, q)),
    use: choiceQs.filter(q => q.id.startsWith('USE') && q.type === 'single').map(q => freq(rows, q)),
    use_multi: choiceQs.filter(q => q.type === 'multi').map(q => multiFreq(rows, q)),
  };
}
