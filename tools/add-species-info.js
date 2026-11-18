// Merges drafted species facts (data/species-info/*.json: [{name, size, habitat, food, breeding, titbit, source}])
// into data/species-info.csv as Draft rows. Names already in the CSV are skipped, so Grant's edits are never overwritten.
// Also writes data/new-species-info.csv (just the new rows) for pasting into the Google Sheet's "Species Info" tab.
// Run:  node tools/add-species-info.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HEAD = ['Name', 'Group', 'Size', 'Habitat', 'Food', 'Breeding', 'Did you know', 'Source', 'Status', 'Notes'];
const csvCell = v => { v = v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const file = path.join(ROOT, 'data', 'species-info.csv');
const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/^﻿/, '') : HEAD.join(',') + '\r\n';
const have = new Set(existing.split(/\r?\n/).slice(1).map(l => (l.match(/^"((?:[^"]|"")*)"|^([^,]*)/) || []).slice(1).find(x => x != null)).filter(Boolean).map(s => s.replace(/""/g, '"')));
const dir = path.join(ROOT, 'data', 'species-info');
const rows = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const group = /^birds/.test(f) ? 'birds' : f.replace(/-part\d+\.json$|\.json$/, '');
  const list = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
  list.forEach(x => {
    if (!x.name || have.has(x.name)) return;
    have.add(x.name);
    rows.push([x.name, group.charAt(0).toUpperCase() + group.slice(1), x.size, x.habitat, x.food, x.breeding, x.titbit, x.source, 'Draft', '']);
  });
}
const lines = rows.map(r => r.map(csvCell).join(','));
if (lines.length) {
  fs.writeFileSync(file, existing.replace(/\s*$/, '') + '\r\n' + lines.join('\r\n') + '\r\n');
  fs.writeFileSync(path.join(ROOT, 'data', 'new-species-info.csv'), lines.join('\r\n') + '\r\n');
}
console.log(`Added ${rows.length} Draft species cards (${have.size} in total).`);
