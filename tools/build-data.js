// Builds all study-app content from the training folders on Y:\ and writes:
//   data/birds.csv, data/calls.csv, data/frogs.csv  (to load into the Google Sheet)
//   app/data.js (+ app/data-preview.js)             (what the study app reads)
//   data/media-plan.json                            (which files to copy / resize)
// Run:  node tools/build-data.js        (DRAFTS_LIVE=1 also puts Draft manual questions in the public app)
const fs = require('fs');
const path = require('path');

const PHOTO_DIR = 'Y:\\TRAINING\\TRAINING MATERIALS\\AGA HARD DRIVE\\Nature Guide Course\\Birds\\FGASA Birds\\FGASA Savanah 80 Birds';
const CALL_DIR = 'Y:\\TRAINING\\TRAINING MATERIALS\\BIRD COURSE\\Bird calls Southern Africa';            // original 447 ("Group Rest" names)
const CALL_DIR_BIG = 'Y:\\TRAINING\\TRAINER LAPTOP BACK-UP\\Animal Calls\\Bird Calls of Southern Africa'; // 881, newer names ("Common name")
const FROG_CALL_DIR = 'Y:\\TRAINING\\TRAINER LAPTOP BACK-UP\\Animal Calls\\Frog Calls';                // "NNN Name - G. species"
const FROG_PHOTO_DIR = 'Y:\\TRAINING\\TRAINING MATERIALS\\Training Images and Diagrams\\Level2 Biotic 2\\Frogs';
const ROOT = path.join(__dirname, '..');

