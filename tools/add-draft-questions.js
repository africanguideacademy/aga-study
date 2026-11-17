// Merges chapter drafts (data/drafts/<chapter>.json, rows: [section, page, question, answer, wrong1, wrong2, wrong3, explanation])
// into data/questions.csv as Draft rows, and writes data/new-questions.csv (just the new rows) for pasting into the Google Sheet.
// Chapters already present in questions.csv are skipped, so it is safe to run again.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CHAPTERS = {
  'guiding-principles': ['Guiding Principles', 'GUID'], 'astronomy': ['Astronomy', 'ASTR'], 'geology': ['Geology', 'GEOL'],
  'weather-and-climate': ['Weather and Climate', 'WEAT'], 'ecology': ['Ecology', 'ECOL'], 'plants': ['Plants', 'PLAN'],
  'arthropods': ['Arthropods', 'ARTH'], 'reptiles': ['Reptiles', 'REPT'], 'mammals': ['Mammals', 'MAMM'],
  'tourism-and-legislation': ['Tourism and Legislation', 'TOUR'],
};
const csvCell = v => { v = v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const file = path.join(ROOT, 'data', 'questions.csv');
let existing = fs.readFileSync(file, 'utf8');
const newRows = [], problems = [];
for (const [slug, [chapter, prefix]] of Object.entries(CHAPTERS)) {
  const f = path.join(ROOT, 'data', 'drafts', slug + '.json');
  if (!fs.existsSync(f)) { console.log(`- ${chapter}: no draft yet`); continue; }
  if (existing.includes(`,${chapter},`)) { console.log(`- ${chapter}: already in questions.csv, skipped`); continue; }
  const rows = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
  const seenQ = new Set(); let n = 0;
  rows.forEach((r, i) => {
    const where = `${chapter} #${i + 1}`;
    if (!Array.isArray(r) || r.length !== 8) return problems.push(`${where}: not 8 fields`);
    const [section, page, q, a, w1, w2, w3, ex] = r;
    if (![section, q, a, w1, w2, w3].every(x => typeof x === 'string' && x.trim())) return problems.push(`${where}: empty field`);
    if (!Number.isFinite(Number(page))) return problems.push(`${where}: page not a number`);
    if (new Set([a, w1, w2, w3].map(x => x.trim().toLowerCase())).size !== 4) return problems.push(`${where}: options not distinct`);
    if (seenQ.has(q.trim().toLowerCase())) return problems.push(`${where}: duplicate question`);
    seenQ.add(q.trim().toLowerCase());
    n++;
    newRows.push([`${prefix}-${String(n).padStart(3, '0')}`, chapter, section.trim(), Number(page), q, a, w1, w2, w3, ex || '', 'Draft', '']);
  });
  console.log(`+ ${chapter}: ${n} questions (${prefix}-001..${String(n).padStart(3, '0')})`);
}
if (problems.length) { console.log('Problems (rows skipped):\n  ' + problems.join('\n  ')); }
if (newRows.length) {
  const lines = newRows.map(r => r.map(csvCell).join(','));
  fs.writeFileSync(file, existing.replace(/\s*$/, '') + '\r\n' + lines.join('\r\n') + '\r\n');
  fs.writeFileSync(path.join(ROOT, 'data', 'new-questions.csv'), lines.join('\r\n') + '\r\n');
}
console.log(`Added ${newRows.length} new Draft questions.`);
