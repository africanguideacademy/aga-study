// Writes data/birds-sheet.csv: ONE row per bird with its level and which original lists it is on -
// pasted into the Google Sheet's "Birds" tab (which replaces the old "Birds - FGASA 80" tab).
// Run after build-data:  node tools/make-bird-sheet.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'app', 'data.js'));
const D = window.AGA_DATA;
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
const mod = id => D.modules.find(m => m.id === id);
const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bird-lists-source.json'), 'utf8'));
const on = id => new Set(src.find(m => m.id === id).items.map(i => norm(i.name)));
const fg = on('fgasa80'), bq = on('prominent40'), kw = on('kwapa63');
const beg = new Set(mod('birds-beginner').items.map(i => norm(i.name))), int = new Set(mod('birds-intermediate').items.map(i => norm(i.name)));
const inat = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'botswana-birds-inat.json'), 'utf8')).map(b => [norm(b.common), b]));
const extra = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'species-lists', 'birds-botswana.json'), 'utf8')).map(x => [x.name, x]));
const cell = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const rows = [['Name', 'Level', 'FGASA 80', 'BQA 40', 'Kwapa', 'Scientific name', 'Botswana sightings (iNaturalist)', 'Photo', 'Photo credit', 'Call', 'Has fact card']];
const levelOf = k => beg.has(k) ? 'Beginner' : int.has(k) ? 'Intermediate' : 'Botswana';
const order = { Beginner: 0, Intermediate: 1, Botswana: 2 };
const items = mod('birds-botswana').items.slice().sort((a, b) => order[levelOf(norm(a.name))] - order[levelOf(norm(b.name))] || a.name.localeCompare(b.name));
for (const i of items) {
  const k = norm(i.name), x = extra.get(i.name), n = x ? x.obs : (inat.get(k) || {}).count;
  rows.push([i.name, levelOf(k), fg.has(k) ? 'Yes' : '', bq.has(k) ? 'Yes' : '', kw.has(k) ? 'Yes' : '', i.sci || (x && x.sci) || '', n || '',
    i.photo, i.credit || 'AGA', i.call ? i.call.replace(/^media\//, '') : 'none', D.info[i.name] ? 'Yes' : '']);
}
fs.writeFileSync(path.join(ROOT, 'data', 'birds-sheet.csv'), rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n');
const c = l => rows.filter(r => r[1] === l).length;
console.log(`birds-sheet.csv: ${rows.length - 1} birds (Beginner ${c('Beginner')}, Intermediate ${c('Intermediate')}, Botswana-only ${c('Botswana')})`);