// ---------------- helpers ----------------
const SINGLE = new Set(['Bokmakierie', 'Brubru', 'Chaffinch', 'Neddicky', 'Rockrunner', 'Shikra']);
function flip(raw) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2 || SINGLE.has(raw)) return raw;
  const group = parts.shift();
  return parts.join(' ') + ' ' + group;
}
const cleanPhotoBase = base => base.replace(/-Edit$/i, '').replace(/[\s_-]*\d[\d_\-]*$/, '').trim();
const slug = s => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
// "Lesser Striped swallow" -> "Lesser Striped Swallow"; keeps hyphen parts lower-case ("Red-billed")
const titleCase = s => s.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
function csv(rows) {
  return rows.map(r => r.map(v => {
    v = v == null ? '' : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',')).join('\r\n') + '\r\n';
}
const audioFiles = dir => fs.readdirSync(dir).filter(f => /\.mp3$/i.test(f) && !f.startsWith('._')).sort();

// ---------------- birds: photos ----------------
// Photo file name (cleaned) -> correct common name + call (a file base name from either call library, or '' if none).
const PHOTO_FIXES = {
  'Buffalo-Weaver Red-billed': { name: 'Red-billed Buffalo-Weaver', call: 'Weaver Red-billed Buffalo' },
  'Bush Shrike Orange-breasted': { name: 'Orange-breasted Bush-Shrike', call: 'Bushshrike Orange-breasted' },
  'Bustard Long-legged': { name: 'Long-legged Bustard', call: '', note: 'Check species name - no "Long-legged Bustard" in SA lists (Black-bellied Bustard?)' },
  'Buttonquail Kurrichane': { name: 'Kurrichane Buttonquail', call: 'Kurrichane Buttonquail' },
  'Cameroptera Grey-backed': { name: 'Grey-backed Camaroptera', call: 'Camaroptera Grey-backed', note: 'File name misspelt (Cameroptera)' },
  "Chat Arnott's": { name: "Arnot's Chat", call: "Chat Arnot's" },
  'Courser Temminks': { name: "Temminck's Courser", call: "Temminck's Courser" },
  'Dove Emerald Spotted': { name: 'Emerald-spotted Wood-Dove', call: 'Emerald-spotted wood dove' },
  'Flycatcher Black': { name: 'Southern Black Flycatcher', call: 'Flycatcher Southern Black' },
  'Flycatcher Grey-Tit': { name: 'Grey Tit-Flycatcher', call: 'Flycatcher Grey Tit' },
  'Francolin Coqui': { name: 'Coqui Francolin', call: 'Coqui francolin' },
  'Goose Pygmy': { name: 'African Pygmy Goose', call: 'African pygmy goose' },
  'Goshawk Dark-Chanting': { name: 'Dark Chanting Goshawk', call: 'Dark Chanting goshawk' },
  'Hawk Eagle African': { name: 'African Hawk-Eagle', call: 'African Hawk-Eagle' },
  "Helmet-Shrike Retz's": { name: "Retz's Helmet-Shrike", call: "Helmetshrike Retz's" },
  'Kingfisher Pygmy': { name: 'African Pygmy Kingfisher', call: 'African pygmy kingfisher' },
  'Mourning Dove': { name: 'African Mourning Dove', call: 'African Mourning dove' },
  'Nightjar Pennant-winged in progress': { name: 'Pennant-winged Nightjar', call: 'Nightjar Pennant-winged', note: 'File name says "in progress"' },
  "Owl Pel's Fishing": { name: "Pel's Fishing-Owl", call: "Owl Pel's Fishing" },
  'Owl Scops': { name: 'African Scops-Owl', call: 'Owl African Scops' },
  'Owl White-faced': { name: 'Southern White-faced Owl', call: 'Owl Southern White-faced' },
  'Owlet Barred': { name: 'African Barred Owlet', call: 'Owlet African Barred' },
  'Oxpecker Yellow-billed': { name: 'Yellow-billed Oxpecker', call: 'Yellow-billed oxpecker' },
  'Palmthrush Collared': { name: 'Collared Palm-Thrush', call: 'Palm-Thrush Collared' },
  'Parrot Meyers': { name: "Meyer's Parrot", call: "Meyer's parrot" },
  'Penduline-Tit Grey': { name: 'Grey Penduline-Tit', call: 'Tit Grey Penduline' },
  'Pigeon Green': { name: 'African Green Pigeon', call: 'Pigeon African Green' },
  'Pratincole Black-winged': { name: 'Black-winged Pratincole', call: '' },
  'Pratincole Collared': { name: 'Collared Pratincole', call: '' },
  'Quelea Red-billed': { name: 'Red-billed Quelea', call: 'Red-billed quelea' },
  'Robin Eastern Bearded Scrub': { name: 'Eastern Bearded Scrub-Robin', call: 'Scrub-Robin Eastern Bearded' },
  'Roller Broadbilled': { name: 'Broad-billed Roller', call: 'Roller Broad-billed' },
  'Roller Purple': { name: 'Purple Roller', call: 'Purple roller' },
  'Sparrowlark Chestnut-backed': { name: 'Chestnut-backed Sparrowlark', call: 'Chestnut-backed sparrowlark' },
  "Starling Meeve's": { name: "Meves's Starling", call: "Starling Meves's" },
  'Swallow Grey-rumped': { name: 'Grey-rumped Swallow', call: 'Grey-rumped swallow' },
  'Swallow Lesser-striped': { name: 'Lesser Striped Swallow', call: 'Lesser Striped swallow' },
  'Swallow Red-breasted': { name: 'Red-breasted Swallow', call: 'Red-breasted swallow' },
  'Swallow Wire-tailed': { name: 'Wire-tailed Swallow', call: 'Wire-tailed swallow' },
  'Vulture Lapped-faced': { name: 'Lappet-faced Vulture', call: 'Lappet-faced vulture', note: 'File name misspelt (Lapped-faced)' },
  'Vulture White-headed': { name: 'White-headed Vulture', call: '' },
  'Waxbill Violet eared': { name: 'Violet-eared Waxbill', call: 'Waxbill Violet-eared' },
  'Weaver Red-headed': { name: 'Red-headed Weaver', call: 'Red-headed weaver' },
  'Whitethroat Common': { name: 'Common Whitethroat', call: 'Common whitethroat' },
  'Publication': { name: '', call: '', note: 'Unknown bird - file named "Publication"; please identify' },
};

// Original-library call name -> correct common name, where the default flip rule gets it wrong.
const CALL_FIXES = {
  'Hawk Cuckoo': 'African Cuckoo-Hawk', 'Nightingale Thrush': 'Thrush Nightingale', 'Lark Fawncoloured 2': 'Fawn-coloured Lark (2nd recording)',
  'Bittern': 'Eurasian Bittern', 'Wood Hoopoe Violet': 'Violet Wood-Hoopoe', 'Owl African Scops': 'African Scops-Owl',
  "Owl Pel's Fishing": "Pel's Fishing-Owl", 'Weaver Red-billed Buffalo': 'Red-billed Buffalo-Weaver',
  'Barbet Yellow-fronted Tinker': 'Yellow-fronted Tinkerbird', 'Barbet Yellow-rumped Tinker': 'Yellow-rumped Tinkerbird',
  'Flycatcher Black and White Shrike': 'Black-and-white Shrike-Flycatcher', 'Flycatcher Grey Tit': 'Grey Tit-Flycatcher',
  'Tit Grey Penduline': 'Grey Penduline-Tit', 'Tit Cape Penduline': 'Cape Penduline-Tit', 'Pigeon African Green': 'African Green Pigeon',
};
// Species that are in BOTH libraries under different names (big-library name, normalised). These big-library
// files are skipped so a quiz never shows two names for the same bird.
const BIG_ALIASES = ['Yellow-fronted tinkerbird', 'Yellow-rumped tinkerbird', 'Eurasian Bittern', 'Blue Korhaan', 'Karoo Korhaan',
  'Red-crested Korhaan', "Ruppell's Korhaan", 'Southern Black Korhaan', 'White-bellied Korhaan', 'Black-eared seedeater',
  'Protea seedeater', 'Streaky-headed seedeater', 'Common Chaffinch', 'Barred Long-tailed Cuckoo', 'Diderick Cuckoo',
  'African Emerald Cuckoo', 'African Crowned eagle', "Hartlaub's spurfowl", 'Natal spurfowl', 'Red-necked spurfowl',
  "Swainson's spurfowl", 'African Purple swamphen', 'African Cuckoo Hawk', 'African Grey Hornbill', 'African grass-owl',
  'White-bellied sunbird sunbird', "Carp's tit", 'Fairy flycatcher', 'Dark-capped Yellow warbler', 'Capped wheater',
  'Mountain wheater', 'African Yellow white-eye'].map(norm);
const BIG_SKIP = /copy|removed/i; // junk duplicates in the big library
const bigName = base => titleCase(base.replace(/\b(\w+) \1\b/i, '$1').replace(/wheater/i, 'wheatear').trim());

// ---------------- birds: calls ----------------
const calls = [];
const callIndex = new Map(); // lower-case base name and normalised common name -> call
function addCall(c) { calls.push(c); callIndex.set(c.base.toLowerCase(), c); callIndex.set(norm(c.name), c); }
audioFiles(CALL_DIR).forEach(f => {
  const base = f.replace(/\.mp3$/i, '');
  addCall({ id: slug(base), base, file: f, dir: CALL_DIR, name: CALL_FIXES[base] || flip(base), group: base.split(/\s+/)[0],
    appPath: 'media/calls/' + slug(base) + '.mp3', fgasa80: '', photo: '', bytes: fs.statSync(path.join(CALL_DIR, f)).size, source: 'Bird calls SA (447)' });
});
const originalCount = calls.length;
audioFiles(CALL_DIR_BIG).forEach(f => {
  const base = f.replace(/\.mp3$/i, '');
  if (BIG_SKIP.test(base) || BIG_ALIASES.includes(norm(base))) return;
  const name = bigName(base);
  if (callIndex.has(norm(name)) || callIndex.has(norm(base))) return; // already have it
  const id = 'b-' + slug(name);
  addCall({ id, base, file: f, dir: CALL_DIR_BIG, name, group: name.split(/\s+/).pop().replace(/^.*-/, ''),
    appPath: 'media/calls/' + id + '.mp3', fgasa80: '', photo: '', bytes: fs.statSync(path.join(CALL_DIR_BIG, f)).size, source: 'Trainer library (881)' });
});
const findCall = key => key ? (callIndex.get(key.toLowerCase()) || callIndex.get(norm(key)) || callIndex.get(norm(flip(key)))) : null;

const photoFiles = fs.readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).sort();
let unknownN = 0;
const birds = photoFiles.map(f => {
  const cleaned = cleanPhotoBase(f.replace(/\.jpe?g$/i, ''));
  const fix = PHOTO_FIXES[cleaned];
  let name, note = '', call;
  if (fix) { name = fix.name; note = fix.note || ''; call = fix.call ? findCall(fix.call) : null; if (fix.call && !call) throw new Error('Fix points at missing call: ' + fix.call); }
  else { name = flip(cleaned); call = findCall(cleaned); }
  if (!name) name = 'Unknown bird ' + (++unknownN);
  name = name.charAt(0).toUpperCase() + name.slice(1);
  const id = slug(name);
  if (call) { call.fgasa80 = 'Yes'; call.photo = 'media/birds/' + id + '.jpg'; }
  return {
    id, name, group: name.startsWith('Unknown') ? '' : (call ? call.group : cleaned.split(/\s+/)[0]),
    photoFile: f, photo: 'media/birds/' + id + '.jpg', callFile: call ? call.file : '', call: call ? call.appPath : '',
    bytes: call ? call.bytes : 0, active: name.startsWith('Unknown') ? 'No' : 'Yes', note,
  };
});

