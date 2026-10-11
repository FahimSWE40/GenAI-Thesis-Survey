# Codebook — GenAI Dependence Survey (form version 2.7)

*Generated from `public/questions.js` by `npm run generate`. Column names are the lower-case item codes.*

## Screening (not stored)

Only participants who answer **Yes** to all three are allowed to continue; nothing is saved for anyone screened out.

| Code | Question |
|---|---|
| A1 | I have read the information above and I agree to take part. |
| A2 | Are you 18 years old or older? |
| A3 | Are you now studying for a bachelor’s (honours) degree at a university or college in Bangladesh? |
| A4 | In the last 6 months, have you used any GenAI tool (like ChatGPT, Gemini or Copilot) for your studies? |

## Metadata columns

| Column | Meaning |
|---|---|
| id | Row number |
| submission_id | Random ID made by the browser (prevents duplicate saves) |
| created_at | When the response was saved (UTC) |
| started_at | When the participant started the form (UTC) |
| duration_sec | Seconds from start to submit — flag responses under ~300 s |
| form_version | Questionnaire version |
| ui_lang | Language view used: en / bn / both |
| attention_pass | true if ATT = 4 (Agree) and ATT2 = 2 (Disagree) |
| respondent_id | Random ID stored in the participant's browser — the same device/browser always sends the same ID (detects repeat submissions) |
| ip_hash | One-way salted SHA-256 code of the internet connection; the IP address is never stored and cannot be recovered |
| device_type | mobile / tablet / desktop / unknown (from the browser's user agent) |
| src | Recruitment source tag from the link, e.g. `?src=diu-cse-whatsapp` |
| receipt_code | Code shown to the participant after submitting; used to request withdrawal |
| bot_check | `passed` = Cloudflare Turnstile verified a human; `not_configured` = check was off |
| withdrawn | (view only) true if the participant withdrew using their receipt code — exclude these rows |

## Section B: About You

| Column | Question | Values |
|---|---|---|
| dem1 | Your age | 1 = 18–20 years; 2 = 21–23 years; 3 = 24–26 years; 4 = 27 years or above |
| dem2 | Your gender | 1 = Male; 2 = Female |
| dem3 | Name of your university or college | Typed answer (2–150 characters) — clean/standardise spelling before analysis |
| dem4 | What type of institution do you study at? | 1 = Public university; 2 = Private university; 3 = College affiliated with a university (e.g., National University) |
| dem5 | Name of your department | Typed answer (2–150 characters) — clean/standardise spelling before analysis |
| dem6 | Which subject group is your department in? | 1 = Computer Science / Software Engineering / IT; 2 = Other Engineering; 3 = Natural Sciences (physics, chemistry, maths, biology, etc.); 4 = Business Studies; 5 = Arts & Humanities; 6 = Social Sciences; 7 = Medicine / Health / Pharmacy; 8 = Agriculture / Fisheries / Veterinary; 9 = Law; 10 = Other |
| dem6_other | "Other" text for DEM6 | Free text (≤ 200 chars) |
| dem7 | Which year of study are you in now? | 1 = 1st year; 2 = 2nd year; 3 = 3rd year; 4 = 4th year or above |
| dem8 | What is your current CGPA (out of 4.00)? | 1 = Below 2.50; 2 = 2.50–2.99; 3 = 3.00–3.49; 4 = 3.50–4.00 |
| dem9 | Which device do you mostly use for studying? | 1 = Smartphone; 2 = Laptop; 3 = Desktop computer; 4 = Tablet |
| dem10 | How is the internet speed you usually use for studying? | 1 = Very poor; 2 = Poor; 3 = Average; 4 = Good; 5 = Very good |

## Section C: Your Use of GenAI

| Column | Question | Values |
|---|---|---|
| use1 | Which GenAI tools do you use for your studies? | Multi-select (text array). In `responses_spss`: use1_chatgpt, use1_gemini, use1_copilot, use1_meta_ai, use1_claude, use1_deepseek, use1_perplexity, use1_github_copilot, use1_grammarly_quillbot, use1_other_selected (0/1) |
| use1_other | "Other" text for USE1 | Free text (≤ 200 chars) |
| use2 | How long have you been using GenAI for your studies? | 1 = Less than 6 months; 2 = 6–12 months; 3 = 1–2 years; 4 = More than 2 years |
| use3 | In a normal week, how often do you use GenAI for your studies? | 1 = Less than once a week; 2 = 1–2 days a week; 3 = 3–5 days a week; 4 = Almost every day; 5 = Several times every day |
| use4 | On a day you use it, how long do you use GenAI for your studies? | 1 = Less than 30 minutes; 2 = 30 minutes to 1 hour; 3 = 1–2 hours; 4 = 2–3 hours; 5 = More than 3 hours |
| use5 | What do you use GenAI for in your studies? | Multi-select (text array). In `responses_spss`: use5_concepts, use5_writing, use5_coding, use5_maths, use5_summarising, use5_exam_prep, use5_ideas, use5_feedback, use5_translation, use5_research_sources, use5_other_selected (0/1) |
| use5_other | "Other" text for USE5 | Free text (≤ 200 chars) |
| use6 | When GenAI gives you an answer for your studies, what do you usually do with it? | 1 = Use it as it is; 2 = Change it a little, then use it; 3 = Use it as a start, then rewrite it in my own words; 4 = Only use it to check or improve my own work |
| use7 | Do you pay for a GenAI tool (for example, ChatGPT Plus)? | 1 = Yes; 2 = No |
| use8 | Have you received any training or guidelines on using AI in your studies from your university or teachers? | 1 = Yes; 2 = No; 3 = Not sure |
| use9 | Apart from studies, how often in the last 6 months did you chat with an AI for company or emotional support? | 1 = Never; 2 = Rarely; 3 = Sometimes; 4 = Often; 5 = Very often |
| use10 | Apart from your studies, what else do you use GenAI for? | Multi-select (text array). In `responses_spss`: use10_info, use10_messages, use10_entertainment, use10_advice, use10_planning, use10_skills, use10_work, use10_company, use10_none, use10_other_selected (0/1) |
| use10_other | "Other" text for USE10 | Free text (≤ 200 chars) |

## Section D: How You Think — Critical Thinking (DV1)

Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| Column | Item | Note |
|---|---|---|
| ct1 | Before I believe some information, I usually check if its source can be trusted. |  |
| ct2 | I look at more than one source to find information for myself. |  |
| ct3 | Before I act, I usually think about what my decision could lead to. |  |
| ct4 | It is important to me that I can explain why I made a choice. |  |
| att | To show you are reading carefully, please choose "Agree" (4) here. | Attention check (correct = 4) |
| ct5 | I often think back on what has happened to me so that I can learn from it. |  |
| ct6 | It is important to me to understand how other people see an issue. |  |
| ct7 | I look for proof before I accept something as true. |  |
| ct8 | I often look back at how I worked something out, to see if I could have done it better. |  |
| ct9 | Before reaching a conclusion, I consider more than one possible explanation. |  |

## Section E: People or AI? — Social Connectivity (DV2)

Scale: 1 = Always an AI chatbot, 2 = Mostly an AI chatbot, 3 = Both equally, 4 = Mostly a person, 5 = Always a person (higher = more human-oriented)

| Column | Item | Note |
|---|---|---|
| sc1 | When I feel lonely and want someone to talk to, I prefer… |  |
| sc2 | When I feel stressed or worried, I prefer to share my thoughts with… |  |
| sc3 | When something good happens in my life, I prefer to share the news with… |  |
| sc4 | When I face a personal problem and need advice, I prefer to ask… |  |
| sc5 | When I want to express my thoughts and feelings openly, I feel more comfortable talking to… |  |
| sc6 | When I want someone to listen to me and understand my feelings, I prefer to talk to… |  |
| sc7 | When I want to have a casual conversation to pass the time, I prefer to chat with… |  |
| sc8 | When I want company during my free time, I prefer to spend time with… |  |
| sc9 | When I need help or assistance with a task, I prefer to seek help from… |  |

## Section F: Your Connections with People — Social Connectivity (DV2): human connectedness

Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| Column | Item | Note |
|---|---|---|
| hc1 | I feel close to the people in my life, such as friends and family. |  |
| hc2 | I regularly talk with my friends or family, in person, by phone or by message. |  |
| hc3 | I feel that I belong among the students at my university. |  |
| hc4 | When I need support, I have people I can turn to. |  |
| hc5 | I feel confident communicating with other people. |  |
| hc6 | I often feel lonely. | Reverse-coded → use hc6_r |

## Section G: Confidence in Yourself — Self-Efficacy (DV3)

Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| Column | Item | Note |
|---|---|---|
| ase1 | I am sure I can learn the skills taught in my courses this semester through my own effort. |  |
| ase2 | If I try, I can finish even hard assignments by myself. |  |
| ase3 | I am confident I can understand even the hardest topics in my courses by myself. |  |
| ase4 | I can do well in exams by preparing on my own. |  |
| gse1 | If I try hard enough, I can always solve difficult problems. |  |
| gse2 | I am confident I can handle unexpected situations well. |  |
| att2 | This is a check question. Please choose "Disagree" (2). | Attention check (correct = 2) |
| gse3 | I can stay calm in hard times because I trust my ability to handle them. |  |
| gse4 | When I have a problem, I can usually think of more than one way to solve it. |  |

## Section H: Depending on GenAI — GenAI Dependence (IV)

Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| Column | Item | Note |
|---|---|---|
| gd1 | I use GenAI before I even try to do a study task myself. |  |
| gd2 | I find it hard to finish my assignments without GenAI. |  |
| gd3 | I feel uncomfortable when I cannot use GenAI for my studies. |  |
| gd4 | I depend on GenAI to decide how to do my study tasks. |  |
| gd5 | I trust GenAI’s answers more than my own first idea. |  |
| gd6 | I end up using GenAI for my studies more than I planned. |  |
| gd7 | If GenAI were no longer available, I would find it hard to keep up with my courses. |  |
| gd8 | I open a GenAI tool out of habit, even for easy study tasks. |  |

## Section I: Letting GenAI Think for You — Cognitive Offloading (mediator)

Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| Column | Item | Note |
|---|---|---|
| co1 | Instead of learning facts myself, I let GenAI remember them for me. |  |
| co2 | Instead of working out the steps of a problem myself, I let GenAI do it. |  |
| co3 | I read GenAI’s summaries instead of reading the full course material. |  |
| co4 | I hand in text or code written by GenAI with only small changes. |  |
| co5 | I let GenAI check my work instead of checking it myself. |  |
| co6 | I let GenAI come up with the arguments or ideas for my work instead of thinking of them myself. |  |

## Section J: What You Know About GenAI — AI Literacy (moderator)

Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| Column | Item | Note |
|---|---|---|
| al1 | I know GenAI can give answers that sound sure but are wrong. |  |
| al2 | I have a basic idea of how GenAI makes its answers. |  |
| al3 | I can write clear instructions (prompts) to get useful answers from GenAI. |  |
| al4 | I can choose which GenAI tool is best for a task. |  |
| al5 | After using a GenAI tool for some time, I can tell what it does well and where it makes mistakes. |  |
| al6 | For important work, I check GenAI’s answers with reliable sources before I use them. |  |
| al7 | I make it clear when part of my work was made with GenAI. |  |
| al8 | I am careful not to share personal or private information with GenAI. |  |
| al9 | I know GenAI answers can be biased or one-sided. |  |

## Construct mean scores (in `responses_spss`)

- **ct_mean** — Critical Thinking (DV1): mean of CT1, CT2, CT3, CT4, CT5, CT6, CT7, CT8, CT9
- **sc_mean** — Social Connectivity (DV2): mean of SC1, SC2, SC3, SC4, SC5, SC6, SC7, SC8, SC9
- **hc_mean** — Social Connectivity (DV2): human connectedness: mean of HC1, HC2, HC3, HC4, HC5, HC6 (reversed)
- **se_mean** — Self-Efficacy (DV3): mean of ASE1, ASE2, ASE3, ASE4, GSE1, GSE2, GSE3, GSE4
- **gd_mean** — GenAI Dependence (IV): mean of GD1, GD2, GD3, GD4, GD5, GD6, GD7, GD8
- **co_mean** — Cognitive Offloading (mediator): mean of CO1, CO2, CO3, CO4, CO5, CO6
- **al_mean** — AI Literacy (moderator): mean of AL1, AL2, AL3, AL4, AL5, AL6, AL7, AL8, AL9

> Use the item-level columns (not the means) as indicators in SmartPLS.
