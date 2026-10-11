// Writes the questionnaire documents in ../outputs from public/questions.js,
// so the documents always match the live form.
//   outputs/Survey_Questionnaire_GenAI_Dependence.md   (English)
//   outputs/Survey_Questionnaire_Bilingual_EN_BN.md    (English + Bangla)
//   outputs/survey-items.json                          (for the workbook updater)
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, SCREENING, LIKERT_LABELS, CONSENT_TEXT, FORM_VERSION, STUDY_INFO } from '../public/questions.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '..', 'outputs');
// The thesis documents live outside this repo; skip quietly when the folder is not there (e.g. a fresh clone).
if (!existsSync(outDir)) {
  console.log('Skipped questionnaire documents: ../outputs not found (only needed inside the thesis project folder).');
  process.exit(0);
}

const TITLE = {
  en: 'Effects of GenAI Dependence on Critical Thinking, Social Connectivity, and Self-Efficacy among Bangladeshi University Students',
  bn: 'বাংলাদেশি বিশ্ববিদ্যালয় শিক্ষার্থীদের সমালোচনামূলক চিন্তা, সামাজিক সংযোগ ও আত্ম-সক্ষমতার ওপর জেনারেটিভ এআই (GenAI) নির্ভরতার প্রভাব',
};
const SOURCES = {
  ct: 'Sosu (2013) Critical Thinking Disposition Scale',
  sc: 'Self-developed bipolar items (people vs. AI companion), informed by Malfacini (2025) and Jiao et al. (2026) — validate with expert review, pilot and factor analysis',
  se: 'Midgley et al. (2000) PALS academic efficacy (ASE); Schwarzer & Jerusalem (1995) General Self-Efficacy Scale (GSE)',
  gd: 'Morales-García et al. (2024) AI dependence scale; Liu (2026); Hou et al. (2025) reliance behaviour',
  co: 'Gerlich (2025) cognitive offloading; Mir et al. (2026)',
  al: 'Wang, Rau & Yuan (2023) AI Literacy Scale (awareness, usage, evaluation, ethics)',
};