// ---------------- frogs ----------------
// Photos on the server, matched by hand to the call library's names.
const FROG_PHOTOS = {
  'Angolan Reed Frog.jpg': 'Angolan Reed Frog', 'Banded rubber frog.jpg': 'Banded Rubber Frog', 'Foam Nest Frog.jpg': 'Southern Foam Nest Frog',
  'Giant Bullfrog.jpg': 'Giant Bullfrog', "Muller's Platana.jpg": "Muller's Platanna", 'Rainfrog Bushveld CKGR0033.jpg': 'Bushveld Rain Frog (B. a. adspersus)',
  'Tremelo Sand Frog.jpg': 'Tremolo Sand Frog',
};
// "Prominent frogs of Botswana" in the manual (p75-76)
const PROMINENT_FROGS = ['Giant Bullfrog', 'Guttural Toad', 'Angolan Reed Frog', 'Banded Rubber Frog'];
const FROG_GROUPS = ['Squeaker', 'Tree Frog', 'Rain Frog', 'Pygmy Toad', 'Toad', 'Cascade Frog', 'Ghost Frog', 'Shovel-nosed Frog', 'Leaf-folding Frog',
  'Reed Frog', 'Lily Frog', 'Kassina', 'Rattling Frog', 'Rubber Frog', 'Puddle Frog', 'Ornate Frog', 'Grass Frog', 'Platanna', 'Chirping Frog', 'Moss Frog',
  'Caco', 'Micro Frog', 'Kloof Frog', 'Marsh Frog', 'River Frog', 'Riverer Frog', 'Bullfrog', 'Stream Frog', 'Sand Frog', 'Golden-backed Frog', 'Foam Nest Frog'];
