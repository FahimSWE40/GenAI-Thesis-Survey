import { SCREENING, SECTIONS, LIKERT_LABELS, FORM_VERSION, CONSENT_TEXT, TEXT_PLACEHOLDER, STUDY_INFO } from './questions.js';

const STORE_KEY = 'genai-survey-v' + FORM_VERSION;
const app = document.getElementById('app');
const bar = document.getElementById('progressBar');

const QMAP = Object.fromEntries([...SCREENING, ...SECTIONS.flatMap(s => s.questions || [])].map(q => [q.id, q]));
const SCREEN_IDS = SCREENING.map(q => q.id);
// Required questions only (optional ones, e.g. DEM8 CGPA, may be left blank)
const ALL_IDS = [...SCREEN_IDS, ...SECTIONS.flatMap(s => (s.kind === 'likert' ? s.items : s.questions).filter(q => !q.optional).map(q => q.id))];

let state = load() || fresh();
let submitting = false;

// Persistent anonymous device ID (kept across form versions and after submitting),
// so repeat submissions from the same browser can be detected.
const RESPONDENT_KEY = 'genai-survey-respondent';
const respondentId = (() => {
  try {
    let id = localStorage.getItem(RESPONDENT_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(RESPONDENT_KEY, id); }
    return id;
  } catch { return null; }
})();

function fresh() {
  return { answers: {}, startedAt: new Date().toISOString(), submissionId: crypto.randomUUID(), lang: 'both', status: 'active', src: null, receipt: null };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); return s && s.answers ? s : null; } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage blocked: form still works */ }
}

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = o => (o.en === o.bn
  ? `<span>${esc(o.en)}</span>`
  : `<span class="en">${esc(o.en)}</span><span class="bn">${esc(o.bn)}</span>`);
const ti = o => `<span class="il">${t(o)}</span>`;
const toBn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

