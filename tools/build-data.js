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

// ---------------- app data ----------------
// Item fields: id, name, group, photo, call, bytes, f (1 = in the module's "featured" set, e.g. FGASA 80 / prominent frogs)
const appData = {
  generated: new Date().toISOString().slice(0, 10),
  modules: [
    { id: 'fgasa80', title: 'Bird photos (FGASA 80)', subtitle: 'Photos and calls of the 80 core savanna birds',
      items: birds.filter(b => b.active === 'Yes').map(b => ({ id: b.id, name: b.name, group: b.group, photo: b.photo, call: b.call, bytes: b.bytes })) },
    { id: 'calls', title: 'Bird calls', subtitle: calls.length + ' calls - the full call library', featured: 'FGASA 80 birds only', defaultScope: 'featured',
      items: calls.map(c => { const o = { id: c.id, name: c.name, group: c.group, call: c.appPath, photo: c.photo, bytes: c.bytes }; if (c.fgasa80) o.f = 1; return o; }) },
    { id: 'frog-calls', title: 'Frog calls', subtitle: frogs.length + ' frog calls of southern Africa', featured: 'Prominent frogs (manual)', defaultScope: 'all',
      items: frogs.map(f => { const o = { id: f.id, name: f.name, sci: f.sci, group: f.group, call: f.call, photo: f.photo, bytes: f.bytes }; if (f.prominent) o.f = 1; return o; }) },
  ],
};

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
  return [...new Set(qs.map(x => x.chapter))].map(ch => {
    const items = qs.filter(x => x.chapter === ch).map(x => {
      const o = { id: x.id, q: x.q, a: x.a, w: x.w, ex: x.ex, group: x.group, page: x.page };
      if (x.status !== 'Approved') o.draft = true;
      return o;
    });
    return { id: 'q-' + slug(ch), kind: 'questions', title: ch + ' - manual', photo: CHAPTER_PHOTO[ch] || '',
      subtitle: `${items.length} questions from the Botswana Guide Training Manual`, items };
  });
}
const header = '// Generated by tools/build-data.js - do not edit by hand\n';
const draftsLive = process.env.DRAFTS_LIVE === '1';
const publicData = Object.assign({}, appData, { modules: appData.modules.concat(questionModules(draftsLive)) });
fs.writeFileSync(path.join(ROOT, 'app', 'data.js'), header + 'window.AGA_DATA = ' + JSON.stringify(publicData, null, 1) + ';\n');
const previewData = Object.assign({}, appData, { preview: true, modules: appData.modules.concat(questionModules(true)) });
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
console.log(`Frogs: ${frogs.length} calls, ${frogs.filter(f => f.photo).length} with photo, prominent: ${frogs.filter(f => f.prominent).map(f => f.name).join(', ')}`);
publicData.modules.filter(m => m.kind === 'questions').forEach(m => console.log(`Questions ${m.id}: ${m.items.length} public`));
const ids = publicData.modules.flatMap(m => m.items.map(i => m.id + '/' + i.id));
const dupes = ids.filter((v, i, a) => a.indexOf(v) !== i);
if (dupes.length) throw new Error('DUPLICATE IDS: ' + dupes.join(', '));