const frogRaw = audioFiles(FROG_CALL_DIR).map(f => {
  const m = /^\d+\s+(.+?)\s+-\s+(.+)\.mp3$/i.exec(f);
  return m ? { file: f, name: m[1].replace('Riverer', 'River').replace('Agrus', 'Argus').replace('Rythmic', 'Rhythmic'), sci: m[2].trim() } : null;
}).filter(Boolean);
const frogs = frogRaw.map(r => {
  const dup = frogRaw.filter(x => x.name === r.name).length > 1;
  const name = dup ? `${r.name} (${r.sci})` : r.name;
  const id = 'f-' + slug(name);
  let group = (FROG_GROUPS.find(g => r.name.endsWith(g)) || 'Frog').replace(/ Frog$/, ' frogs').replace(/(Toad|Kassina|Caco|Platanna|Squeaker|Bullfrog)$/, '$1s');
  group = group.charAt(0) + group.slice(1).toLowerCase(); // "Pygmy toads", "Foam nest frogs"
  const photoFile = Object.keys(FROG_PHOTOS).find(k => FROG_PHOTOS[k] === name) || '';
  return { id, name, sci: r.sci, group, file: r.file, call: 'media/frogs/' + id + '.mp3', bytes: fs.statSync(path.join(FROG_CALL_DIR, r.file)).size,
    photoFile, photo: photoFile ? 'media/frogs/' + id + '.jpg' : '', prominent: PROMINENT_FROGS.includes(r.name) };
});
Object.values(FROG_PHOTOS).forEach(n => { if (!frogs.some(f => f.name === n)) throw new Error('Frog photo has no matching call: ' + n); });

// ---------------- write CSVs ----------------
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'app'), { recursive: true });
const birdRows = [['ID', 'Common name', 'Group', 'Module', 'Photo file (original)', 'Photo (app)', 'Call file (original)', 'Call (app)', 'Active', 'Notes / check', 'Extra fact (optional)']];
birds.forEach(b => birdRows.push([b.id, b.name, b.group, 'FGASA Savanna 80 Birds', b.photoFile, b.photo, b.callFile, b.call, b.active, b.note, '']));
fs.writeFileSync(path.join(ROOT, 'data', 'birds.csv'), csv(birdRows));
const callRows = [['ID', 'Common name', 'Group (file)', 'In FGASA 80?', 'Call file (original)', 'Call (app)', 'Photo (app)', 'Active', 'Source library']];
calls.forEach(c => callRows.push([c.id, c.name, c.group, c.fgasa80 || 'No', c.file, c.appPath, c.photo, 'Yes', c.source]));
fs.writeFileSync(path.join(ROOT, 'data', 'calls.csv'), csv(callRows));
const frogRows = [['ID', 'Common name', 'Scientific name', 'Group', 'Prominent (manual)', 'Call file (original)', 'Call (app)', 'Photo file (original)', 'Photo (app)']];
frogs.forEach(f => frogRows.push([f.id, f.name, f.sci, f.group, f.prominent ? 'Yes' : '', f.file, f.call, f.photoFile, f.photo]));
fs.writeFileSync(path.join(ROOT, 'data', 'frogs.csv'), csv(frogRows));

// ---------------- bird sets extracted from the presentations (tools/extract-pptx.ps1) ----------------
// One bird per slide: name + photo + call. A bird without a call on its slide gets one from the call library.
function pptxSet(id) {
  const file = path.join(ROOT, 'data', id + '.json');
  if (!fs.existsSync(file)) return [];
  const seen = new Set();
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')).filter(s => {
    const k = norm(s.name); if (seen.has(k)) return false; seen.add(k); return true; // e.g. Red-billed Spurfowl appears twice
  }).map(s => {
    let call = s.call, bytes = s.bytes || 0;
    if (!call) { const c = findCall(s.name) || findCall(s.name.replace(/^(African|Common) /, '')); if (c) { call = c.appPath; bytes = c.bytes; } }
    return { id: id.replace(/\d+$/, '') + '-' + slug(s.name), name: s.name, group: s.name.split(/\s+/).pop().replace(/^.*-/, ''), photo: s.photo, call, bytes };
  });
}
const prominent40 = pptxSet('prominent40');
const kwapa63 = pptxSet('kwapa63');