function setLang(lang) {
  state.lang = lang;
  document.body.dataset.lang = lang;
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  document.querySelectorAll('[data-setlang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setlang === lang)));
  save();
}
document.querySelectorAll('[data-setlang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.setlang)));

// ---------- renderers ----------
function textQ(q) {
  return `<div class="q" id="q-${q.id}">
    <div class="q-code">${q.id}</div>
    <div class="q-label">
      <label class="q-text" for="in-${q.id}" style="display:block">${t(q)}</label>${help(q)}
    </div>
    <div class="q-answer">
      <input class="text-input" id="in-${q.id}" type="text" name="${q.id}" data-text="1" maxlength="${q.maxLength || 150}"
        autocomplete="off" placeholder="${esc(TEXT_PLACEHOLDER.en)} · ${esc(TEXT_PLACEHOLDER.bn)}" value="${esc(state.answers[q.id] || '')}">
    </div>
  </div>`;
}

function choice(q) {
  if (q.type === 'text') return textQ(q);
  const multi = q.type === 'multi';
  const val = state.answers[q.id];
  const otherOpt = q.options.find(o => o.other);
  const otherOn = otherOpt && (multi ? (val || []).includes(otherOpt.v) : val === otherOpt.v);
  return `<div class="q" id="q-${q.id}" role="group" aria-labelledby="lb-${q.id}">
    <div class="q-code">${q.id}</div>
    <div class="q-label">
      <div class="q-text" id="lb-${q.id}">${t(q)}</div>${help(q)}
      ${multi ? `<div class="q-help">${t({ en: 'Select all that apply', bn: 'প্রযোজ্য সবগুলো বেছে নিন' })}</div>` : ''}
    </div>
    <div class="q-answer">
      <div class="opts${q.options.every(o => o.en.length <= 16 && o.bn.length <= 22) ? ' short' : ''}">${q.options.map(o => {
        const on = multi ? (val || []).includes(o.v) : val === o.v;
        return `<label class="opt ${multi ? 'multi' : ''}"><input type="${multi ? 'checkbox' : 'radio'}" name="${q.id}" value="${esc(o.v)}" ${on ? 'checked' : ''}><span class="box"></span>${ti(o)}</label>`;
      }).join('')}</div>
      ${otherOpt ? `<input class="other-input" type="text" maxlength="200" data-other="${q.id}" aria-label="Other" value="${esc(state.answers[q.id + '_other'] || '')}" ${otherOn ? '' : 'hidden'}>` : ''}
    </div>
  </div>`;
}

function matrix(s) {
  const SCALE = s.scale || LIKERT_LABELS;
  const wide = s.scale ? ' mx-wide' : '';
  const head = `<div class="mx-head${wide}" aria-hidden="true"><div class="mx-blank"></div>${SCALE.map(l => `<div><b>${l.v}</b>${t(l)}</div>`).join('')}</div>`;
  const rows = s.items.map(it => {
    const val = state.answers[it.id];
    return `<div class="mx-row${wide}" id="q-${it.id}" role="radiogroup" aria-label="${esc(it.en)}">
      <div class="mx-stmt"><span class="q-code">${it.attention ? '' : it.id}</span><div>${it.topic || it.optional ? `<div class="mx-topic">${it.topic ? ti(it.topic) : ''}${it.optional ? `<span class="opt-tag">${ti({ en: 'Optional', bn: 'ঐচ্ছিক' })}</span>` : ''}</div>` : ''}${t(it)}${help(it)}</div></div>
      <div class="mx-ends" aria-hidden="true"><span>${ti(SCALE[0])}</span><span>${ti(SCALE[SCALE.length - 1])}</span></div>
      ${SCALE.map(l => `<label class="mx-cell"><input type="radio" name="${it.id}" value="${l.v}" ${val === l.v ? 'checked' : ''} aria-label="${l.v} ${esc(l.en)}"><span class="dot"><span class="dot-n">${l.v}</span></span></label>`).join('')}
    </div>`;
  }).join('');
  return head + `<div>${rows}</div>`;
}

const help = q => (q.help ? `<div class="q-help">${t(q.help)}</div>` : '');

function section(letter, title, body, hint) {
  return `<section class="sec" data-sec="${letter}">
    <div class="sec-head"><span class="sec-letter">${letter}</span><div class="sec-title">${t(title)}</div></div>
    ${hint ? `<div class="sec-hint">${t(hint)}</div>` : ''}
    ${body}
  </section>`;
}

function screenedOut() {
  return SCREEN_IDS.some(id => state.answers[id] !== undefined && state.answers[id] !== 1);
}

// ---------- page ----------
function render() {
  setLang(state.lang || 'both');

  const masthead = `<header class="masthead">
      <h1>${t({
        en: 'Effects of GenAI Dependence on Critical Thinking, Social Connectivity, and Self-Efficacy among Bangladeshi University Students',
        bn: 'বাংলাদেশি বিশ্ববিদ্যালয় শিক্ষার্থীদের সমালোচনামূলক চিন্তা, সামাজিক সংযোগ ও আত্ম-সক্ষমতার ওপর জেনারেটিভ এআই (GenAI) নির্ভরতার প্রভাব' })}</h1>
      <div class="org">${STUDY_INFO.researcherName ? `${esc(STUDY_INFO.researcherName)} · ` : ''}Department of Software Engineering, Daffodil International University</div>
    </header>`;

  if (state.status === 'done') {
    const receipt = state.receipt ? `<div class="receipt">
        <div class="receipt-label">${ti({ en: 'Your response code', bn: 'আপনার উত্তরের কোড' })}</div>
        <div class="receipt-code">${esc(state.receipt)}</div>
        <p>${t({ en: 'Please keep this code (take a screenshot). If you later want to withdraw your answers, send this code to the researcher.',
                 bn: 'অনুগ্রহ করে কোডটি রেখে দিন (স্ক্রিনশট নিন)। পরে উত্তর প্রত্যাহার করতে চাইলে এই কোডটি গবেষকের কাছে পাঠান।' })}</p>
      </div>` : '';
    app.innerHTML = masthead + `<div class="done"><strong>${ti({ en: 'Thank you', bn: 'ধন্যবাদ' })}</strong>${t({ en: 'Your response has been recorded.', bn: 'আপনার উত্তর সংরক্ষিত হয়েছে।' })}${receipt}</div>`;
    bar.style.width = '100%';
    return;
  }

  const contact = [
    STUDY_INFO.contactEmail && `${ti({ en: 'Questions about this study', bn: 'এই গবেষণা নিয়ে প্রশ্ন' })}: ${STUDY_INFO.researcherName ? `${esc(STUDY_INFO.researcherName)}, ` : ''}<a href="mailto:${esc(STUDY_INFO.contactEmail)}">${esc(STUDY_INFO.contactEmail)}</a>`,
    STUDY_INFO.ethicsRef && `${ti({ en: 'Ethics approval', bn: 'নৈতিক অনুমোদন' })}: ${esc(STUDY_INFO.ethicsRef)}`,
  ].filter(Boolean).join(' · ');
  const consent = `<div class="consent"><p>${t(CONSENT_TEXT)}</p>${contact ? `<p class="consent-meta">${contact}</p>` : ''}</div>`;

  const secA = section('A', { en: 'Consent & Eligibility', bn: 'সম্মতি ও যোগ্যতা' }, SCREENING.map(choice).join(''));

  const rest = SECTIONS.map(s => section(s.id, s,
    s.kind === 'likert' ? matrix(s) : s.questions.map(choice).join(''), s.hint)).join('');

  app.innerHTML = masthead + consent + secA +
    `<div id="screenOut" class="screen-out" hidden><strong>${ti({ en: 'Thank you for your interest', bn: 'আগ্রহের জন্য ধন্যবাদ' })}</strong>${t({
      en: 'This survey is only for undergraduate students in Bangladesh who are 18 or older, have used GenAI for their studies, and agree to take part. No information has been saved.',
      bn: 'এই জরিপটি কেবল বাংলাদেশের সেইসব স্নাতক শিক্ষার্থীর জন্য, যাঁদের বয়স ১৮ বা তার বেশি, যাঁরা পড়াশোনায় GenAI ব্যবহার করেছেন এবং অংশ নিতে সম্মত। আপনার কোনো তথ্য সংরক্ষণ করা হয়নি।' })}</div>
    <div id="rest">${rest}
      <div class="actions">
        <div id="err" class="error" role="alert"></div>
        <div id="botcheck"></div>
        <button class="submit" type="button" id="submit">${t({ en: 'Submit', bn: 'জমা দিন' })}</button>
      </div>
    </div>
    <input class="honeypot" type="text" name="website" id="website" tabindex="-1" autocomplete="off" aria-hidden="true">`;

  document.getElementById('submit').onclick = submit;
  mountBotCheck();
  update();
}

function isAnswered(id) {
  const v = state.answers[id];
  return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length >= 2 : v !== undefined && v !== null;
}

function update() {
  const out = screenedOut();
  document.getElementById('screenOut').hidden = !out;
  document.getElementById('rest').hidden = out;
  const done = ALL_IDS.filter(isAnswered).length;
  bar.style.width = `${Math.round((done / ALL_IDS.length) * 100)}%`;
}

// ---------- answer handling ----------
app.addEventListener('change', e => {
  const el = e.target;
  if (!el.name || el.name === 'website' || el.dataset.text) return;
  const id = el.name;
  const raw = isNaN(Number(el.value)) ? el.value : Number(el.value);
  if (el.type === 'checkbox') {
    const cur = new Set(state.answers[id] || []);
    el.checked ? cur.add(raw) : cur.delete(raw);
    state.answers[id] = [...cur];
  } else {
    state.answers[id] = raw;
  }
  document.getElementById('q-' + id)?.classList.remove('missing');

  const otherOpt = QMAP[id]?.options?.find(o => o.other);
  const other = document.querySelector(`[data-other="${id}"]`);
  if (other && otherOpt) {
    const v = state.answers[id];
    const on = Array.isArray(v) ? v.includes(otherOpt.v) : v === otherOpt.v;
    const wasHidden = other.hidden;
    other.hidden = !on;
    if (on && wasHidden) other.focus();
  }
  save();
  update();
});
app.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset && el.dataset.other) { state.answers[el.dataset.other + '_other'] = el.value; save(); }
  if (el.dataset && el.dataset.text) {
    state.answers[el.name] = el.value;
    if (el.value.trim().length >= 2) document.getElementById('q-' + el.name)?.classList.remove('missing');
    save();
    update();
  }
});

