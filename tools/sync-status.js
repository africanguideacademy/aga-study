// Copies the review Status from the Google Sheet's Questions tab into data/questions.csv.
// Usage: node tools/sync-status.js status.json   where status.json = { "BIRD-001": "Approved", ... } read from the sheet.
const fs = require('fs');
const path = require('path');
const statuses = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^﻿/, ''));
const file = path.join(__dirname, '..', 'data', 'questions.csv');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let changed = 0;
const out = lines.map(line => {
  const id = line.split(',')[0];
  if (!statuses[id]) return line;
  // Status is the second-to-last column (then Reviewer notes, empty in these rows)
  const m = /^(.*),(Draft|Approved|Rejected),([^,]*)$/.exec(line);
  if (!m) throw new Error('Could not find Status in row ' + id);
  if (m[2] === statuses[id]) return line;
  changed++;
  return `${m[1]},${statuses[id]},${m[3]}`;
});
fs.writeFileSync(file, out.join('\r\n'));
console.log(`Synced from sheet: ${changed} statuses changed.`);
const counts = {};
out.slice(1).filter(Boolean).forEach(l => { const s = /,(Draft|Approved|Rejected),[^,]*$/.exec(l); if (s) counts[s[1]] = (counts[s[1]] || 0) + 1; });
console.log('Now:', JSON.stringify(counts));