// ---------------- app data ----------------
// Item fields: id, name, group, photo, call, bytes, f (1 = in the module's "featured" set, e.g. FGASA 80 / prominent frogs)
const BW_FROGS = new Set(fs.existsSync(path.join(ROOT, 'data', 'botswana-frogs.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'botswana-frogs.json'), 'utf8')).names : []);
const appData = {
  generated: new Date().toISOString().slice(0, 10),
  modules: [
    { id: 'fgasa80', title: 'Bird photos (FGASA 80)', short: 'FGASA 80 savanna birds', subtitle: 'Photos and calls of the 80 core savanna birds',
      items: birds.filter(b => b.active === 'Yes').map(b => ({ id: b.id, name: b.name, group: b.group, photo: b.photo, call: b.call, bytes: b.bytes })) },
    { id: 'prominent40', title: '40 Prominent Birds (manual)', short: '40 Prominent (manual)', subtitle: 'The 40 prominent birds from the BQA presentation and manual', items: prominent40 },
    { id: 'kwapa63', title: 'Common Birds of Kwapa', short: 'Kwapa birds', subtitle: 'Birds of the Kwapa camp area, from the Kwapa bird call list', items: kwapa63 },
    { id: 'calls', title: 'Bird calls', subtitle: calls.length + ' calls - the full call library', featured: 'FGASA 80 birds only', defaultScope: 'featured',
      items: calls.map(c => { const o = { id: c.id, name: c.name, group: c.group, call: c.appPath, photo: c.photo, bytes: c.bytes }; if (c.fgasa80) o.f = 1; return o; }) },
    // frogs split into Botswana frogs (data/botswana-frogs.json) and other southern African frogs
    { id: 'frog-calls', title: 'Frog calls', subtitle: frogs.length + ' frog calls of southern Africa', featured: 'Botswana frogs', notFeatured: 'Other frogs (not in Botswana)', defaultScope: 'featured',
      items: frogs.map(f => { const o = { id: f.id, name: f.name, sci: f.sci, group: f.group, call: f.call, photo: f.photo, bytes: f.bytes }; if (BW_FROGS.has(f.name)) o.f = 1; return o; }) },
  ],
};

// ---------------- current bird names (Grant/Bernard 2026-11-17) ----------------
// Item ids stay the same so students keep their progress.
// The FGASA "Tropical Boubou" is the Swamp Boubou of the Okavango Delta, so its call moves to the Swamp Boubou recording.
const NAME_UPDATES = { 'Diederik Cuckoo': ['Dideric Cuckoo', 'Cuckoo'], 'Crested Francolin': ['Crested Spurfowl', 'Spurfowl'], 'Tropical Boubou': ['Swamp Boubou', 'Boubou'],
  'Long-legged Bustard': ['Black-bellied Bustard', 'Bustard'] }; // old name; the photo shows a male Black-bellied Bustard
const callById = id => appData.modules.find(m => m.id === 'calls').items.find(i => i.id === id);
appData.modules.forEach(m => m.items.forEach(i => {
  const u = NAME_UPDATES[i.name];
  if (!u) return;
  if (m.id === 'calls' && i.name === 'Tropical Boubou') return; // a real, separate species in the call library
  [i.name, i.group] = u;
  if (u[0] === 'Swamp Boubou' && m.id !== 'calls') { const c = callById('boubou-swamp'); if (c) { i.call = c.call; i.bytes = c.bytes; } }
  if (!i.call && m.id !== 'calls') { const c = appData.modules.find(x => x.id === 'calls').items.find(x => x.name === i.name); if (c) { i.call = c.call; i.bytes = c.bytes; } }
}));
// ---------------- species photo sets (tools/fetch-photos.js: free-licence iNaturalist photos) ----------------
// data/species-lists/<group>.json = the species, data/photos/<group>.json = the photo fetched for each one.
const PHOTO_GROUPS = { mammals: 'Mammals', reptiles: 'Reptiles', amphibians: 'Amphibians', arthropods: 'Arthropods', plants: 'Plants', astronomy: 'Sky objects' };
for (const [g, title] of Object.entries(PHOTO_GROUPS)) {
  const lf = path.join(ROOT, 'data', 'species-lists', g + '.json'), pf = path.join(ROOT, 'data', 'photos', g + '.json');
  if (!fs.existsSync(lf) || !fs.existsSync(pf)) continue;
  const photos = new Map(JSON.parse(fs.readFileSync(pf, 'utf8')).map(p => [p.name, p]));
  const items = JSON.parse(fs.readFileSync(lf, 'utf8').replace(/^﻿/, '')).map(s => {
    const p = photos.get(s.name);
    if (!p || !p.file || !fs.existsSync(path.join(ROOT, 'app', p.file))) return null;
    const o = { id: g + '-' + slug(s.name), name: s.name, sci: s.sci || undefined, group: s.group, photo: p.file, pb: fs.statSync(path.join(ROOT, 'app', p.file)).size,
      credit: p.credit, license: p.license, src: p.source };
    if (s.manual) { o.f = 1; if (s.page) o.page = s.page; }
    return o;
  }).filter(Boolean);
  if (items.length) appData.modules.push({ id: g + '-photos', title: title + ' photos', short: title, subtitle: `${items.length} ${title.toLowerCase()} of Botswana`,
    featured: 'In the manual', defaultScope: 'all', items });
}
// frog calls without a photo borrow the frog's species photo
{
  const fp = appData.modules.find(m => m.id === 'amphibians-photos'), fc = appData.modules.find(m => m.id === 'frog-calls');
  if (fp && fc) fc.items.forEach(i => { if (i.photo) return; const p = fp.items.find(x => norm(x.name) === norm(i.name)); if (p) Object.assign(i, { photo: p.photo, credit: p.credit, license: p.license, src: p.src }); });
}
// ---------------- bird levels: Beginner / Intermediate / Botswana (tools/make-bird-levels.js) ----------------
// They replace the separate FGASA 80 / BQA 40 / Kwapa lists in the app. Each item lists the old list items it came from
// ("was"), so the app can carry students' progress over.
{
  const lf = path.join(ROOT, 'data', 'bird-levels.json');
  if (fs.existsSync(lf)) {
    const levels = JSON.parse(fs.readFileSync(lf, 'utf8'));
    const old = ['prominent40', 'fgasa80', 'kwapa63'].map(id => appData.modules.find(m => m.id === id));
    const extraList = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'species-lists', 'birds-botswana.json'), 'utf8'));
    const pf = path.join(ROOT, 'data', 'photos', 'birds-botswana.json');
    const extraPhotos = new Map((fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : []).map(p => [p.name, p]));
    const callsMod = appData.modules.find(m => m.id === 'calls');
    const callByName = new Map(callsMod.items.map(c => [norm(c.name), c]));
    const make = (name, order) => {
      const k = norm(name), was = [];
      let src = null;
      for (const m of order.map(id => old.find(o => o.id === id))) {
        const it = m.items.find(i => norm(i.name) === k);
        if (it) { was.push(m.id + ':' + it.id); if (!src) src = it; }
      }
      for (const m of old) { const it = m.items.find(i => norm(i.name) === k); if (it && !was.includes(m.id + ':' + it.id)) was.push(m.id + ':' + it.id); }
      if (src) {
        const o = { id: 'b-' + slug(name), name: src.name, group: src.group, photo: src.photo, call: src.call, bytes: src.bytes, was };
        const c = callByName.get(k);
        if (c) { was.push('calls:' + c.id); if (!o.call) { o.call = c.call; o.bytes = c.bytes; } }
        return o;
      }
      const x = extraList.find(e => e.name === name), p = extraPhotos.get(name);
      if (!x || !p || !p.file) return null;
      const c = callByName.get(norm(x.call));
      return { id: 'b-' + slug(name), name, sci: x.sci, group: x.group, photo: p.file, credit: p.credit, license: p.license, src: p.source,
        call: c ? c.call : '', bytes: c ? c.bytes : 0, was: c ? ['calls:' + c.id] : undefined };
    };
    const build = (names, order) => names.map(n => make(n, order)).filter(Boolean);
    const beginner = build(levels.beginner, ['prominent40', 'fgasa80', 'kwapa63']);
    const intermediate = build(levels.intermediate, ['fgasa80', 'kwapa63', 'prominent40']);
    const aga = new Set([...levels.beginner, ...levels.intermediate].map(norm));
    const botswana = build(levels.botswana, ['fgasa80', 'prominent40', 'kwapa63']).map(i => (aga.has(norm(i.name)) ? Object.assign(i, { f: 1 }) : i));
    appData.modules.push(
      { id: 'birds-beginner', title: 'Birds - Beginner', short: 'Beginner', subtitle: 'The 40 prominent birds of the BQA list and manual', items: beginner },
      { id: 'birds-intermediate', title: 'Birds - Intermediate', short: 'Intermediate', subtitle: 'FGASA 80 birds (not in Beginner) and 20 common Kwapa birds', items: intermediate },
      { id: 'birds-botswana', title: 'Birds - Botswana', short: 'Botswana', subtitle: 'All AGA birds plus common Botswana birds with calls',
        featured: 'Beginner + Intermediate birds', defaultScope: 'all', items: botswana });
    // the call library's "featured" set becomes the Beginner + Intermediate birds
    callsMod.featured = 'Beginner + Intermediate birds';
    callsMod.items.forEach(c => { if (aga.has(norm(c.name))) c.f = 1; else delete c.f; });
    // the old separate lists are no longer shown (saved for tools/make-bird-levels.js and the sheet)
    fs.writeFileSync(path.join(ROOT, 'data', 'bird-lists-source.json'), JSON.stringify(old.map(m => ({ id: m.id, items: m.items.map(i => ({ id: i.id, name: i.name })) })), null, 1));
    appData.modules = appData.modules.filter(m => !['fgasa80', 'prominent40', 'kwapa63'].includes(m.id));
    console.log(`Bird levels: Beginner ${beginner.length}, Intermediate ${intermediate.length}, Botswana ${botswana.length}`);
  }
}
// Replacement photos (students' approved photos via tools/sync-photos.js, or any photo AGA wants to use instead).
// data/photo-overrides.json: { "<species name>": { "photo": "media/user/...jpg", "credit": "Name Surname", "license": "AGA" } }
{
  const of = path.join(ROOT, 'data', 'photo-overrides.json');
  const ov = fs.existsSync(of) ? JSON.parse(fs.readFileSync(of, 'utf8').replace(/^﻿/, '')) : {};
  appData.modules.forEach(m => m.items.forEach(i => {
    const o = ov[i.name];
    if (o && o.photo && fs.existsSync(path.join(ROOT, 'app', o.photo)) && (i.photo || m.id !== 'calls')) Object.assign(i, { photo: o.photo, credit: o.credit, license: o.license || 'AGA', src: o.src || '' });
  }));
}
{ // in the call library the FGASA flag and photo move from Tropical to Swamp Boubou
  const t = callById('boubou-tropical'), s = callById('boubou-swamp');
  if (t && s && t.f) { s.f = 1; s.photo = t.photo; delete t.f; t.photo = ''; }
}