function build(bi) {
  const L = (o, sep = '<br>') => (bi && o.bn !== o.en ? `${o.en}${sep}${o.bn}` : o.en);
  const Lin = o => (bi && o.bn !== o.en ? `${o.en} · ${o.bn}` : o.en);
  const help = q => (q.help ? `\n*${L(q.help, '*<br>*')}*` : '');
  let md = `# Survey Questionnaire${bi ? ' · জরিপ প্রশ্নপত্র' : ''}\n\n`;
  md += `**${TITLE.en}**${bi ? `\n\n**${TITLE.bn}**` : ''}\n\n`;
  md += `Department of Software Engineering, Daffodil International University · Researcher: Fahim Bin Forhad · Supervisor: Dr. Md. Abdul Kader\n\n`;
  md += `*Form version ${FORM_VERSION} — generated from \`survey-form/public/questions.js\`; identical to the online form.*\n\n---\n\n`;

  md += `## ${bi ? 'Participant Information · অংশগ্রহণকারীর তথ্য' : 'Participant Information'}\n\n${CONSENT_TEXT.en}\n\n${bi ? CONSENT_TEXT.bn + '\n\n' : ''}**Contact:** ${STUDY_INFO.contactEmail || '[researcher email]'} · **Ethics approval:** ${STUDY_INFO.ethicsRef || '[approval reference]'}\n\n---\n\n`;

  const choiceQ = q => {
    let s = `**${q.id}. ${q.en}**${bi && q.bn !== q.en ? `  \n**${q.bn}**` : ''}`;
    if (q.type === 'multi') s += bi ? '  \n*(select all that apply · প্রযোজ্য সবগুলো নির্বাচন করুন)*' : '  \n*(select all that apply)*';
    if (q.help) s += `  \n*${Lin(q.help)}*`;
    if (q.type === 'text') return s + '\n\n______________________________________\n\n';
    s += '\n\n' + q.options.map(o => `- [ ] ${Lin(o)}${o.other ? ': ________' : ''}`).join('\n') + '\n\n';
    return s;
  };

  md += `## Section A: ${Lin({ en: 'Consent & Eligibility', bn: 'সম্মতি ও যোগ্যতা' })}\n\n`;
  md += `*${Lin({ en: 'A "No" to any question ends the survey; nothing is saved.', bn: 'যেকোনো প্রশ্নে "না" দিলে জরিপ শেষ হবে; কোনো তথ্য সংরক্ষণ হবে না।' })}*\n\n`;
  md += SCREENING.map(choiceQ).join('');

  md += `---\n\n> **${bi ? 'Response scale for rating sections · মূল্যায়ন অংশের উত্তর-মান' : 'Response scale for rating sections'}:** ${LIKERT_LABELS.map(l => `${l.v} = ${Lin(l)}`).join(' · ')}\n\n`;

  for (const s of SECTIONS) {
    md += `---\n\n## Section ${s.id}: ${Lin(s)}\n\n`;
    if (s.hint) md += `*${s.hint.en}*\n\n${bi ? `*${s.hint.bn}*\n\n` : ''}`;
    if (s.scale) md += `> **${bi ? 'Scale for this section · এই অংশের উত্তর-মান' : 'Scale for this section'}:** ${s.scale.map(l => `${l.v} = ${Lin(l)}`).join(' · ')}\n\n`;
    if (s.kind === 'likert') {
      md += `| Code | Statement${bi ? ' · বিবৃতি' : ''} | 1 | 2 | 3 | 4 | 5 |\n|:-:|---|:-:|:-:|:-:|:-:|:-:|\n`;
      for (const it of s.items) {
        const extra = it.help ? `<br>*${Lin(it.help)}*` : '';
        const topic = it.topic ? `**${Lin(it.topic)}**<br>` : '';
        md += `| ${it.id} | ${topic}${L(it)}${extra} | ○ | ○ | ○ | ○ | ○ |\n`;
      }
      md += '\n';
    } else {
      md += s.questions.map(choiceQ).join('');
    }
  }
  md += `---\n\n**${Lin({ en: 'Thank you for your time and participation!', bn: 'আপনার সময় ও অংশগ্রহণের জন্য আন্তরিক ধন্যবাদ!' })}**\n\n---\n---\n\n`;

  // Researcher appendix
  md += `# Appendix (for researcher only — remove before distribution)\n\n## Measurement plan and item sources\n\n`;
  md += `| Section | Construct (role) | Items | Adapted from (verify wording against the original) | Reverse-coded |\n|:-:|---|---|---|---|\n`;
  for (const s of SECTIONS.filter(x => x.kind === 'likert')) {
    const its = s.items.filter(i => !i.attention);
    md += `| ${s.id} | ${s.construct} | ${its.map(i => i.id).join(', ')} | ${SOURCES[s.short]} | ${its.filter(i => i.reverse).map(i => i.id).join(', ') || 'None'} |\n`;
  }
  const att = SECTIONS.flatMap(s => (s.items || []).filter(i => i.attention).map(i => `${i.id} (Section ${s.id}, correct = ${i.attention})`));
  md += `| — | Attention checks | ${att.join('; ')} | Instructed-response items | — |\n\n`;
  md += `## Notes\n\n`;
  md += `- **Order:** About You (B) and GenAI usage (C) come first, then the outcome scales (D–F), then the GenAI rating scales (G–I). The outcome scales still come before the dependence, offloading and AI-literacy statements, and their instructions say they are not about AI, to limit priming (procedural remedy for common method bias; Podsakoff et al., 2003).\n`;
  md += `- **Screening:** A1–A4 must all be "Yes"; A2 (18+) avoids the need for parental consent.\n`;
  md += `- **Typed answers (DEM3 university, DEM5 department):** standardise spelling before analysis (e.g., "DIU" → "Daffodil International University").\n`;
  md += `- **Data quality:** exclude respondents who fail either attention check, straight-line a whole section, or finish in under ~5 minutes.\n`;
  md += `- **Social Connectivity (Section E)** uses its own two-sided scale (1 = always an AI chatbot … 5 = always a person); higher scores mean a stronger preference for human connection. No items are reverse-coded.\n`;
  md += `- **USE6 (mode of use)** is a descriptive/control variable capturing passive vs. active use — the central theme of the literature review.\n`;
  md += `- **Section H (Cognitive Offloading)** is optional: keep it only if CO is added to the model as a mediator (GenAI Dependence → CO → Critical Thinking).\n`;
  md += `- Bangla text is a draft — complete forward–back translation and a pilot (30–50 students) before the main collection.\n`;
  md += `- Full rationale for every change: \`questionnaire-review.md\`.\n`;
  return md;
}

writeFileSync(join(outDir, 'Survey_Questionnaire_GenAI_Dependence.md'), build(false));
writeFileSync(join(outDir, 'Survey_Questionnaire_Bilingual_EN_BN.md'), build(true));

// Flat item list for the workbook updater
const items = [];
for (const s of SECTIONS) {
  if (s.kind === 'likert') for (const it of s.items) items.push({ code: it.id, construct: it.attention ? 'Attention check' : s.construct, statement: it.en, reverse: !!it.reverse, note: it.attention ? `Correct answer = ${it.attention}` : (it.reverse ? 'Reverse-code 6 - x' : SOURCES[s.short]) });
}
writeFileSync(join(outDir, 'survey-items.json'), JSON.stringify(items, null, 1));
console.log('Wrote outputs/Survey_Questionnaire_GenAI_Dependence.md, Survey_Questionnaire_Bilingual_EN_BN.md, survey-items.json');