// ---------- submit ----------
async function submit() {
  if (submitting) return;
  const err = document.getElementById('err');
  const missing = ALL_IDS.filter(id => !isAnswered(id));
  if (missing.length) {
    missing.forEach(id => document.getElementById('q-' + id)?.classList.add('missing'));
    err.innerHTML = ti({ en: `${missing.length} unanswered`, bn: `${toBn(missing.length)}টি প্রশ্নের উত্তর বাকি আছে` });
    document.getElementById('q-' + missing[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (STUDY_INFO.turnstileSiteKey && !botToken) {
    err.innerHTML = ti({ en: 'Please wait for the security check below to finish, then submit again.', bn: 'নিচের নিরাপত্তা যাচাই শেষ হওয়া পর্যন্ত অপেক্ষা করুন, তারপর আবার জমা দিন।' });
    return;
  }
  submitting = true;
  err.textContent = '';
  const btn = document.getElementById('submit');
  btn.disabled = true;
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: state.submissionId,
        started_at: state.startedAt,
        ui_lang: state.lang,
        website: document.getElementById('website')?.value || '',
        respondent_id: respondentId,
        src: state.src,
        bot_token: botToken,
        answers: state.answers,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const se = new Error(data.error || `Server error ${res.status}`);
      se.server = true;
      throw se;
    }
    state.receipt = data.receipt || null;
    state.status = 'done';
    state.answers = {};
    save();
    render();
    window.scrollTo({ top: 0 });
  } catch (e) {
    console.error(e);
    err.innerHTML = e.server
      // The server answered but could not save (e.g. database not set up) — show its reason
      ? ti({ en: `Could not submit: ${e.message} Your answers are still saved on this device.`,
             bn: 'জমা দেওয়া যায়নি। সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন বা গবেষকের সঙ্গে যোগাযোগ করুন। আপনার উত্তরগুলো এই ডিভাইসে সংরক্ষিত আছে।' })
      // No answer from the server at all — a real connection problem
      : ti({ en: 'Could not submit. Check your internet connection and try again. Your answers are still saved on this device.',
             bn: 'জমা দেওয়া যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন। আপনার উত্তরগুলো এই ডিভাইসে সংরক্ষিত আছে।' });
    btn.disabled = false;
  } finally {
    submitting = false;
  }
}

// ---------- recruitment source (?src=...) ----------
try {
  const src = new URLSearchParams(location.search).get('src');
  if (src) { state.src = src.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60) || null; save(); }
} catch { /* ignore */ }

// ---------- Cloudflare Turnstile bot check (only when a site key is set) ----------
let botToken = null;
function mountBotCheck() {
  const el = document.getElementById('botcheck');
  if (!el || !STUDY_INFO.turnstileSiteKey) return;
  const draw = () => window.turnstile.render(el, {
    sitekey: STUDY_INFO.turnstileSiteKey,
    callback: tok => { botToken = tok; },
    'expired-callback': () => { botToken = null; },
    'error-callback': () => { botToken = null; },
  });
  if (window.turnstile) return draw();
  const sc = document.createElement('script');
  sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  sc.async = true;
  sc.onload = draw;
  document.head.appendChild(sc);
}

render();
