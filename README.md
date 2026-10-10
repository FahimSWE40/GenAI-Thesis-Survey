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

- **Participants' experience:** one scrolling page laid out like a printed questionnaire — Sections A–I, multiple-choice answers as compact buttons, 1–5 scale items as a grid (statements × 1–5) with a sticky scale header, language switch (EN / বাংলা / EN + বাংলা), and a progress bar. Unanswered questions are highlighted on Submit. Progress is kept on the device if the page is closed. Answering "No" to A1–A4 hides the rest of the form and **nothing is saved**.
- **Data quality built in:** every answer is re-checked on the server; duplicate submits are ignored (`submission_id`); a hidden honeypot field blocks simple bots; `duration_sec` and `attention_pass` are recorded for screening.
- **Privacy:** no name, email, student ID or IP address is stored. The database key lives only in Vercel's environment variables, never in the browser.

## Data authenticity (for reviewers)

Every response carries evidence that it came from a real, separate participant — without identifying anyone:

| Field | What it shows |
|---|---|
| `created_at` | Set by the database server at the moment of saving (not by the researcher's computer) |
| `respondent_id` | Random ID kept in the participant's browser — the same device always sends the same ID, so repeat submissions are visible |
| `ip_hash` | One-way salted code of the internet connection (the IP address is never stored) — shows responses came from many networks |
| `device_type` | mobile / tablet / desktop |
| `src` | Recruitment channel from the link (`?src=…`) — the response timeline can be matched to recruitment posts |
| `receipt_code` | Shown to the participant after submitting (e.g. `GA-7K2P-QX9M`); real participants hold these codes and use them to withdraw |
| `bot_check` | `passed` when Cloudflare Turnstile confirmed a human |
| `duration_sec`, `attention_pass` | Completion time and two attention checks |

**The dataset is append-only.** A database trigger blocks every `UPDATE`, `DELETE` and `TRUNCATE` on `responses` — nobody, including the researcher, can edit or remove a saved response. Removing the protection would need a new migration, which Supabase records.

**Withdrawals** do not delete data: add the participant's receipt code to the `withdrawals` table, and the `withdrawn` column in `responses_spss` becomes `true` for that response — exclude those rows in analysis.

```sql
insert into withdrawals (receipt_code, note) values ('GA-7K2P-QX9M', 'participant request by email');
```

**Recruitment links** — give each channel its own tag, e.g.
`https://<your-site>.vercel.app/?src=diu-cse-whatsapp`, `…/?src=du-facebook`, `…/?src=pilot`.
Keep a recruitment log (date, channel, screenshot of the post).

**Suggested reviewer-facing evidence:** OSF pre-registration before collection; read-only access to the Supabase project for your supervisor; the de-identified dataset, codebook and this repository's commit history as supplementary material.

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

1. In Vercel: **Add New → Project →** import the GitHub repo.
2. **Framework Preset:** Other · **Root Directory:** `./` · leave Build Command empty.
3. **Environment Variables** (see `.env.example`):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase **secret** key |
   | `IP_HASH_SALT` | Any long random text (40+ characters). Keep it secret; **never change it during collection** |
   | `TURNSTILE_SECRET_KEY` | *(optional)* Cloudflare Turnstile secret key — and put the matching **site** key in `public/questions.js` → `STUDY_INFO.turnstileSiteKey` |

4. **Deploy.** Every push to `main` redeploys automatically.

**Testing the live form:** the table is append-only, so test rows cannot be deleted. Test with `?src=test` in the link (e.g. `https://<your-site>.vercel.app/?src=test`) and exclude `src = 'test'` in analysis.

### Cloudflare Turnstile (bot check) — optional but recommended
1. Cloudflare dashboard → **Turnstile → Add widget** → domain = your Vercel domain → mode **Managed**.
2. Copy the **site key** into `public/questions.js` (`STUDY_INFO.turnstileSiteKey`) and push.
3. Add the **secret key** in Vercel as `TURNSTILE_SECRET_KEY` and redeploy.

## 4. Collect data

- Share the tagged Vercel links (WhatsApp, Facebook groups, class groups); a QR code works well in classrooms.
- Watch progress in Supabase **Table Editor → responses**.
- Quick checks:
  ```sql
  select count(*) as responses,
         count(*) filter (where attention_pass) as passed_attention,
         count(distinct respondent_id) as devices,
         count(distinct ip_hash) as networks
  from responses where src is distinct from 'test';
  ```

## 5. Export for SPSS / SmartPLS

Use the view **`responses_spss`** — it already has:
- multi-select answers (USE1, USE5) split into 0/1 columns,
- the authenticity fields and a `withdrawn` flag,
- construct means (`ct_mean`, `sc_mean`, `se_mean`, `gd_mean`, `co_mean`, `al_mean`).

In Supabase: **SQL Editor →** `select * from responses_spss;` **→ Download CSV**. Open the CSV in SPSS and use `CODEBOOK.md` for value labels.

Screening before analysis (see thesis plan): drop rows where `withdrawn = true`, `src = 'test'`, `attention_pass = false`, `duration_sec < 300`, or a whole section has the same answer; check repeated `respondent_id` values (same device) and report how many rows each step removed.

## Changing questions

1. Edit `public/questions.js` (e.g., delete the Section **H** block if Cognitive Offloading is dropped).
2. Bump `FORM_VERSION` if data collection has already started.
3. `npm run generate` → re-run the new `supabase/schema.sql` **only on an empty table** (before collection). After collection has started, add columns with `alter table` instead.
4. `npm test`, then redeploy.

**Do this before going live:** the Bangla text is a first draft — finish the forward–back translation check and the pilot (30–50 students), then lock the questions.
