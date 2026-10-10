// Single source of truth for the questionnaire.
// Used by the browser form (app.js), the API validator (api/submit.js),
// and the generators that write supabase/schema.sql, CODEBOOK.md and the
// questionnaire documents in ../outputs.
//
// Version 2.4 — plain-language rewrite of every question, title and introduction (EN + BN).
// Version 2.3 — Social Connectivity redefined as preference for people vs. AI
// companions (bipolar scale, SC1–SC8); USE9 AI-companion use added.
// Version 2.2 — "Your Use of GenAI" moved to Section C (after About You).
// Version 2.1 — "About You" moved to Section B; university and department
// names added as typed answers; gender Male/Female only; division and home
// area removed; Bangla text revised throughout.
// Question types: 'single' (choose one), 'multi' (choose any), 'text' (typed answer).

export const FORM_VERSION = '2.4';

const YES_NO = [
  { v: 1, en: 'Yes', bn: 'হ্যাঁ' },
  { v: 2, en: 'No', bn: 'না' },
];

export const LIKERT_LABELS = [
  { v: 1, en: 'Strongly Disagree', bn: 'একদমই একমত নই' },
  { v: 2, en: 'Disagree', bn: 'একমত নই' },
  { v: 3, en: 'Neutral', bn: 'নিরপেক্ষ' },
  { v: 4, en: 'Agree', bn: 'একমত' },
  { v: 5, en: 'Strongly Agree', bn: 'সম্পূর্ণ একমত' },
];

export const TEXT_PLACEHOLDER = { en: 'Type here', bn: 'এখানে লিখুন' };

// Fill these in before going live (npm test warns while they are empty).
// They are shown under the consent text.
export const STUDY_INFO = {
  contactEmail: '',   // researcher contact, e.g. 'your.name@diu.edu.bd'
  ethicsRef: '',      // ethics approval reference from the department / university committee
  // Cloudflare Turnstile SITE key (public). Leave empty to switch the bot check off.
  // The matching SECRET key goes only in Vercel as TURNSTILE_SECRET_KEY.
  turnstileSiteKey: '',
};

export const CONSENT_TEXT = {
  en: 'This survey is part of a university research study. It asks how students use GenAI tools like ChatGPT, Gemini and Copilot, and how this relates to their thinking, relationships and confidence. It takes about 12–15 minutes. Taking part is your choice, and you can stop at any time. We do not ask for your name, student ID or email, and results are only reported for the whole group. To check that responses are genuine, we record your device type and a scrambled code of your internet connection (your IP address is not stored). After submitting, you will get a response code that you can use to withdraw your answers. There are no right or wrong answers — please answer honestly.',
  bn: 'এই জরিপটি একটি বিশ্ববিদ্যালয় গবেষণার অংশ। এখানে জানতে চাওয়া হচ্ছে, শিক্ষার্থীরা ChatGPT, Gemini, Copilot-এর মতো GenAI টুল কীভাবে ব্যবহার করেন এবং এর সঙ্গে তাঁদের চিন্তা, সম্পর্ক ও আত্মবিশ্বাসের কী সম্পর্ক। এতে প্রায় ১২–১৫ মিনিট লাগবে। অংশ নেওয়া আপনার ইচ্ছা, এবং যেকোনো সময় থেমে যেতে পারেন। আপনার নাম, স্টুডেন্ট আইডি বা ইমেইল চাওয়া হবে না, আর ফলাফল শুধু পুরো দলের জন্য প্রকাশ করা হবে। উত্তরগুলো আসল কি না যাচাই করতে আমরা আপনার ডিভাইসের ধরন এবং ইন্টারনেট সংযোগের একটি এনক্রিপ্ট করা কোড সংরক্ষণ করি (আপনার আইপি ঠিকানা সংরক্ষণ করা হয় না)। জমা দেওয়ার পর আপনি একটি কোড পাবেন, যা দিয়ে পরে উত্তর প্রত্যাহার করতে পারবেন। এখানে কোনো সঠিক বা ভুল উত্তর নেই — অনুগ্রহ করে সৎভাবে উত্তর দিন।',
};

