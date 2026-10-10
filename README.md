# GenAI Student Survey — Online Form

Bilingual (English / বাংলা) data-collection form for the thesis
*Effects of GenAI Dependence on Critical Thinking, Social Connectivity, and Self-Efficacy among Bangladeshi University Students.*

- **Hosting:** Vercel (static page + one serverless function)
- **Database:** Supabase (Postgres)
- **No build step and no npm packages** — plain HTML/CSS/JS.

## How it works

```
Participant's phone/laptop                 Vercel                          Supabase
┌──────────────────────────┐   POST    ┌──────────────────────┐  insert  ┌──────────────────┐
│ public/index.html        │ ───────►  │ api/submit.js         │ ───────► │ table: responses │
│ one section per screen,  │  answers  │ checks every answer   │ service  │ RLS on, no public│
│ autosaves on the device  │           │ against questions.js  │ role key │ access           │
└──────────────────────────┘           └──────────────────────┘          └──────────────────┘
```

- **Participants' experience:** one scrolling page laid out like a printed questionnaire — Sections A–I, multiple-choice answers as compact buttons, 1–5 scale items as a grid (statements × 1–5) with a sticky scale header, language switch (EN / বাংলা / EN + বাংলা), and a progress bar. Unanswered questions are highlighted on Submit. Progress is kept on the device if the page is closed. Answering "No" to A1–A3 hides the rest of the form and **nothing is saved**.
- **Data quality built in:** every answer is re-checked on the server; duplicate submits are ignored (`submission_id`); a hidden honeypot field blocks simple bots; `duration_sec` and `attention_pass` are recorded for screening.
- **Privacy:** no name, email, student ID, or IP address is stored. The database key lives only in Vercel's environment variables, never in the browser.

## Files

| Path | What it is |
|---|---|
| `public/questions.js` | **All questions, options and codes — the single source of truth** |
| `public/index.html`, `app.js`, `styles.css` | The form participants see |
| `api/submit.js` | Serverless function: validates and saves a response |
| `supabase/schema.sql` | Table + analysis view — *generated*, run once in Supabase |
| `CODEBOOK.md` | Every column and value code — *generated*, use it for SPSS |
| `scripts/generate.mjs` | Regenerates `schema.sql` and `CODEBOOK.md` from `questions.js` |
| `scripts/dev-server.mjs` | Local test server |
| `scripts/test-validate.mjs` | Validator tests |

## 1. Test on your computer (optional)

Needs Node.js 18+.

```bash
cd survey-form
npm test          # validator tests
npm run dev       # → http://localhost:3000
```

Without a `.env.local`, test submissions are written to `dev-responses.jsonl` (not uploaded anywhere). Delete that file afterwards.

## 2. Set up Supabase

1. Create a project at <https://supabase.com> (pick the **Singapore** region — closest to Bangladesh).
2. **SQL Editor → New query →** paste all of `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **service_role** (secret) key.

## 3. Deploy on Vercel

**Option A — GitHub (recommended)**
1. Push this project to a GitHub repository.
2. In Vercel: **Add New → Project →** import the repo.
3. **Root Directory:** `survey-form` · **Framework Preset:** Other · leave Build Command empty.
4. **Environment Variables:** add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from step 2).
5. **Deploy.** Your form is live at `https://<project-name>.vercel.app`.

**Option B — Vercel CLI**
```bash
npm i -g vercel
cd survey-form
vercel                                   # first deploy (preview)
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

Then submit one test response on the live site and check it appears in Supabase **Table Editor → responses**. Delete the test row before real data collection starts.

## 4. Collect data

- Share the Vercel link (WhatsApp, Facebook groups, class groups). Optionally make a QR code of the link for classrooms.
- Watch progress in Supabase **Table Editor → responses**.
- For a quick count: `select count(*), count(*) filter (where attention_pass) from responses;`

## 5. Export for SPSS / SmartPLS

Use the view **`responses_spss`** — it already has:
- multi-select answers (C1, C5) split into 0/1 columns,
- reverse-coded items `sc6_r`, `sc7_r`,
- construct means (`gd_mean`, `co_mean`, `ct_mean`, `sc_mean`, `se_mean`, `al_mean`).

In Supabase: **SQL Editor →** `select * from responses_spss;` **→ Download CSV**. Open the CSV in SPSS and use `CODEBOOK.md` for value labels.

Screening before analysis (see thesis plan): drop rows where `attention_pass = false`, `duration_sec < 300`, or a whole section has the same answer.

## Changing questions

1. Edit `public/questions.js` (e.g., delete the Section **E** block if Cognitive Offloading is dropped).
2. Bump `FORM_VERSION` if data collection has already started.
3. `npm run generate` → re-run the new `supabase/schema.sql` **only on an empty table** (before collection). After collection has started, add columns with `alter table` instead.
4. `npm test`, then redeploy.

**Do this before going live:** the Bangla text is a first draft — finish the forward–back translation check and the pilot (30–50 students), then lock the questions.
