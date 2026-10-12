# GenAI Thesis Survey

A bilingual (English / বাংলা) online questionnaire for the undergraduate thesis

> **Effects of GenAI Dependence on Critical Thinking, Social Connectivity, and Self-Efficacy among Bangladeshi University Students**
>
> Fahim Bin Forhad · Supervisor: Dr. Md. Abdul Kader, Associate Professor · Department of Software Engineering, Daffodil International University
>
> Contact: forhad2305341389@diu.edu.bd

**Live form:** https://gen-ai-survey.vercel.app

The form collects anonymous survey data for a quantitative, cross-sectional study analysed with PLS-SEM. It is built to be easy for students to complete on a phone, and to give reviewers verifiable evidence that every response came from a real, separate participant.

- **Front end:** plain HTML, CSS and JavaScript — no framework, no build step
- **Fonts:** Inter (English), Noto Serif Bengali (বাংলা), Fraunces (headings) — via Google Fonts
- **Server:** one Vercel serverless function (`api/submit.js`)
- **Database:** Supabase (PostgreSQL), append-only
- **Dependencies:** none (Node.js 18+ only for local testing)

---

## Contents

- [The questionnaire](#the-questionnaire)
- [How it works](#how-it-works)
- [Data authenticity](#data-authenticity)
- [Privacy and ethics](#privacy-and-ethics)
- [Repository structure](#repository-structure)
- [Run locally](#run-locally)
- [Set up Supabase](#set-up-supabase)
- [Deploy on Vercel](#deploy-on-vercel)
- [Collect data](#collect-data)
- [Export for SPSS / SmartPLS](#export-for-spss--smartpls)
- [Change the questions](#change-the-questions)

---

## The questionnaire

One scrolling page, about 12–15 minutes, every question in English and Bangla.

| Section | Shown to students as | Measures | Items | Response format |
|:-:|---|---|---|---|
| A | Consent & Eligibility | Consent, 18+, undergraduate in Bangladesh, GenAI use in last 6 months | A1–A4 | Yes / No — any "No" ends the survey (nothing saved) |
| B | About You | Background / controls | DEM1–DEM10 | Choice; university and department are typed; CGPA optional |
| C | Your Use of GenAI | Usage profile, mode of use, AI-companion use | USE1–USE9 | Choose one / many |
| D | How You Think | Critical Thinking (DV1) | CT1–CT8 + attention check | 1–5 agreement |
| E | People or AI? | Social Connectivity (DV2): preference for people vs AI companions | SC1–SC8 | 1 Always an AI chatbot … 5 Always a person |
| F | Confidence in Yourself | Self-Efficacy (DV3): academic + general | ASE1–ASE4, GSE1–GSE4 + attention check | 1–5 agreement |
| G | Depending on GenAI | GenAI Dependence (IV) | GD1–GD8 | 1–5 agreement |
| H | Letting GenAI Think for You | Cognitive Offloading (optional mediator) | CO1–CO5 | 1–5 agreement |
| I | What You Know About GenAI | AI Literacy (moderator) | AL1–AL8 | 1–5 agreement |

Agreement scale: 1 Strongly Disagree (একদমই একমত নই) · 2 Disagree (একমত নই) · 3 Neutral (নিরপেক্ষ) · 4 Agree (একমত) · 5 Strongly Agree (সম্পূর্ণ একমত).

Item sources (adapted, plain-language wording): Sosu (2013) Critical Thinking Disposition Scale · Midgley et al. (2000) PALS academic efficacy · Schwarzer & Jerusalem (1995) General Self-Efficacy · Morales-García et al. (2024), Liu (2026), Hou et al. (2025) GenAI dependence · Gerlich (2025) cognitive offloading · Wang, Rau & Yuan (2023) AI Literacy Scale. Social Connectivity items are self-developed, informed by Malfacini (2025) and Jiao et al. (2026).

Every column and value code is listed in [`CODEBOOK.md`](CODEBOOK.md).

---

## How it works

```
 Participant (phone / laptop)          Vercel                              Supabase
┌───────────────────────────┐  POST  ┌────────────────────────────┐ insert ┌─────────────────────────┐
│ public/index.html         │ ─────► │ api/submit.js              │ ─────► │ responses (append-only) │
│ one-page bilingual form   │        │ • re-checks every answer   │ secret │ RLS on, no public access│
│ autosaves on the device   │        │ • hashes IP, device type   │  key   │ withdrawals             │
│ shows a receipt code      │ ◄───── │ • bot check, receipt code  │        │ responses_spss (view)   │
└───────────────────────────┘        └────────────────────────────┘        └─────────────────────────┘
```

**For participants:** large tap targets, language switch (EN / বাংলা / EN + বাংলা), progress bar, short help notes for unfamiliar terms, unanswered questions highlighted on Submit, answers kept on the device if the page is closed, eye-friendly colours in light and dark mode.

**For data quality:** every answer is validated on the server against `public/questions.js`; duplicate submissions are ignored; two attention checks (correct answers 4 and 2); completion time is recorded; a hidden honeypot field and an optional Cloudflare Turnstile check stop bots.

---

## Data authenticity

How a reviewer can verify that responses are genuine and were not entered by the researcher:

| Evidence | Field | What it shows |
|---|---|---|
| Server timestamp | `created_at` | Set by the database at the moment of saving |
| Separate devices | `respondent_id` | Random ID kept in the participant's browser; the same device always sends the same ID |
| Separate networks | `ip_hash` | One-way salted hash of the connection; the IP address itself is never stored |
| Device | `device_type` | mobile / tablet / desktop |
| Recruitment trail | `src` | Channel tag from the shared link (`?src=…`), matchable to dated recruitment posts |
| Participant-held proof | `receipt_code` | Shown to the participant after submitting (e.g. `GA-5YF4-PZMA`) and used to withdraw |
| Human check | `bot_check` | `passed` when Cloudflare Turnstile confirmed a human |
| Response quality | `duration_sec`, `attention_pass` | Completion time and attention checks |

**Append-only dataset.** A database trigger blocks every `UPDATE`, `DELETE` and `TRUNCATE` on `responses`. Nobody, including the researcher, can edit or remove a saved response; removing the protection would require a new, recorded migration.

**Withdrawal without deletion.** A participant who withdraws sends their receipt code; it is added to the `withdrawals` table and the response is flagged `withdrawn = true` in the analysis view.

```sql
insert into withdrawals (receipt_code, note) values ('GA-5YF4-PZMA', 'participant request by email');
```

**Public history.** This repository's commit history shows the questionnaire was fixed before data collection began.

---

## Privacy and ethics

- No name, email, student ID or IP address is stored. Typed university and department names are the only free-text background answers; results are reported at group level only.
- The consent text explains what is recorded and how to withdraw.
- Participants must be 18 or older and must give consent before any question is shown.
- The Supabase secret key exists only in Vercel's environment variables, never in the browser or in this repository.
- Before launch, fill in the researcher's contact email and the ethics approval reference in `public/questions.js` → `STUDY_INFO` (shown under the consent text). `npm test` warns while they are empty.

---

## Repository structure

| Path | Purpose |
|---|---|
| `public/questions.js` | **Single source of truth** — every question, option, code, scale and help note (EN + BN), plus `STUDY_INFO` settings |
| `public/index.html`, `public/app.js`, `public/styles.css` | The form participants see |
| `api/submit.js` | Serverless function: validation, IP hashing, device type, bot check, receipt code, insert, clear error messages |
| `api/health.js` | Deployment status page (`/api/health`): settings present + database reachable |
| `api/admin.js` · `public/admin.*` | Researcher dashboard (`/admin`): submissions and link visits, password-protected, read-only |
| `api/visit.js` | Records anonymous link-visit events for the dashboard |
| `api/stats.js` | Descriptive statistics for the dashboard (frequencies, M, SD, skewness, kurtosis, α, correlations) |
| `supabase/schema.sql` | Tables, append-only trigger, withdrawals table and analysis view — *generated* |
| `supabase/upgrade_to_v2_8.sql` | Brings a database created before v2.8 up to the current rules (applied to the live project on 2026-10-12) |
| `CODEBOOK.md` | Every column and value code — *generated* |
| `scripts/generate.mjs` | Regenerates `schema.sql` and `CODEBOOK.md` from `questions.js` |
| `scripts/export-docs.mjs` | Writes the questionnaire documents for the thesis folder (skipped outside it) |
| `scripts/dev-server.mjs` | Local test server |
| `scripts/test-validate.mjs` | Automated tests |
| `vercel.json` | Vercel settings (serves `public/`, security headers) |
| `.env.example` | List of environment variables |

---

## Run locally

Requires Node.js 18 or newer.

```bash
npm test        # automated tests
npm run dev     # http://localhost:3000
```

Without a `.env.local` file, test submissions are written to `dev-responses.jsonl` on your computer only. To test against Supabase, copy `.env.example` to `.env.local` and fill in the values (never commit it).

---

## Set up Supabase

1. Create a Supabase project (Singapore region is closest to Bangladesh).
2. **SQL Editor → New query →** paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Project Settings → API Keys:** copy the **Project URL** and the **secret** key (`sb_secret_…`).
   The publishable key is not used — it cannot write to the locked table, by design.

Supabase will show an "RLS enabled, no policy" notice for `responses` and `withdrawals`. This is intentional: only the server can access the data.

---

## Deploy on Vercel

1. **Add New → Project →** import this repository.
2. **Framework Preset:** Other · **Root Directory:** `./` · leave the build command empty.
3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase **secret** key |
   | `IP_HASH_SALT` | Long random text (40+ characters). Keep it secret and **never change it during data collection** |
   | `TURNSTILE_SECRET_KEY` | *Optional* — Cloudflare Turnstile secret key |
   | `HEALTH_TOKEN` | *Optional* — private text that unlocks the detailed `/api/health` view (sent as the `x-health-token` header) |

4. **Deploy.** Every push to `main` redeploys automatically.
5. **Check the deployment:** open `https://<your-site>.vercel.app/api/health` — publicly it only shows `{"ready": true|false}`. For details, set a private `HEALTH_TOKEN` in Vercel and send it as a header (not in the URL, so it never appears in request logs):

   ```bash
   curl -H "x-health-token: <your token>" https://<your-site>.vercel.app/api/health
   ```
   ```powershell
   Invoke-RestMethod https://<your-site>.vercel.app/api/health -Headers @{ "x-health-token" = "<your token>" }
   ```
   The detailed view lists which settings are present (never their values) and whether the `responses` table is reachable. After changing environment variables, redeploy so they take effect.

**If Submit fails,** participants see a neutral message with a short code (details are kept out of public view):

| Code | Meaning | Fix |
|---|---|---|
| S1 | Database settings missing on the server | Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel, then redeploy |
| S2 | Survey table not found | Run `supabase/schema.sql` in the SQL Editor of the right project |
| S3 | Server cannot access the database | Use the **secret** key (`sb_secret_…`), not the publishable key |
| S4 | An answer broke a database rule | Usually an outdated page — reload; if it persists, check `schema.sql` matches `questions.js` |
| S5 | Other save error | Check the Vercel function log (it records only the code and status, never answers) |

"Check your internet connection" appears only when the server cannot be reached at all.

**Bot check (optional, recommended):** Cloudflare dashboard → **Turnstile → Add widget** (your Vercel domain, mode *Managed*). Put the **site key** in `public/questions.js` → `STUDY_INFO.turnstileSiteKey` and push; put the **secret key** in Vercel as `TURNSTILE_SECRET_KEY`.

**Testing the live form:** saved responses cannot be deleted, so always test with `?src=test` in the link and exclude `src = 'test'` in analysis.

---

## Collect data

Give each recruitment channel its own link tag and keep a log (date, channel, screenshot of the post):

```
https://<your-site>.vercel.app/?src=pilot
https://<your-site>.vercel.app/?src=diu-cse-whatsapp
https://<your-site>.vercel.app/?src=du-facebook
```

Progress check in the Supabase SQL Editor:

```sql
select count(*)                                  as responses,
       count(*) filter (where attention_pass)    as passed_attention,
       count(distinct respondent_id)             as devices,
       count(distinct ip_hash)                   as networks
from responses
where src is distinct from 'test';
```

---

## Admin dashboard

**https://gen-ai-survey.vercel.app/admin** shows the researcher how data collection is going and gives thesis-ready descriptive statistics. Sign in with the admin password (`ADMIN_TOKEN`, a *sensitive* Vercel environment variable; the researcher's copy is in the git-ignored `.env.local`).

| Tab | What it shows |
|---|---|
| **Overview** | Valid responses, submissions, today, unique link visitors, median completion time, last submission; progress to N = 400; submissions per day (valid vs excluded); exclusion reasons; link visit → valid response funnel; unique visitors per day |
| **Participants** | Doughnut charts (gender, age, institution type, year, study device, form language); bar charts (subject group, top universities, CGPA, internet speed, recruitment link, survey device); respondent profile table (n, %) with CSV download |
| **GenAI use** | Bar charts for tools, purposes, duration, frequency, daily time, use of answers, AI for company, uses outside studies (multiple-answer items as % of respondents); training doughnut; frequency table with CSV download |
| **Descriptive statistics** | Per construct: items, n, M, SD, median, min, max, skewness, kurtosis, Cronbach's α (CSV); construct means ± SD chart; Pearson correlation heatmap; item-level answer distribution (stacked 1–5 bars) and item M/SD/skewness/kurtosis (CSV) |
| **Submissions** | Per-link table (visitors, started, submitted, valid, conversion) and the latest 200 submissions with status, filter and search |

- **Statistics** use valid cases only and are computed on the server (`api/stats.js`): construct score = mean of answered items with HC6 reversed (as `CT_mean` … in `export_spss`); α on complete cases; skewness and kurtosis with the SPSS formulas. Final thesis analysis should still be run in SPSS / SmartPLS on the exports.
- **Link visits:** the form page sends anonymous events to `/api/visit` (browser ID, event, source tag and device type only; one record per visitor, event and day in the `visits` table; failures never affect the form).
- **Same rules as the exports:** a case counts as valid exactly when `Valid = 1` in `export_spss`.
- **Safe by design:** read-only (cannot change or delete anything); hashed IPs, device IDs and individual answers never leave the server (only totals and statistics); Chart.js is loaded from cdnjs with an integrity hash; the password is sent in a header and kept only for the open tab; wrong passwords are slowed down; pages are `noindex` and never cached. Refreshes every minute.
- **Change the password:** Vercel → Settings → Environment Variables → edit `ADMIN_TOKEN` → redeploy.

---

## Export for SPSS / SmartPLS

Two ready-made exports name every column **exactly like the form codes** (`GD1`, `CT9`, `SC1`, `HC6_R`, `USE1_chatgpt`, …) and identify each submission with **`Case_ID`**. In the Supabase SQL Editor run one of these and click **Download CSV**:

| Query | Use in | What you get |
|---|---|---|
| `select * from export_spss;` | **SPSS** | All submissions and all variables: `Case_ID`, `Receipt`, timestamps, completion time, language, device, recruitment source; screening flags `Flag_test`, `Flag_withdrawn`, `Flag_attention`, `Flag_too_fast` (< 300 s), `Flag_repeat_device`, `Flag_straightline_n`; overall **`Valid`** (1 = include); every answer; multi-select answers as 0/1 columns; `HC6_R` (reversed); construct means `CT_mean`, `SC_mean`, `HC_mean`, `SE_mean`, `GD_mean`, `CO_mean`, `AL_mean` |
| `select * from export_smartpls;` | **SmartPLS** | Valid cases only; numbers only: `Case_ID`, numeric controls (DEM, USE) and every model indicator, with `HC6_R` instead of `HC6`; skipped optional answers coded **`-99`** |

**`Valid = 1`** means: not a test (`?src=test`), not withdrawn, passed both attention checks, took at least 300 seconds, and is the first submission from that device. Straight-lining is flagged (`Flag_straightline_n` = number of rating sections answered with a single value) but not excluded automatically. Check those cases and decide in SPSS.

**SPSS:** File → Import Data → CSV Data → open `export_spss` CSV → run [`analysis/spss_labels.sps`](analysis/spss_labels.sps) (adds every question text and answer label) → `FILTER BY Valid.`

**SmartPLS 4:** import the `export_smartpls` CSV, set the **missing value marker to `-99`**, then build the model: GD → CO → CT / SC / HC / SE, with AL as moderator. Use item columns as indicators, not the means.

The older lower-case view `responses_spss` is still available for quick checks.

---

## Change the questions

1. Edit `public/questions.js` (for example, delete the Section **H** block if Cognitive Offloading is dropped).
2. Run `npm run generate` to rebuild `supabase/schema.sql` and `CODEBOOK.md`, then `npm test`.
3. Before data collection, re-run the new `schema.sql` on an empty project. After collection has started, never re-create the table — add new columns with `alter table` and increase `FORM_VERSION`.
4. Push to `main`; Vercel redeploys.

Before going live: complete expert review, Bangla forward–back translation and a pilot (30–50 students), then freeze the questions.
