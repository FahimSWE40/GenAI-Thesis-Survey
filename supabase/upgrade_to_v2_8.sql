-- Upgrade an existing database (created before v2.8) to match schema.sql v2.8.
-- Applied to the live project on 2026-10-12 as migration sync_responses_with_form_v2_8 (0 rows at the time).
-- New installs do not need this: run schema.sql instead.
-- SET NOT NULL fails if any existing row is blank in these columns; check first:
--   select count(*) from public.responses where sc9 is null or use10 is null or ct9 is null or hc1 is null or co6 is null or al9 is null;

alter table public.responses
  alter column sc9 set not null, alter column use10 set not null, alter column ct9 set not null,
  alter column hc1 set not null, alter column hc2 set not null, alter column hc3 set not null, alter column hc4 set not null, alter column hc5 set not null,
  alter column co6 set not null, alter column al9 set not null;
comment on column public.responses.dem1 is 'DEM1: Your age | 1=18–20 years; 2=21–23 years; 3=24–26 years; 4=27 years or above';
comment on column public.responses.dem2 is 'DEM2: Your gender | 1=Male; 2=Female';
comment on column public.responses.dem3 is 'DEM3: Name of your university or college | typed answer';
comment on column public.responses.dem4 is 'DEM4: What type of institution do you study at? | 1=Public university; 2=Private university; 3=College affiliated with a university (e.g., National University)';
comment on column public.responses.dem5 is 'DEM5: Name of your department | typed answer';
comment on column public.responses.dem6 is 'DEM6: Which subject group is your department in? | 1=Computer Science / Software Engineering / IT; 2=Other Engineering; 3=Natural Sciences (physics, chemistry, maths, biology, etc.); 4=Business Studies; 5=Arts & Humanities; 6=Social Sciences; 7=Medicine / Health / Pharmacy; 8=Agriculture / Fisheries / Veterinary; 9=Law; 10=Other';
comment on column public.responses.dem7 is 'DEM7: Which year of study are you in now? | 1=1st year; 2=2nd year; 3=3rd year; 4=4th year or above';
comment on column public.responses.dem8 is 'DEM8: What is your current CGPA (out of 4.00)? | 1=Below 2.50; 2=2.50–2.99; 3=3.00–3.49; 4=3.50–4.00 | OPTIONAL (blank = no answer)';
comment on column public.responses.dem9 is 'DEM9: Which device do you mostly use for studying? | 1=Smartphone; 2=Laptop; 3=Desktop computer; 4=Tablet';
comment on column public.responses.dem10 is 'DEM10: How is the internet speed you usually use for studying? | 1=Very poor; 2=Poor; 3=Average; 4=Good; 5=Very good';
comment on column public.responses.use1 is 'USE1: Which GenAI tools do you use for your studies? | multi-select: chatgpt, gemini, copilot, meta_ai, claude, deepseek, perplexity, github_copilot, grammarly_quillbot, other';
comment on column public.responses.use2 is 'USE2: How long have you been using GenAI for your studies? | 1=Less than 6 months; 2=6–12 months; 3=1–2 years; 4=More than 2 years';
comment on column public.responses.use3 is 'USE3: In a normal week, how often do you use GenAI for your studies? | 1=Less than once a week; 2=1–2 days a week; 3=3–5 days a week; 4=Almost every day; 5=Several times every day';
comment on column public.responses.use4 is 'USE4: On a day you use it, how long do you use GenAI for your studies? | 1=Less than 30 minutes; 2=30 minutes to 1 hour; 3=1–2 hours; 4=2–3 hours; 5=More than 3 hours';
comment on column public.responses.use5 is 'USE5: What do you use GenAI for in your studies? | multi-select: concepts, writing, coding, maths, summarising, exam_prep, ideas, feedback, translation, research_sources, other';
comment on column public.responses.use6 is 'USE6: When GenAI gives you an answer for your studies, what do you usually do with it? | 1=Use it as it is; 2=Change it a little, then use it; 3=Use it as a start, then rewrite it in my own words; 4=Only use it to check or improve my own work';
comment on column public.responses.use8 is 'USE8: Have you received any training or guidelines on using AI in your studies from your university or teachers? | 1=Yes; 2=No; 3=Not sure';
comment on column public.responses.use9 is 'USE9: Apart from studies, how often in the last 6 months did you chat with an AI for company or emotional support? | 1=Never; 2=Rarely; 3=Sometimes; 4=Often; 5=Very often';
comment on column public.responses.use10 is 'USE10: Apart from your studies, what else do you use GenAI for? | multi-select: info, messages, entertainment, advice, planning, skills, work, none, other';
comment on column public.responses.ct1 is 'CT1: Before I believe some information, I usually check if its source can be trusted.';
comment on column public.responses.ct2 is 'CT2: I look at more than one source to find information for myself.';
comment on column public.responses.ct3 is 'CT3: Before I act, I usually think about what my decision could lead to.';
comment on column public.responses.ct4 is 'CT4: It is important to me that I can explain why I made a choice.';
comment on column public.responses.att is 'ATT: To show you are reading carefully, please choose "Agree" (4) here. [ATTENTION CHECK: correct = 4]';
comment on column public.responses.ct5 is 'CT5: I often think back on what has happened to me so that I can learn from it.';
comment on column public.responses.ct6 is 'CT6: It is important to me to understand how other people see an issue.';
comment on column public.responses.ct8 is 'CT8: I often look back at how I worked something out, to see if I could have done it better.';
comment on column public.responses.ct9 is 'CT9: Before reaching a conclusion, I consider more than one possible explanation.';
comment on column public.responses.sc1 is 'SC1: When I feel lonely and want someone to talk to, I prefer… [OPTIONAL: blank = skipped]';
comment on column public.responses.sc2 is 'SC2: When I feel stressed or worried, I prefer to share my thoughts with… [OPTIONAL: blank = skipped]';
comment on column public.responses.sc3 is 'SC3: When something good happens in my life, I prefer to share the news with…';
comment on column public.responses.sc4 is 'SC4: When I face a personal problem and need advice, I prefer to ask…';
comment on column public.responses.sc5 is 'SC5: When I want to express my thoughts and feelings openly, I feel more comfortable talking to… [OPTIONAL: blank = skipped]';
comment on column public.responses.sc6 is 'SC6: When I want someone to listen to me and understand my feelings, I prefer to talk to… [OPTIONAL: blank = skipped]';
comment on column public.responses.sc7 is 'SC7: When I want to have a casual conversation to pass the time, I prefer to chat with…';
comment on column public.responses.sc8 is 'SC8: When I want company during my free time, I prefer to spend time with…';
comment on column public.responses.sc9 is 'SC9: When I need help or assistance with a task, I prefer to seek help from…';
comment on column public.responses.hc1 is 'HC1: I feel close to the people in my life, such as friends and family.';
comment on column public.responses.hc2 is 'HC2: I regularly talk with my friends or family, in person, by phone or by message.';
comment on column public.responses.hc3 is 'HC3: I feel that I belong among the students at my university.';
comment on column public.responses.hc4 is 'HC4: When I need support, I have people I can turn to.';
comment on column public.responses.hc5 is 'HC5: I feel confident communicating with other people.';
comment on column public.responses.hc6 is 'HC6: I often feel lonely. [REVERSE-CODED] [OPTIONAL: blank = skipped]';
comment on column public.responses.ase1 is 'ASE1: I am sure I can learn the skills taught in my courses this semester through my own effort.';
comment on column public.responses.ase2 is 'ASE2: If I try, I can finish even hard assignments by myself.';
comment on column public.responses.ase3 is 'ASE3: I am confident I can understand even the hardest topics in my courses by myself.';
comment on column public.responses.ase4 is 'ASE4: I can do well in exams by preparing on my own.';
comment on column public.responses.gse1 is 'GSE1: If I try hard enough, I can always solve difficult problems.';
comment on column public.responses.gse2 is 'GSE2: I am confident I can handle unexpected situations well.';
comment on column public.responses.att2 is 'ATT2: This is a check question. Please choose "Disagree" (2). [ATTENTION CHECK: correct = 2]';
comment on column public.responses.gse3 is 'GSE3: I can stay calm in hard times because I trust my ability to handle them.';
comment on column public.responses.gse4 is 'GSE4: When I have a problem, I can usually think of more than one way to solve it.';
comment on column public.responses.gd1 is 'GD1: I use GenAI before I even try to do a study task myself.';
comment on column public.responses.gd2 is 'GD2: I find it hard to finish my assignments without GenAI.';
comment on column public.responses.gd3 is 'GD3: I feel uncomfortable when I cannot use GenAI for my studies.';
comment on column public.responses.gd4 is 'GD4: I depend on GenAI to decide how to do my study tasks.';
comment on column public.responses.gd5 is 'GD5: I trust GenAI’s answers more than my own first idea.';
comment on column public.responses.gd6 is 'GD6: I end up using GenAI for my studies more than I planned.';
comment on column public.responses.gd8 is 'GD8: I open a GenAI tool out of habit, even for easy study tasks.';
comment on column public.responses.co1 is 'CO1: Instead of learning facts myself, I let GenAI remember them for me.';
comment on column public.responses.co2 is 'CO2: Instead of working out the steps of a problem myself, I let GenAI do it.';
comment on column public.responses.co3 is 'CO3: I read GenAI’s summaries instead of reading the full course material.';
comment on column public.responses.co4 is 'CO4: I hand in text or code written by GenAI with only small changes.';
comment on column public.responses.co5 is 'CO5: I let GenAI check my work instead of checking it myself.';
comment on column public.responses.co6 is 'CO6: I let GenAI come up with the arguments or ideas for my work instead of thinking of them myself.';
comment on column public.responses.al1 is 'AL1: I know GenAI can give answers that sound sure but are wrong.';
comment on column public.responses.al2 is 'AL2: I have a basic idea of how GenAI makes its answers.';
comment on column public.responses.al3 is 'AL3: I can write clear instructions (prompts) to get useful answers from GenAI.';
comment on column public.responses.al4 is 'AL4: I can choose which GenAI tool is best for a task.';
comment on column public.responses.al5 is 'AL5: After using a GenAI tool for some time, I can tell what it does well and where it makes mistakes.';
comment on column public.responses.al6 is 'AL6: For important work, I check GenAI’s answers with reliable sources before I use them.';
comment on column public.responses.al7 is 'AL7: I make it clear when part of my work was made with GenAI.';
comment on column public.responses.al8 is 'AL8: I am careful not to share personal or private information with GenAI.';
comment on column public.responses.al9 is 'AL9: I know GenAI answers can be biased or one-sided.';

notify pgrst, 'reload schema';
