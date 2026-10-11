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
| `supabase/schema.sql` | Tables, append-only trigger, withdrawals table and analysis view — *generated* |
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

## Export for SPSS / SmartPLS

Run `select * from responses_spss;` in the SQL Editor and **Download CSV**. The view includes:

- every item as its own column (lower-case code, e.g. `gd1`, `sc3`),
- multi-select answers (USE1, USE5) as 0/1 columns,
- the authenticity fields and the `withdrawn` flag,
- construct means: `ct_mean`, `sc_mean`, `se_mean`, `gd_mean`, `co_mean`, `al_mean`.

Recommended screening order (report how many rows each step removes): `withdrawn = true` → `src = 'test'` → `attention_pass = false` → `duration_sec < 300` → straight-lining → repeated `respondent_id`. Use the item columns, not the means, as indicators in SmartPLS.

---

## Change the questions

1. Edit `public/questions.js` (for example, delete the Section **H** block if Cognitive Offloading is dropped).
2. Run `npm run generate` to rebuild `supabase/schema.sql` and `CODEBOOK.md`, then `npm test`.
3. Before data collection, re-run the new `schema.sql` on an empty project. After collection has started, never re-create the table — add new columns with `alter table` and increase `FORM_VERSION`.
4. Push to `main`; Vercel redeploys.

Before going live: complete expert review, Bangla forward–back translation and a pilot (30–50 students), then freeze the questions.
