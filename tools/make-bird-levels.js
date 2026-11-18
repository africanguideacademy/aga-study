// Builds the three bird levels (Bernard, 2026-11-18):
//   Beginner     = the BQA 40 prominent birds
//   Intermediate = the FGASA 80 birds that are not already in Beginner + the 20 Kwapa birds seen most often in Botswana
//   Botswana     = every bird above + all the other Kwapa birds + common Botswana birds (iNaturalist research-grade
//                  sightings in Botswana >= MIN_OBS) that have a call in the call library
// Inputs:  the photo lists already in app/data.js (run build-data first), data/botswana-birds-inat.json
//          (iNaturalist species counts for Botswana: tools refresh it with the snippet in README)
// Outputs: data/bird-levels.json                     {beginner:[names], intermediate:[names], botswana:[names]}
//          data/species-lists/birds-botswana.json     the extra Botswana birds (name + scientific name) for tools/fetch-photos.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIN_OBS = 20, KWAPA_EXTRA = 20;
const norm = s => s.toLowerCase().replace(/gray/g, 'grey').replace(/colored/g, 'coloured').replace(/[^a-z]/g, '');
// iNaturalist common name -> the name used in AGA's call library
const ALIAS = {
  'Southern Cordonbleu': 'Blue Waxbill', 'Common Bulbul': 'Dark-capped Bulbul', 'Crimson-breasted Gonolek': 'Crimson-breasted Shrike',
  'Crested Francolin': 'Crested Spurfowl', 'Cape Starling': 'Cape Glossy Starling', 'African Gray Hornbill': 'Grey Hornbill',
  'Pale Chanting-Goshawk': 'Southern Pale Chanting Goshawk', 'Common Hoopoe': 'African Hoopoe', 'Western Cattle-Egret': 'Cattle Egret',
  'Hadada Ibis': 'Hadeda Ibis', "Holub's Golden-Weaver": 'Golden Weaver', 'Little Heron': 'Green-backed Heron', 'Knob-billed Duck': 'Comb Duck',
  'Black-winged Kite': 'Black-shouldered Kite', 'Scaly Weaver': 'Scaly-feathered Finch', 'Eastern Paradise-Whydah': 'Long-tailed Paradise Whydah',
  'Gray-hooded Gull': 'Grey-headed Gull', 'Wattled Lapwing': 'African Wattled Lapwing', 'Blue-billed Teal': 'Hottentot Teal',
  'Southern Anteater-Chat': 'Ant-eating Chat', 'Mourning Collared Dove': 'African Mourning Dove', 'Natal Spurfowl': 'Natal Francolin',
  'Southern Brown-throated Weaver': 'Southern Brown-throated', 'Western Barn Owl': 'Barn Owl', 'Yellow-throated Bush Sparrow': 'Yellow-throated Petronia',
  'Red-crested Bustard': 'Red-crested Korhaan', 'Diederik Cuckoo': 'Dideric Cuckoo',
};
// call-library names for birds that are already on the AGA lists under another name
const SAME_AS = { 'Common Ostrich': 'Ostrich', 'White-faced Whistling Duck': 'White-faced Duck', 'African Palm Swift': 'Palm Swift' };
// call-library names that read badly on their own -> the name shown in the app
const DISPLAY = { 'Golden Weaver': "Holub's Golden Weaver", 'Grey Hornbill': 'African Grey Hornbill', 'Southern Brown-throated': 'Southern Brown-throated Weaver' };

global.window = {};
require(path.join(ROOT, 'app', 'data.js'));
const D = window.AGA_DATA;
// the original lists: from data.js, or (once the levels are built) from data/bird-lists-source.json written by build-data
const SRC = fs.existsSync(path.join(ROOT, 'data', 'bird-lists-source.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bird-lists-source.json'), 'utf8')) : [];
const mod = id => D.modules.find(m => m.id === id) || SRC.find(m => m.id === id);
if (!mod('prominent40')) throw new Error('Run build-data first (the old photo lists are needed).');
const names = id => mod(id).items.map(i => i.name);
const inat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'botswana-birds-inat.json'), 'utf8')).filter(x => x.rank === 'species');
const libName = c => ALIAS[c] || c;
const obs = new Map(); inat.forEach(b => obs.set(norm(libName(b.common)), b));

const beginner = names('prominent40');
const bSet = new Set(beginner.map(norm));
const fgasa = names('fgasa80').filter(n => !bSet.has(norm(n)));
const fSet = new Set(fgasa.map(norm));
const kwapaOnly = names('kwapa63').filter(n => !bSet.has(norm(n)) && !fSet.has(norm(n)))
  .map(n => ({ n, c: (obs.get(norm(n)) || { count: 0 }).count })).sort((a, b) => b.c - a.c);
const intermediate = fgasa.concat(kwapaOnly.slice(0, KWAPA_EXTRA).map(x => x.n));

const have = new Set([...beginner, ...intermediate, ...kwapaOnly.map(x => x.n)].map(norm));
const calls = new Map(mod('calls').items.map(c => [norm(c.name), c]));
const extra = [];
for (const b of inat.filter(x => x.count >= MIN_OBS).sort((a, b) => b.count - a.count)) {
  const lib = libName(b.common), k = norm(lib);
  if (have.has(k) || have.has(norm(SAME_AS[lib] || '')) || !calls.has(k)) continue;
  have.add(k);
  const c = calls.get(k);
  extra.push({ name: DISPLAY[c.name] || c.name, call: c.name, sci: b.sci, group: c.group || '', manual: false, page: null, obs: b.count });
}
const botswana = [...beginner, ...intermediate, ...kwapaOnly.slice(KWAPA_EXTRA).map(x => x.n), ...extra.map(x => x.name)];
fs.writeFileSync(path.join(ROOT, 'data', 'bird-levels.json'), JSON.stringify({ beginner, intermediate, botswana }, null, 1));
fs.writeFileSync(path.join(ROOT, 'data', 'species-lists', 'birds-botswana.json'), JSON.stringify(extra, null, 1));
console.log(`Beginner ${beginner.length} | Intermediate ${intermediate.length} (${fgasa.length} FGASA + ${Math.min(KWAPA_EXTRA, kwapaOnly.length)} Kwapa) | Botswana ${botswana.length} (${extra.length} extra Botswana birds with calls)`);
console.log('Kwapa birds added to Intermediate: ' + kwapaOnly.slice(0, KWAPA_EXTRA).map(x => `${x.n} (${x.c})`).join(', '));