// manual questions (data/questions.csv = export of the sheet's "Questions" tab)
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
const CHAPTER_PHOTO = { Birds: 'media/birds/african-scops-owl.jpg', Amphibians: 'media/frogs/f-angolan-reed-frog.jpg' };
function questionModules(includeDrafts) {
  const file = path.join(ROOT, 'data', 'questions.csv');
  if (!fs.existsSync(file)) return [];
  const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = n => head.indexOf(n);
  const qs = rows.map(r => ({
    id: r[col('ID')], chapter: r[col('Chapter')], group: r[col('Section')], page: r[col('Manual page')],
    q: r[col('Question')], a: r[col('Correct answer')], w: [r[col('Wrong 1')], r[col('Wrong 2')], r[col('Wrong 3')]].filter(Boolean),
    ex: r[col('Explanation')], status: (r[col('Status')] || 'Draft').trim(),
  })).filter(x => x.id && x.q && x.a && x.w.length >= 1)
    .filter(x => x.status === 'Approved' || (includeDrafts && x.status !== 'Rejected'));
  // manual chapter order (Birds/Amphibians first as they have their own subjects)
  const ORDER = ['Birds', 'Amphibians', 'Guiding Principles', 'Astronomy', 'Geology', 'Weather and Climate', 'Ecology', 'Plants', 'Arthropods', 'Reptiles', 'Mammals', 'Tourism and Legislation'];
  const rank = c => { const i = ORDER.indexOf(c); return i < 0 ? 99 : i; };
  return [...new Set(qs.map(x => x.chapter))].sort((a, b) => rank(a) - rank(b)).map(ch => {
    const items = qs.filter(x => x.chapter === ch).map(x => {
      const o = { id: x.id, q: x.q, a: x.a, w: x.w, ex: x.ex, group: x.group, page: x.page };
      if (x.status !== 'Approved') o.draft = true;
      return o;
    });
    return { id: 'q-' + slug(ch), kind: 'questions', chapter: ch, title: ch + ' - manual', photo: CHAPTER_PHOTO[ch] || '',
      subtitle: `${items.length} questions from the Botswana Guide Training Manual`, items };
  });
}
// Landscape photos (wider than about 3:2) are flagged "wide" so the app can use them for banners and subject tiles
// without cutting off heads (a tall or square photo cropped to a wide banner looks bad).
function jpegSize(file) {
  try {
    const b = fs.readFileSync(file);
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xFF) return null;
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  } catch (e) { /* not a readable jpeg */ }
  return null;
}
const sizeCache = {};
appData.modules.forEach(m => m.items.forEach(i => {
  if (!i.photo) return;
  const svgSize = f => { const m = /viewBox="0 0 (\d+) (\d+)"/.exec(fs.readFileSync(f, 'utf8').slice(0, 400)); return m ? { w: +m[1], h: +m[2] } : null; };
  const f = path.join(ROOT, 'app', i.photo);
  const s = sizeCache[i.photo] || (sizeCache[i.photo] = /\.svg$/.test(i.photo) ? svgSize(f) : jpegSize(f));
  if (s && s.w / s.h >= 1.45) i.wide = 1;
}));
// Download sizes shown in the app = the re-encoded files in app/media (tools/encode-audio.ps1), not the originals
appData.modules.forEach(m => m.items.forEach(i => {
  if (!i.call) return;
  const f = path.join(ROOT, 'app', i.call);
  if (fs.existsSync(f)) i.bytes = fs.statSync(f).size;
}));
// Species fact cards (data/species-info.csv = the sheet's "Species Info" tab), keyed by the species name used in the app
function speciesInfo(includeDrafts) {
  const file = path.join(ROOT, 'data', 'species-info.csv');
  if (!fs.existsSync(file)) return {};
  const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const col = n => head.indexOf(n);
  const out = {};
  rows.forEach(r => {
    const name = (r[col('Name')] || '').trim(), status = (r[col('Status')] || 'Draft').trim();
    if (!name || status === 'Rejected' || (status !== 'Approved' && !includeDrafts)) return;
    const o = {};
    [['size', 'Size'], ['habitat', 'Habitat'], ['food', 'Food'], ['breeding', 'Breeding'], ['titbit', 'Did you know']].forEach(([k, c]) => { const v = (r[col(c)] || '').trim(); if (v) o[k] = v; });
    if (!Object.keys(o).length) return;
    if (status !== 'Approved') o.draft = true;
    out[name] = o;
  });
  return out;
}
// The full southern African call library (897 calls) is only a source: in the app, bird calls come with each level.
if (appData.modules.some(m => m.id === 'birds-botswana')) appData.modules = appData.modules.filter(m => m.id !== 'calls');
const header = '// Generated by tools/build-data.js - do not edit by hand\n';
const draftsLive = process.env.DRAFTS_LIVE === '1';
const publicData = Object.assign({}, appData, { info: speciesInfo(draftsLive), modules: appData.modules.concat(questionModules(draftsLive)) });
fs.writeFileSync(path.join(ROOT, 'app', 'data.js'), header + 'window.AGA_DATA = ' + JSON.stringify(publicData, null, 1) + ';\n');
const previewData = Object.assign({}, appData, { preview: true, info: speciesInfo(true), modules: appData.modules.concat(questionModules(true)) });
fs.writeFileSync(path.join(ROOT, 'app', 'data-preview.js'), header + 'window.AGA_DATA = ' + JSON.stringify(previewData) + ';\n');