// Screening questions. Any answer other than v=1 ends the survey; nothing is saved.
export const SCREENING = [
  {
    id: 'A1', type: 'single',
    en: 'I have read the information above and I agree to take part.',
    bn: 'আমি ওপরের তথ্য পড়েছি এবং অংশ নিতে রাজি।',
    options: [
      { v: 1, en: 'Yes, I agree', bn: 'হ্যাঁ, আমি সম্মত' },
      { v: 2, en: 'No, I do not agree', bn: 'না, আমি সম্মত নই' },
    ],
  },
  {
    id: 'A2', type: 'single',
    en: 'Are you 18 years old or older?',
    bn: 'আপনার বয়স কি ১৮ বছর বা তার বেশি?',
    options: YES_NO,
  },
  {
    id: 'A3', type: 'single',
    en: 'Are you now studying for a bachelor’s (honours) degree at a university or college in Bangladesh?',
    bn: 'আপনি কি এখন বাংলাদেশের কোনো বিশ্ববিদ্যালয় বা কলেজে স্নাতক (অনার্স / ব্যাচেলর) পড়ছেন?',
    help: { en: 'Master’s, MPhil and PhD students are not included in this study.', bn: 'মাস্টার্স, এমফিল ও পিএইচডি পর্যায়ের শিক্ষার্থীরা এই গবেষণার অন্তর্ভুক্ত নন।' },
    options: YES_NO,
  },
  {
    id: 'A4', type: 'single',
    en: 'In the last 6 months, have you used any GenAI tool (like ChatGPT, Gemini or Copilot) for your studies?',
    bn: 'গত ৬ মাসে আপনি কি পড়াশোনার জন্য কোনো GenAI টুল (যেমন ChatGPT, Gemini বা Copilot) ব্যবহার করেছেন?',
    help: { en: 'GenAI tools are AI chatbots or assistants that create text, code or images when you type a request.', bn: 'GenAI টুল হলো এমন এআই চ্যাটবট বা সহকারী, যেখানে কোনো অনুরোধ লিখলে সেটি লেখা, কোড বা ছবি তৈরি করে দেয়।' },
    options: YES_NO,
  },
];

