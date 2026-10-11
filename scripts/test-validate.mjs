// Quick checks for the server-side validator. Run: npm test
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validate } from '../api/submit.js';
import { SECTIONS, SCREENING } from '../public/questions.js';

function fullAnswers() {
  const a = {};
  for (const q of SCREENING) a[q.id] = 1;
  for (const s of SECTIONS) {
    if (s.kind === 'likert') for (const it of s.items) a[it.id] = it.attention || 3;
    else for (const q of s.questions) a[q.id] = q.type === 'text' ? 'Daffodil International University' : q.type === 'multi' ? [q.options[0].v] : q.options[0].v;
  }
  return a;
}
const body = (answers, extra = {}) => ({ submission_id: randomUUID(), started_at: new Date(Date.now() - 600_000).toISOString(), ui_lang: 'both', answers, ...extra });

// 1. complete response passes
let r = validate(body(fullAnswers()));
assert.equal(r.ok, true, r.error);
assert.equal(r.row.attention_pass, true);
assert.ok(r.row.duration_sec >= 599);
assert.deepEqual(r.row.use1, ['chatgpt']);

// 2. missing likert item fails
let a = fullAnswers(); delete a.GD3;
assert.equal(validate(body(a)).ok, false);

// 3. out-of-range value fails
a = fullAnswers(); a.CT1 = 6;
assert.equal(validate(body(a)).ok, false);

// 4. ineligible (A2 = No) fails
a = fullAnswers(); a.A2 = 2;
assert.equal(validate(body(a)).ok, false);

// 5. unknown multi-select key fails
a = fullAnswers(); a.USE5 = ['hacking'];
assert.equal(validate(body(a)).ok, false);

// 6. "other" text kept only when "other" is chosen, and trimmed to 200 chars
a = fullAnswers(); a.DEM6 = 10; a.DEM6_other = '  Marine Science  ';
assert.equal(validate(body(a)).row.dem6_other, 'Marine Science');
a = fullAnswers(); a.DEM6_other = 'ignored';
assert.equal(validate(body(a)).row.dem6_other, null);
a = fullAnswers(); a.USE1 = ['chatgpt', 'other']; a.USE1_other = 'x'.repeat(500);
assert.equal(validate(body(a)).row.use1_other.length, 200);

// 7. failed attention check is saved but flagged
a = fullAnswers(); a.ATT2 = 4;
assert.equal(validate(body(a)).row.attention_pass, false);

// 8. typed answers: required, trimmed, whitespace collapsed
a = fullAnswers(); a.DEM5 = '   Software    Engineering ';
assert.equal(validate(body(a)).row.dem5, 'Software Engineering');
a = fullAnswers(); a.DEM3 = ' ';
assert.equal(validate(body(a)).ok, false);

// 9. bad submission id fails
assert.equal(validate({ ...body(fullAnswers()), submission_id: 'abc' }).ok, false);

// 10. optional CGPA (DEM8) may be left blank, but a wrong value is still rejected
a = fullAnswers(); delete a.DEM8;
r = validate(body(a));
assert.equal(r.ok, true, r.error);
assert.equal(r.row.dem8, null);
a = fullAnswers(); a.DEM8 = 9;
assert.equal(validate(body(a)).ok, false);

// 11. authenticity fields
{
  const { receiptCode, requestMeta, verifyBot } = await import('../api/submit.js');
  const sid = randomUUID();
  // receipt code: fixed format, same for a retried submission, different for another one
  assert.match(receiptCode(sid), /^GA-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(receiptCode(sid), receiptCode(sid));
  assert.notEqual(receiptCode(sid), receiptCode(randomUUID()));
  r = validate({ ...body(fullAnswers()), submission_id: sid, respondent_id: randomUUID(), src: 'DIU-CSE WhatsApp!' });
  assert.equal(r.row.receipt_code, receiptCode(sid));
  assert.equal(r.row.src, 'diu-csewhatsapp');
  assert.equal(validate({ ...body(fullAnswers()), respondent_id: 'not-a-uuid' }).row.respondent_id, null);
  // IP is only stored as a salted one-way hash; device type comes from the user agent
  process.env.IP_HASH_SALT = 'test-salt';
  const m1 = requestMeta({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'Mozilla/5.0 (Linux; Android 14) Mobile' } });
  const m2 = requestMeta({ headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' } });
  assert.equal(m1.ip_hash, m2.ip_hash);
  assert.ok(!String(m1.ip_hash).includes('203.0.113.7') && m1.ip_hash.length === 32);
  assert.equal(m1.device_type, 'mobile');
  assert.equal(m2.device_type, 'desktop');
  delete process.env.IP_HASH_SALT;
  assert.equal(requestMeta({ headers: { 'x-forwarded-for': '203.0.113.7' } }).ip_hash, null);
  // bot check is off until TURNSTILE_SECRET_KEY is set
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await verifyBot(undefined, ''), 'not_configured');
}

// 12. optional rating items (sensitive SC items, loneliness) may be skipped; required ones may not
a = fullAnswers(); delete a.SC1; delete a.HC6;
r = validate(body(a));
assert.equal(r.ok, true, r.error);
assert.equal(r.row.sc1, null);
assert.equal(r.row.hc6, null);
a = fullAnswers(); delete a.HC1;
assert.equal(validate(body(a)).ok, false);

console.log('All validator tests passed.');

// Pre-launch reminder (does not fail the tests)
const { STUDY_INFO } = await import('../public/questions.js');
const missingInfo = ['contactEmail', 'ethicsRef'].filter(k => !STUDY_INFO[k]);
if (missingInfo.length) {
  console.warn(`PRE-LAUNCH: set STUDY_INFO.${missingInfo.join(' and STUDY_INFO.')} in public/questions.js before sharing the form.`);
}
