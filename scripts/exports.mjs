// Builds the analysis exports from public/questions.js:
//   export_spss      — every variable, named exactly like the form codes, with Case_ID and screening flags
//   export_smartpls  — valid cases only, numeric indicators/controls only, missing = -99
//   spss_labels.sps  — SPSS variable and value labels matching the form
import { SECTIONS, LIKERT_LABELS, fieldList } from '../public/questions.js';

export const MIN_SECONDS = 300;      // responses faster than this are flagged as too fast
export const SMARTPLS_MISSING = -99; // SmartPLS missing-value marker

const sqlStr = s => `'${String(s).replace(/'/g, "''")}'`;
const q = name => `"${name}"`;                       // quoted identifier keeps the form-code capitals
const spssStr = s => `'${String(s).replace(/'/g, "''").replace(/\s+/g, ' ').slice(0, 240)}'`;

const FIELDS = fieldList();
const LIKERT = SECTIONS.filter(s => s.kind === 'likert');
const itemsOf = s => s.items.filter(i => !i.attention);
const dummyName = (f, o) => `${f.q.id}_${o.other ? 'other_selected' : o.v}`;

// Shared base: one row per submission plus screening information
function baseCte(withStraightline = true) {
  const sl = LIKERT.map(s => {
    const arr = `array[${itemsOf(s).map(i => i.id.toLowerCase()).join(', ')}]`;
    return `(case when (select count(x) from unnest(${arr}) as x) >= 3 and (select count(distinct x) from unnest(${arr}) as x) = 1 then 1 else 0 end)`;
  });
  return `with base as (
  select r.*,
    exists (select 1 from public.withdrawals w where w.receipt_code = r.receipt_code) as withdrawn,
    -- repeat submissions are counted among real (non-test) submissions only
    row_number() over (partition by coalesce(r.respondent_id::text, r.id::text), (coalesce(r.src, '') = 'test') order by r.created_at) as device_seq${withStraightline ? `,
    (${sl.join('\n     + ')}) as straightline_n` : ''}
  from public.responses r
)`;
}

const VALID = `(coalesce(src, '') <> 'test' and not withdrawn and coalesce(attention_pass, false)
     and coalesce(duration_sec, 0) >= ${MIN_SECONDS} and device_seq = 1)`;

export function exportViewsSql() {
  // ---- export_spss ----
  const spss = [
    `id as ${q('Case_ID')}`, `receipt_code as ${q('Receipt')}`, `created_at as ${q('Submitted_at')}`,
    `started_at as ${q('Started_at')}`, `duration_sec as ${q('Duration_sec')}`, `form_version as ${q('Form_version')}`,
    `ui_lang as ${q('Language')}`, `device_type as ${q('Device')}`, `src as ${q('Source')}`, `bot_check as ${q('Bot_check')}`,
    `(case when coalesce(src, '') = 'test' then 1 else 0 end) as ${q('Flag_test')}`,
    `(case when withdrawn then 1 else 0 end) as ${q('Flag_withdrawn')}`,
    `(case when coalesce(attention_pass, false) then 0 else 1 end) as ${q('Flag_attention')}`,
    `(case when coalesce(duration_sec, 0) < ${MIN_SECONDS} then 1 else 0 end) as ${q('Flag_too_fast')}`,
    `(case when device_seq > 1 then 1 else 0 end) as ${q('Flag_repeat_device')}`,
    `straightline_n as ${q('Flag_straightline_n')}`,
    `(case when ${VALID} then 1 else 0 end) as ${q('Valid')}`,
  ];
  for (const f of FIELDS) {
    if (f.kind === 'multi') {
      for (const o of f.q.options) spss.push(`(case when ${sqlStr(o.v)} = any(${f.col}) then 1 else 0 end) as ${q(dummyName(f, o))}`);
    } else if (f.kind === 'other_text') {
      spss.push(`${f.col} as ${q(f.q.id + '_other')}`);
    } else {
      spss.push(`${f.col} as ${q(f.q.id)}`);
      if (f.kind === 'likert' && f.q.reverse) spss.push(`(6 - ${f.col}) as ${q(f.q.id + '_R')}`);
    }
  }
  for (const s of LIKERT) {
    const terms = itemsOf(s).map(i => (i.reverse ? `(6 - ${i.id.toLowerCase()})` : i.id.toLowerCase()));
    spss.push(`round((select avg(x) from unnest(array[${terms.join(', ')}]) as x)::numeric, 3) as ${q(s.short.toUpperCase() + '_mean')}`);
  }

  // ---- export_smartpls (valid cases, numbers only, missing = -99) ----
  const pls = [`id as ${q('Case_ID')}`];
  for (const s of SECTIONS.filter(x => x.kind !== 'likert')) {
    for (const qq of s.questions.filter(x => x.type === 'single')) {
      pls.push(`coalesce(${qq.id.toLowerCase()}, ${SMARTPLS_MISSING}) as ${q(qq.id)}`);
    }
  }
  for (const s of LIKERT) {
    for (const it of itemsOf(s)) {
      const c = it.id.toLowerCase();
      pls.push(it.reverse
        ? `coalesce(6 - ${c}, ${SMARTPLS_MISSING}) as ${q(it.id + '_R')}`
        : `coalesce(${c}, ${SMARTPLS_MISSING}) as ${q(it.id)}`);
    }
  }

  return `-- ---------- Analysis exports (named exactly like the form codes) ----------
-- export_spss: every variable + Case_ID + screening flags (Valid = 1 → include).
-- export_smartpls: valid cases only, numeric indicators/controls only, missing = ${SMARTPLS_MISSING}.
-- Export: SQL Editor → select * from export_spss;  (or export_smartpls) → Download CSV.
drop view if exists public.export_spss;
create view public.export_spss
with (security_invoker = true) as
${baseCte()}
select
  ${spss.join(',\n  ')}
from base
order by id;

drop view if exists public.export_smartpls;
create view public.export_smartpls
with (security_invoker = true) as
${baseCte(false)}
select
  ${pls.join(',\n  ')}
from base
where ${VALID}
order by id;

revoke all on public.export_spss from anon, authenticated, service_role;
revoke all on public.export_smartpls from anon, authenticated, service_role;
`;
}