fs.writeFileSync(path.join(ROOT, 'data', 'media-plan.json'), JSON.stringify({
  photos: birds.map(b => ({ src: path.join(PHOTO_DIR, b.photoFile), dest: path.join(ROOT, 'app', b.photo) }))
    .concat(frogs.filter(f => f.photoFile).map(f => ({ src: path.join(FROG_PHOTO_DIR, f.photoFile), dest: path.join(ROOT, 'app', f.photo) }))),
  calls: calls.map(c => ({ src: path.join(c.dir, c.file), dest: path.join(ROOT, 'app', c.appPath) }))
    .concat(frogs.map(f => ({ src: path.join(FROG_CALL_DIR, f.file), dest: path.join(ROOT, 'app', f.call) }))),
}, null, 1));

console.log(`Birds: ${birds.length} photos (active ${birds.filter(b => b.active === 'Yes').length}), with call: ${birds.filter(b => b.call).length}`);
console.log(`Bird calls: ${calls.length} (${originalCount} original + ${calls.length - originalCount} added from trainer library), FGASA-linked: ${calls.filter(c => c.fgasa80).length}`);
console.log('FGASA birds still without a call:', birds.filter(b => !b.call && b.active === 'Yes').map(b => b.name).join('; '));
console.log(`40 Prominent: ${prominent40.length} birds (${prominent40.filter(b => b.call).length} with call); Kwapa: ${kwapa63.length} birds (${kwapa63.filter(b => b.call).length} with call)`);
console.log(`Frogs: ${frogs.length} calls, ${frogs.filter(f => f.photo).length} with photo, prominent: ${frogs.filter(f => f.prominent).map(f => f.name).join(', ')}`);
publicData.modules.filter(m => m.kind === 'questions').forEach(m => console.log(`Questions ${m.id}: ${m.items.length} public`));
const ids = publicData.modules.flatMap(m => m.items.map(i => m.id + '/' + i.id));
const dupes = ids.filter((v, i, a) => a.indexOf(v) !== i);
if (dupes.length) throw new Error('DUPLICATE IDS: ' + dupes.join(', '));