// Saved sections, in display order.
export const SECTIONS = [
  {
    id: 'B', kind: 'choice',
    en: 'About You', bn: 'আপনার সম্পর্কে',
    hint: {
      en: 'A few short questions about you and your studies. They are only used to describe the whole group.',
      bn: 'আপনার ও আপনার পড়াশোনা সম্পর্কে কয়েকটি ছোট প্রশ্ন। এগুলো শুধু পুরো দলের চিত্র বোঝাতে ব্যবহার হবে।',
    },
    questions: [
      { id: 'DEM1', type: 'single', en: 'Your age', bn: 'আপনার বয়স', options: [
        { v: 1, en: '18–20 years', bn: '১৮–২০ বছর' },
        { v: 2, en: '21–23 years', bn: '২১–২৩ বছর' },
        { v: 3, en: '24–26 years', bn: '২৪–২৬ বছর' },
        { v: 4, en: '27 years or above', bn: '২৭ বছর বা তার বেশি' } ] },
      { id: 'DEM2', type: 'single', en: 'Your gender', bn: 'আপনার লিঙ্গ', options: [
        { v: 1, en: 'Male', bn: 'পুরুষ' },
        { v: 2, en: 'Female', bn: 'নারী' } ] },
      { id: 'DEM3', type: 'text', maxLength: 150, en: 'Name of your university or college', bn: 'আপনার বিশ্ববিদ্যালয় বা কলেজের নাম',
        help: { en: 'For example: Daffodil International University', bn: 'যেমন: ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটি' } },
      { id: 'DEM4', type: 'single', en: 'What type of institution do you study at?', bn: 'আপনি কোন ধরনের প্রতিষ্ঠানে পড়েন?', options: [
        { v: 1, en: 'Public university', bn: 'পাবলিক বিশ্ববিদ্যালয়' },
        { v: 2, en: 'Private university', bn: 'প্রাইভেট বিশ্ববিদ্যালয়' },
        { v: 3, en: 'College under National University', bn: 'জাতীয় বিশ্ববিদ্যালয়ের অধীন কলেজ' } ] },
      { id: 'DEM5', type: 'text', maxLength: 150, en: 'Name of your department', bn: 'আপনার বিভাগের নাম',
        help: { en: 'For example: Software Engineering', bn: 'যেমন: সফটওয়্যার ইঞ্জিনিয়ারিং' } },
      { id: 'DEM6', type: 'single', en: 'Which subject group is your department in?', bn: 'আপনার বিভাগ কোন বিষয়-শাখার মধ্যে পড়ে?',
        help: { en: 'Choose the group your department belongs to.', bn: 'আপনার বিভাগ যে শাখার অন্তর্ভুক্ত, সেটি বেছে নিন।' }, options: [
        { v: 1, en: 'Computer Science / Software Engineering / IT', bn: 'কম্পিউটার সায়েন্স / সফটওয়্যার ইঞ্জিনিয়ারিং / আইটি' },
        { v: 2, en: 'Other Engineering', bn: 'অন্যান্য প্রকৌশল' },
        { v: 3, en: 'Natural Sciences (physics, chemistry, maths, biology, etc.)', bn: 'বিজ্ঞান (পদার্থবিজ্ঞান, রসায়ন, গণিত, জীববিজ্ঞান ইত্যাদি)' },
        { v: 4, en: 'Business Studies', bn: 'ব্যবসায় শিক্ষা' },
        { v: 5, en: 'Arts & Humanities', bn: 'কলা ও মানবিক' },
        { v: 6, en: 'Social Sciences', bn: 'সামাজিক বিজ্ঞান' },
        { v: 7, en: 'Medicine / Health / Pharmacy', bn: 'চিকিৎসা / স্বাস্থ্য / ফার্মেসি' },
        { v: 8, en: 'Agriculture / Fisheries / Veterinary', bn: 'কৃষি / মৎস্য / ভেটেরিনারি' },
        { v: 9, en: 'Law', bn: 'আইন' },
        { v: 10, en: 'Other', bn: 'অন্যান্য', other: true } ] },
      { id: 'DEM7', type: 'single', en: 'Which year of study are you in now?', bn: 'আপনি এখন কোন বর্ষে পড়ছেন?',
        help: { en: 'If your programme uses semesters or trimesters, choose the matching year (e.g., semester 3–4 = 2nd year).', bn: 'আপনার প্রোগ্রাম সেমিস্টার বা ট্রাইমেস্টারভিত্তিক হলে মিলিয়ে বর্ষ বেছে নিন (যেমন: ৩য়–৪র্থ সেমিস্টার = ২য় বর্ষ)।' }, options: [
        { v: 1, en: '1st year', bn: '১ম বর্ষ' },
        { v: 2, en: '2nd year', bn: '২য় বর্ষ' },
        { v: 3, en: '3rd year', bn: '৩য় বর্ষ' },
        { v: 4, en: '4th year or above', bn: '৪র্থ বর্ষ বা তার বেশি' } ] },
      { id: 'DEM8', type: 'single', optional: true, en: 'What is your current CGPA (out of 4.00)?', bn: 'আপনার বর্তমান সিজিপিএ কত (৪.০০-এর মধ্যে)?',
        help: { en: 'Optional — leave this blank if you do not have a CGPA yet.', bn: 'ঐচ্ছিক — এখনো সিজিপিএ না থাকলে এটি ফাঁকা রাখুন।' }, options: [
        { v: 1, en: 'Below 2.50', bn: '২.৫০-এর কম' },
        { v: 2, en: '2.50 – 2.99', bn: '২.৫০ – ২.৯৯' },
        { v: 3, en: '3.00 – 3.49', bn: '৩.০০ – ৩.৪৯' },
        { v: 4, en: '3.50 – 4.00', bn: '৩.৫০ – ৪.০০' } ] },
      { id: 'DEM9', type: 'single', en: 'Which device do you mostly use for studying?', bn: 'পড়াশোনার জন্য আপনি বেশিরভাগ সময় কোন ডিভাইস ব্যবহার করেন?', options: [
        { v: 1, en: 'Smartphone', bn: 'স্মার্টফোন' },
        { v: 2, en: 'Laptop', bn: 'ল্যাপটপ' },
        { v: 3, en: 'Desktop computer', bn: 'ডেস্কটপ কম্পিউটার' },
        { v: 4, en: 'Tablet', bn: 'ট্যাবলেট' } ] },
      { id: 'DEM10', type: 'single', en: 'How good is your internet for studying?', bn: 'পড়াশোনার জন্য আপনার ইন্টারনেট কেমন?', options: [
        { v: 1, en: 'Very poor', bn: 'খুব খারাপ' },
        { v: 2, en: 'Poor', bn: 'খারাপ' },
        { v: 3, en: 'Average', bn: 'মোটামুটি' },
        { v: 4, en: 'Good', bn: 'ভালো' },
        { v: 5, en: 'Very good', bn: 'খুব ভালো' } ] },
    ],
  },
  {
    id: 'C', kind: 'choice',
    en: 'Your Use of GenAI', bn: 'আপনার GenAI ব্যবহার',
    hint: {
      en: 'In this survey, "GenAI tools" means AI chatbots that write text, code or images for you — like ChatGPT, Gemini, Copilot, Claude, DeepSeek, Perplexity or Meta AI. "Studies" means any study work: assignments, lab reports, coding, projects, presentations, thesis, class preparation and exam preparation. Think about the last 6 months.',
      bn: 'এই জরিপে "GenAI টুল" মানে এমন এআই চ্যাটবট, যা আপনার জন্য লেখা, কোড বা ছবি তৈরি করে — যেমন ChatGPT, Gemini, Copilot, Claude, DeepSeek, Perplexity বা Meta AI। "পড়াশোনা" মানে পড়াশোনার যেকোনো কাজ: অ্যাসাইনমেন্ট, ল্যাব রিপোর্ট, কোডিং, প্রজেক্ট, প্রেজেন্টেশন, থিসিস, ক্লাস ও পরীক্ষার প্রস্তুতি। গত ৬ মাসের কথা ভেবে উত্তর দিন।',
    },
    questions: [
      { id: 'USE1', type: 'multi', en: 'Which GenAI tools do you use for your studies?', bn: 'পড়াশোনায় আপনি কোন কোন GenAI টুল ব্যবহার করেন?', options: [
        { v: 'chatgpt', en: 'ChatGPT', bn: 'ChatGPT' },
        { v: 'gemini', en: 'Google Gemini', bn: 'Google Gemini' },
        { v: 'copilot', en: 'Microsoft Copilot', bn: 'Microsoft Copilot' },
        { v: 'meta_ai', en: 'Meta AI (WhatsApp / Messenger)', bn: 'Meta AI (WhatsApp / Messenger)' },
        { v: 'claude', en: 'Claude', bn: 'Claude' },
        { v: 'deepseek', en: 'DeepSeek', bn: 'DeepSeek' },
        { v: 'perplexity', en: 'Perplexity', bn: 'Perplexity' },
        { v: 'github_copilot', en: 'GitHub Copilot', bn: 'GitHub Copilot' },
        { v: 'grammarly_quillbot', en: 'Grammarly AI / QuillBot', bn: 'Grammarly AI / QuillBot' },
        { v: 'other', en: 'Other', bn: 'অন্যান্য', other: true } ] },
      { id: 'USE2', type: 'single', en: 'How long have you been using GenAI for your studies?', bn: 'কত দিন ধরে আপনি পড়াশোনায় GenAI ব্যবহার করছেন?', options: [
        { v: 1, en: 'Less than 6 months', bn: '৬ মাসের কম' },
        { v: 2, en: '6–12 months', bn: '৬–১২ মাস' },
        { v: 3, en: '1–2 years', bn: '১–২ বছর' },
        { v: 4, en: 'More than 2 years', bn: '২ বছরের বেশি' } ] },
      { id: 'USE3', type: 'single', en: 'In a normal week, how often do you use GenAI for your studies?', bn: 'সাধারণ এক সপ্তাহে আপনি কত ঘন ঘন পড়াশোনায় GenAI ব্যবহার করেন?', options: [
        { v: 1, en: 'Less than once a week', bn: 'সপ্তাহে এক দিনেরও কম' },
        { v: 2, en: '1–2 days a week', bn: 'সপ্তাহে ১–২ দিন' },
        { v: 3, en: '3–5 days a week', bn: 'সপ্তাহে ৩–৫ দিন' },
        { v: 4, en: 'Almost every day', bn: 'প্রায় প্রতিদিন' },
        { v: 5, en: 'Several times every day', bn: 'প্রতিদিন কয়েকবার' } ] },
      { id: 'USE4', type: 'single', en: 'On a day you use it, how long do you use GenAI for your studies?', bn: 'যেদিন ব্যবহার করেন, সেদিন পড়াশোনায় কতক্ষণ GenAI ব্যবহার করেন?', options: [
        { v: 1, en: 'Less than 30 minutes', bn: '৩০ মিনিটের কম' },
        { v: 2, en: '30 minutes – 1 hour', bn: '৩০ মিনিট – ১ ঘণ্টা' },
        { v: 3, en: '1–2 hours', bn: '১–২ ঘণ্টা' },
        { v: 4, en: '2–3 hours', bn: '২–৩ ঘণ্টা' },
        { v: 5, en: 'More than 3 hours', bn: '৩ ঘণ্টার বেশি' } ] },
      { id: 'USE5', type: 'multi', en: 'What do you use GenAI for in your studies?', bn: 'পড়াশোনার কোন কোন কাজে আপনি GenAI ব্যবহার করেন?', options: [
        { v: 'concepts', en: 'Understanding a topic or concept', bn: 'কোনো বিষয় বা ধারণা বোঝা' },
        { v: 'writing', en: 'Writing or editing assignments', bn: 'অ্যাসাইনমেন্ট লেখা বা সম্পাদনা' },
        { v: 'coding', en: 'Coding / programming', bn: 'কোডিং / প্রোগ্রামিং' },
        { v: 'maths', en: 'Solving maths or problem sets', bn: 'গণিত বা সমস্যা সমাধান' },
        { v: 'summarising', en: 'Summarising readings or lectures', bn: 'পাঠ্য বা লেকচারের সারসংক্ষেপ তৈরি' },
        { v: 'exam_prep', en: 'Exam preparation', bn: 'পরীক্ষার প্রস্তুতি' },
        { v: 'ideas', en: 'Getting ideas', bn: 'নতুন আইডিয়া খোঁজা' },
        { v: 'feedback', en: 'Getting feedback on my own work', bn: 'নিজের কাজের ওপর মতামত নেওয়া' },
        { v: 'translation', en: 'Translation', bn: 'অনুবাদ' },
        { v: 'research_sources', en: 'Finding research sources', bn: 'গবেষণার তথ্যসূত্র খোঁজা' },
        { v: 'other', en: 'Other', bn: 'অন্যান্য', other: true } ] },
      { id: 'USE6', type: 'single', en: 'When GenAI gives you an answer for your studies, what do you usually do with it?', bn: 'পড়াশোনার কাজে GenAI কোনো উত্তর দিলে, আপনি সাধারণত সেটি দিয়ে কী করেন?',
        help: { en: 'Choose the one you do most often.', bn: 'যেটি আপনি সবচেয়ে বেশি করেন, সেটি বেছে নিন।' }, options: [
        { v: 1, en: 'Use it as it is', bn: 'যেমন আছে, তেমনই ব্যবহার করি' },
        { v: 2, en: 'Change it a little, then use it', bn: 'একটু বদলে ব্যবহার করি' },
        { v: 3, en: 'Use it as a start, then rewrite it in my own words', bn: 'শুরু হিসেবে নিই, তারপর নিজের ভাষায় নতুন করে লিখি' },
        { v: 4, en: 'Only use it to check or improve my own work', bn: 'শুধু নিজের কাজ যাচাই বা আরও ভালো করতে ব্যবহার করি' } ] },
      { id: 'USE7', type: 'single', en: 'Do you pay for a GenAI tool (for example, ChatGPT Plus)?', bn: 'আপনি কি কোনো GenAI টুলের জন্য টাকা দেন (যেমন ChatGPT Plus)?', options: YES_NO },
      { id: 'USE8', type: 'single', en: 'Has your university or a teacher taught you, or given you rules, about using AI in your studies?', bn: 'আপনার বিশ্ববিদ্যালয় বা কোনো শিক্ষক কি পড়াশোনায় এআই ব্যবহার নিয়ে কিছু শিখিয়েছেন বা নিয়ম দিয়েছেন?', options: [
        { v: 1, en: 'Yes', bn: 'হ্যাঁ' },
        { v: 2, en: 'No', bn: 'না' },
        { v: 3, en: 'Not sure', bn: 'নিশ্চিত নই' } ] },
      { id: 'USE9', type: 'single', en: 'Apart from studies, how often in the last 6 months did you chat with an AI for company or emotional support?', bn: 'পড়াশোনার বাইরে, গত ৬ মাসে আপনি সঙ্গ বা মানসিক সহায়তার জন্য কত ঘন ঘন কোনো এআই-এর সঙ্গে কথা বলেছেন?',
        help: { en: 'For example, talking about your day, your feelings or personal problems.', bn: 'যেমন: নিজের দিন, অনুভূতি বা ব্যক্তিগত সমস্যা নিয়ে কথা বলা।' }, options: [
        { v: 1, en: 'Never', bn: 'কখনো না' },
        { v: 2, en: 'Rarely', bn: 'কদাচিৎ' },
        { v: 3, en: 'Sometimes', bn: 'মাঝে মাঝে' },
        { v: 4, en: 'Often', bn: 'প্রায়ই' },
        { v: 5, en: 'Very often', bn: 'খুব প্রায়ই' } ] },
    ],
  },
  {
    id: 'D', kind: 'likert', short: 'ct', construct: 'Critical Thinking (DV1)',
    en: 'How You Think', bn: 'আপনি কীভাবে ভাবেন',
    hint: {
      en: 'These sentences are about how you usually think and make decisions — in daily life and in your studies. They are not about AI. Choose how much you agree with each one.',
      bn: 'এই বাক্যগুলো দৈনন্দিন জীবনে ও পড়াশোনায় আপনি সাধারণত কীভাবে ভাবেন ও সিদ্ধান্ত নেন, সে সম্পর্কে। এগুলো এআই নিয়ে নয়। প্রতিটি বাক্যের সঙ্গে আপনি কতটা একমত, তা বেছে নিন।',
    },
    items: [
      { id: 'CT1', en: 'Before I believe some information, I usually check if its source can be trusted.', bn: 'কোনো তথ্য বিশ্বাস করার আগে আমি সাধারণত দেখি, তথ্যের উৎসটি নির্ভরযোগ্য কি না।',
        help: { en: 'For example, a website, a social-media post, a book, or something a person tells you.', bn: 'যেমন: কোনো ওয়েবসাইট, সোশ্যাল মিডিয়ার পোস্ট, বই, বা কারও মুখে শোনা কথা।' } },
      { id: 'CT2', en: 'I look at more than one source to find information for myself.', bn: 'নিজে কোনো তথ্য জানতে আমি একাধিক উৎস দেখি।' },
      { id: 'CT3', en: 'Before I act, I usually think about what my decision could lead to.', bn: 'কোনো কাজ করার আগে আমি সাধারণত ভাবি, আমার সিদ্ধান্তের ফল কী হতে পারে।' },
      { id: 'CT4', en: 'It is important to me that I can explain why I made a choice.', bn: 'কেন একটি সিদ্ধান্ত নিলাম, তা ব্যাখ্যা করতে পারা আমার কাছে গুরুত্বপূর্ণ।' },
      { id: 'ATT', attention: 4, en: 'To show you are reading carefully, please choose "Agree" (4) here.', bn: 'আপনি মনোযোগ দিয়ে পড়ছেন কি না দেখতে, এখানে "একমত" (৪) বেছে নিন।' },
      { id: 'CT5', en: 'I often think back on what has happened to me so that I can learn from it.', bn: 'যা ঘটেছে তা থেকে শেখার জন্য আমি প্রায়ই সেগুলো নিয়ে আবার ভাবি।' },
      { id: 'CT6', en: 'It is important to me to understand how other people see an issue.', bn: 'কোনো বিষয়ে অন্যরা কীভাবে ভাবে, তা বোঝা আমার কাছে গুরুত্বপূর্ণ।' },
      { id: 'CT7', en: 'I look for proof before I accept something as true.', bn: 'কোনো কিছু সত্য বলে মেনে নেওয়ার আগে আমি প্রমাণ খুঁজি।' },
      { id: 'CT8', en: 'I often look back at how I worked something out, to see if I could have done it better.', bn: 'কোনো কিছু কীভাবে ভেবে বের করেছি, তা আমি প্রায়ই আবার দেখি — আরও ভালোভাবে করা যেত কি না।' },
    ],
  },
  {
    // Social Connectivity = preference for connecting with people vs. AI companions.
    // Bipolar scale: 1 = always an AI chatbot … 5 = always a person (higher = more human-oriented).
    id: 'E', kind: 'likert', short: 'sc', construct: 'Social Connectivity (DV2)',
    en: 'People or AI?', bn: 'মানুষ নাকি এআই?',
    hint: {
      en: 'For each situation, choose who you would rather turn to: a person (a friend, family member, classmate, senior or teacher) or an AI chatbot (like ChatGPT, Meta AI, Snapchat My AI, Character.AI or Replika). Even if you have never talked to an AI this way, answer with what you would prefer.',
      bn: 'প্রতিটি পরিস্থিতিতে আপনি কার কাছে যেতে চান, তা বেছে নিন: একজন মানুষ (বন্ধু, পরিবারের কেউ, সহপাঠী, সিনিয়র বা শিক্ষক) নাকি একটি এআই চ্যাটবট (যেমন ChatGPT, Meta AI, Snapchat My AI, Character.AI বা Replika)। আগে কখনো এআই-এর সঙ্গে এভাবে কথা না বললেও, আপনি যা পছন্দ করতেন সেটিই বেছে নিন।',
    },
    scale: [
      { v: 1, en: 'Always an AI chatbot', bn: 'সবসময় এআই চ্যাটবট' },
      { v: 2, en: 'Mostly AI', bn: 'বেশিরভাগ সময় এআই' },
      { v: 3, en: 'Both equally', bn: 'দুটোই সমান' },
      { v: 4, en: 'Mostly a person', bn: 'বেশিরভাগ সময় মানুষ' },
      { v: 5, en: 'Always a person', bn: 'সবসময় মানুষ' },
    ],
    items: [
      { id: 'SC1', en: 'When I feel lonely, I would rather talk to…', bn: 'একা লাগলে আমি কথা বলতে চাই…' },
      { id: 'SC2', en: 'When I am stressed or worried, I would rather open up to…', bn: 'চাপে বা দুশ্চিন্তায় থাকলে আমি মনের কথা বলতে চাই…' },
      { id: 'SC3', en: 'When I have good news, I would rather share it with…', bn: 'ভালো খবর থাকলে আমি তা জানাতে চাই…' },
      { id: 'SC4', en: 'When I need advice about a personal problem, I would rather ask…', bn: 'ব্যক্তিগত সমস্যায় পরামর্শ লাগলে আমি জিজ্ঞেস করতে চাই…' },
      { id: 'SC5', en: 'When I want to talk about my feelings, I feel more comfortable with…', bn: 'নিজের অনুভূতির কথা বলতে আমি বেশি স্বচ্ছন্দ বোধ করি…' },
      { id: 'SC6', en: 'When I want someone who truly understands me, I go to…', bn: 'যখন এমন কাউকে চাই যে আমাকে সত্যিই বোঝে, তখন আমি যাই…' },
      { id: 'SC7', en: 'When I want a light chat to pass the time, I would rather chat with…', bn: 'সময় কাটাতে হালকা গল্প করতে চাইলে আমি কথা বলতে চাই…' },
      { id: 'SC8', en: 'When I want company in my free time, I would rather turn to…', bn: 'অবসরে সঙ্গ চাইলে আমি যাই…' },
    ],
  },
  {
    id: 'F', kind: 'likert', short: 'se', construct: 'Self-Efficacy (DV3)',
    en: 'Confidence in Yourself', bn: 'নিজের ওপর আস্থা',
    hint: {
      en: 'These sentences are about how sure you feel about your own abilities — when you work by yourself, without help from people or tools.',
      bn: 'এই বাক্যগুলো নিজের সক্ষমতার ওপর আপনার আস্থা নিয়ে — যখন আপনি কারও বা কোনো টুলের সাহায্য ছাড়া নিজে কাজ করেন।',
    },
    items: [
      { id: 'ASE1', en: 'I am sure I can learn the skills taught in my courses this semester through my own effort.', bn: 'আমি নিশ্চিত, এই সেমিস্টারে কোর্সে শেখানো দক্ষতাগুলো আমি নিজের চেষ্টায় শিখতে পারব।' },
      { id: 'ASE2', en: 'If I try, I can finish even hard assignments by myself.', bn: 'চেষ্টা করলে আমি কঠিন অ্যাসাইনমেন্টও নিজে নিজে শেষ করতে পারি।' },
      { id: 'ASE3', en: 'I am confident I can understand even the hardest topics in my courses by myself.', bn: 'আমি বিশ্বাস করি, কোর্সের সবচেয়ে কঠিন বিষয়ও আমি নিজে বুঝতে পারব।' },
      { id: 'ASE4', en: 'I can do well in exams by preparing on my own.', bn: 'নিজে নিজে প্রস্তুতি নিয়েই আমি পরীক্ষায় ভালো করতে পারি।' },
      { id: 'GSE1', en: 'If I try hard enough, I can always solve difficult problems.', bn: 'যথেষ্ট চেষ্টা করলে আমি সবসময় কঠিন সমস্যার সমাধান করতে পারি।' },
      { id: 'GSE2', en: 'I am confident I can handle unexpected situations well.', bn: 'আমি বিশ্বাস করি, হঠাৎ আসা পরিস্থিতি আমি ভালোভাবে সামলাতে পারব।' },
      { id: 'ATT2', attention: 2, en: 'This is a check question — please choose "Disagree" (2).', bn: 'এটি একটি যাচাই-প্রশ্ন — অনুগ্রহ করে "একমত নই" (২) বেছে নিন।' },
      { id: 'GSE3', en: 'I can stay calm in hard times because I trust my ability to handle them.', bn: 'কঠিন সময়েও আমি শান্ত থাকতে পারি, কারণ পরিস্থিতি সামলানোর ক্ষমতার ওপর আমার আস্থা আছে।' },
      { id: 'GSE4', en: 'When I have a problem, I can usually think of more than one way to solve it.', bn: 'কোনো সমস্যায় পড়লে আমি সাধারণত তা সমাধানের একাধিক উপায় ভাবতে পারি।' },
    ],
  },
  {
    id: 'G', kind: 'likert', short: 'gd', construct: 'GenAI Dependence (IV)',
    en: 'Depending on GenAI', bn: 'GenAI-এর ওপর নির্ভরতা',
    hint: {
      en: 'These sentences are about how much you depend on GenAI for your studies, thinking about the last 6 months.',
      bn: 'এই বাক্যগুলো গত ৬ মাসে পড়াশোনার জন্য আপনি GenAI-এর ওপর কতটা নির্ভর করেছেন, সে সম্পর্কে।',
    },
    items: [
      { id: 'GD1', en: 'I use GenAI before I even try to do a study task myself.', bn: 'পড়াশোনার কোনো কাজ নিজে চেষ্টা করার আগেই আমি GenAI ব্যবহার করি।' },
      { id: 'GD2', en: 'I find it hard to finish my assignments without GenAI.', bn: 'GenAI ছাড়া অ্যাসাইনমেন্ট শেষ করা আমার কাছে কঠিন লাগে।' },
      { id: 'GD3', en: 'I feel uncomfortable when I cannot use GenAI for my studies.', bn: 'পড়াশোনায় GenAI ব্যবহার করতে না পারলে আমার অস্বস্তি লাগে।',
        help: { en: 'For example, when there is no internet or the tool is not working.', bn: 'যেমন: ইন্টারনেট না থাকলে বা টুলটি কাজ না করলে।' } },
      { id: 'GD4', en: 'I depend on GenAI to decide how to do my study tasks.', bn: 'পড়াশোনার কাজ কীভাবে করব, তা ঠিক করতে আমি GenAI-এর ওপর নির্ভর করি।',
        help: { en: 'For example, which steps to take or how to structure an answer.', bn: 'যেমন: কোন ধাপে কাজ করব বা উত্তর কীভাবে সাজাব।' } },
      { id: 'GD5', en: 'I trust GenAI’s answers more than my own first idea.', bn: 'নিজের প্রথম ধারণার চেয়ে আমি GenAI-এর উত্তরে বেশি ভরসা করি।' },
      { id: 'GD6', en: 'I end up using GenAI for my studies more than I planned.', bn: 'পড়াশোনায় যতটা ভেবেছিলাম, শেষ পর্যন্ত তার চেয়ে বেশি GenAI ব্যবহার করে ফেলি।' },
      { id: 'GD7', en: 'If GenAI were gone, I would find it hard to keep up with my courses.', bn: 'GenAI না থাকলে কোর্সের পড়াশোনা চালিয়ে যাওয়া আমার জন্য কঠিন হবে।' },
      { id: 'GD8', en: 'I open a GenAI tool out of habit, even for easy study tasks.', bn: 'সহজ পড়াশোনার কাজেও আমি অভ্যাসবশত GenAI খুলে ফেলি।' },
    ],
  },
  {
    // Optional construct — delete this block (then `npm run generate`) if
    // Cognitive Offloading is dropped from the model.
    id: 'H', kind: 'likert', short: 'co', construct: 'Cognitive Offloading (optional mediator)',
    en: 'Letting GenAI Think for You', bn: 'GenAI-কে দিয়ে ভাবানো',
    hint: {
      en: 'These sentences are about thinking work that you let GenAI do instead of doing it yourself.',
      bn: 'এই বাক্যগুলো এমন ভাবনার কাজ নিয়ে, যা আপনি নিজে না করে GenAI-কে দিয়ে করিয়ে নেন।',
    },
    items: [
      { id: 'CO1', en: 'Instead of learning facts myself, I let GenAI remember them for me.', bn: 'তথ্য নিজে শেখার বদলে আমি সেগুলো মনে রাখার কাজ GenAI-কে দিই।' },
      { id: 'CO2', en: 'Instead of working out the steps of a problem myself, I let GenAI do it.', bn: 'কোনো সমস্যার ধাপগুলো নিজে বের না করে আমি GenAI-কে দিয়ে করাই।' },
      { id: 'CO3', en: 'I read GenAI’s summaries instead of reading the full course material.', bn: 'পুরো কোর্স ম্যাটেরিয়াল না পড়ে আমি GenAI-এর তৈরি সারসংক্ষেপ পড়ি।' },
      { id: 'CO4', en: 'I hand in text or code written by GenAI with only small changes.', bn: 'GenAI-এর লেখা টেক্সট বা কোড সামান্য বদলে আমি জমা দিই।' },
      { id: 'CO5', en: 'I let GenAI check my work instead of checking it myself.', bn: 'নিজের কাজ নিজে না দেখে আমি GenAI-কে দিয়ে যাচাই করাই।' },
    ],
  },
  {
    id: 'I', kind: 'likert', short: 'al', construct: 'AI Literacy (moderator)',
    en: 'What You Know About GenAI', bn: 'GenAI সম্পর্কে আপনার জ্ঞান',
    hint: {
      en: 'These sentences are about what you know about GenAI, and how well and how carefully you use it.',
      bn: 'এই বাক্যগুলো GenAI সম্পর্কে আপনার জ্ঞান এবং আপনি কতটা দক্ষভাবে ও সাবধানে এটি ব্যবহার করেন, সে সম্পর্কে।',
    },
    items: [
      { id: 'AL1', en: 'I know GenAI can give answers that sound sure but are wrong.', bn: 'আমি জানি, GenAI এমন উত্তরও দিতে পারে যা শুনতে নিশ্চিত মনে হলেও আসলে ভুল।',
        help: { en: 'This is sometimes called "hallucination".', bn: 'একে কখনো কখনো "হ্যালুসিনেশন" বলা হয়।' } },
      { id: 'AL2', en: 'I have a basic idea of how GenAI makes its answers.', bn: 'GenAI কীভাবে উত্তর তৈরি করে, সে সম্পর্কে আমার মোটামুটি ধারণা আছে।',
        help: { en: 'For example, that they predict likely text from patterns in large amounts of data, rather than looking up verified facts.', bn: 'যেমন: এগুলো যাচাই করা তথ্য খুঁজে দেয় না; বরং বিপুল পরিমাণ তথ্যের ধরন (প্যাটার্ন) থেকে সম্ভাব্য লেখা অনুমান করে তৈরি করে।' } },
      { id: 'AL3', en: 'I can write clear instructions (prompts) to get useful answers from GenAI.', bn: 'GenAI থেকে কাজের উত্তর পেতে আমি স্পষ্ট নির্দেশনা (প্রম্পট) লিখতে পারি।',
        help: { en: 'A prompt is the question or request you type into the tool.', bn: 'প্রম্পট হলো টুলে আপনি যে প্রশ্ন বা অনুরোধ লেখেন।' } },
      { id: 'AL4', en: 'I can choose which GenAI tool is best for a task.', bn: 'কোন কাজের জন্য কোন GenAI টুল সবচেয়ে ভালো, তা আমি বেছে নিতে পারি।' },
      { id: 'AL5', en: 'After using a GenAI tool for some time, I can tell what it does well and where it makes mistakes.', bn: 'কিছুদিন ব্যবহারের পর আমি বুঝতে পারি, একটি GenAI টুল কোন কাজ ভালো পারে আর কোথায় ভুল করে।' },
      { id: 'AL6', en: 'For important work, I check GenAI’s answers with reliable sources before I use them.', bn: 'গুরুত্বপূর্ণ কাজে GenAI-এর উত্তর ব্যবহারের আগে আমি নির্ভরযোগ্য উৎসের সঙ্গে মিলিয়ে দেখি।' },
      { id: 'AL7', en: 'I do not present work made by GenAI as completely my own.', bn: 'GenAI-এর তৈরি কাজকে আমি পুরোপুরি নিজের কাজ বলে দেখাই না।' },
      { id: 'AL8', en: 'I am careful not to share personal or private information with GenAI.', bn: 'GenAI-তে ব্যক্তিগত বা গোপন তথ্য না দেওয়ার ব্যাপারে আমি সতর্ক থাকি।' },
    ],
  },
];

// Flat list of every saved field: { col, kind, q, section }
export function fieldList() {
  const out = [];
  for (const s of SECTIONS) {
    if (s.kind === 'likert') {
      for (const it of s.items) out.push({ col: it.id.toLowerCase(), kind: 'likert', q: it, section: s });
    } else {
      for (const q of s.questions) {
        out.push({ col: q.id.toLowerCase(), kind: q.type, q, section: s });
        if (q.options && q.options.some(o => o.other)) out.push({ col: q.id.toLowerCase() + '_other', kind: 'other_text', q, section: s });
      }
    }
  }
  return out;
}

export const ATTENTION_ITEMS = SECTIONS.flatMap(s => (s.items || []).filter(i => i.attention));