export function spssSyntax(version) {
  const varLabels = [
    ['Case_ID', 'Case ID (submission number)'], ['Receipt', 'Receipt code shown to the participant'],
    ['Submitted_at', 'Saved at (server time, UTC)'], ['Started_at', 'Form opened at (UTC)'], ['Duration_sec', 'Completion time (seconds)'],
    ['Form_version', 'Questionnaire version'], ['Language', 'Language view (en/bn/both)'], ['Device', 'Device type'],
    ['Source', 'Recruitment source tag (?src=)'], ['Bot_check', 'Bot check result'],
    ['Flag_test', 'Researcher test submission'], ['Flag_withdrawn', 'Withdrawn by participant'],
    ['Flag_attention', 'Failed an attention check'], ['Flag_too_fast', `Completed in under ${MIN_SECONDS} seconds`],
    ['Flag_repeat_device', 'Repeat submission from the same device'], ['Flag_straightline_n', 'Rating sections answered with one value throughout'],
    ['Valid', 'Valid case for analysis'],
  ];
  const valueGroups = [];
  const yesNoVars = ['Flag_test', 'Flag_withdrawn', 'Flag_attention', 'Flag_too_fast', 'Flag_repeat_device'];
  for (const f of FIELDS) {
    if (f.kind === 'multi') {
      const names = f.q.options.map(o => dummyName(f, o));
      f.q.options.forEach((o, i) => varLabels.push([names[i], `${f.q.id}: ${o.en}`]));
      valueGroups.push([names, [[0, 'Not selected'], [1, 'Selected']]]);
    } else if (f.kind === 'other_text') {
      varLabels.push([f.q.id + '_other', `${f.q.id}: Other (typed)`]);
    } else if (f.kind === 'text') {
      varLabels.push([f.q.id, `${f.q.id}: ${f.q.en}`]);
    } else if (f.kind === 'single') {
      varLabels.push([f.q.id, `${f.q.id}: ${f.q.en}`]);
      valueGroups.push([[f.q.id], f.q.options.map(o => [o.v, o.en])]);
    } else if (f.kind === 'likert') {
      const sec = f.section;
      const scale = (sec.scale || LIKERT_LABELS).map(l => [l.v, l.en]);
      varLabels.push([f.q.id, `${f.q.id}: ${f.q.en}`]);
      const names = [f.q.id];
      if (f.q.reverse) { varLabels.push([f.q.id + '_R', `${f.q.id} reversed (6 - ${f.q.id})`]); names.push(f.q.id + '_R'); }
      valueGroups.push([names, scale]);
    }
  }
  for (const s of LIKERT) varLabels.push([s.short.toUpperCase() + '_mean', `${s.construct}: mean of answered items`]);
  valueGroups.push([yesNoVars, [[0, 'No'], [1, 'Yes']]]);
  valueGroups.push([['Valid'], [[0, 'Exclude'], [1, 'Include']]]);

  // merge value groups that share identical labels (keeps the syntax short)
  const merged = new Map();
  for (const [names, labels] of valueGroups) {
    const key = JSON.stringify(labels);
    merged.set(key, [...(merged.get(key) || []), ...names]);
  }

  return `* GenAI Dependence survey - SPSS labels (form version ${version}).
* GENERATED by scripts/generate.mjs from public/questions.js. Do not edit by hand.
* 1) In Supabase run: select * from export_spss;  and download the CSV.
* 2) In SPSS: File > Import Data > CSV Data, open the file.
* 3) Run this syntax to add question texts and answer labels.
* 4) Analyse cases with Valid = 1:  FILTER BY Valid.

VARIABLE LABELS
${varLabels.map(([n, l], i) => `  ${i ? '/' : ''}${n} ${spssStr(l)}`).join('\n')}
.

VALUE LABELS
${[...merged].map(([key, names], i) => `  ${i ? '/' : ''}${names.join(' ')}\n    ${JSON.parse(key).map(([v, l]) => `${v} ${spssStr(l)}`).join(' ')}`).join('\n')}
.

* Optional items left blank are system-missing.
* Use FILTER BY Valid (or SELECT IF Valid = 1) before analysis.
EXECUTE.
`;
}
