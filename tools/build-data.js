// Scans the bird photo + bird call folders, builds the bird list,
// matches photos to calls, and writes:
//   data/birds.csv, data/calls.csv   (to load into the Google Sheet)
//   app/data.js                      (what the study app reads)
//   data/media-plan.json             (which files to copy / resize)
// Run:  node tools/build-data.js
const fs = require('fs');
const path = require('path');

const PHOTO_DIR = 'Y:\\TRAINING\\TRAINING MATERIALS\\AGA HARD DRIVE\\Nature Guide Course\\Birds\\FGASA Birds\\FGASA Savanah 80 Birds';
const CALL_DIR = 'Y:\\TRAINING\\TRAINING MATERIALS\\BIRD COURSE\\Bird calls Southern Africa';
const ROOT = path.join(__dirname, '..');

// Photo file name (cleaned) -> correct common name + matching call file (or '' if none in the collection).
// Anything not listed here uses the default rule: "Group Rest" -> "Rest Group", call = same name.
const PHOTO_FIXES = {
  'Buffalo-Weaver Red-billed': { name: 'Red-billed Buffalo-Weaver', call: 'Weaver Red-billed Buffalo' },
  'Bush Shrike Orange-breasted': { name: 'Orange-breasted Bush-Shrike', call: 'Bushshrike Orange-breasted' },
  'Bustard Long-legged': { name: 'Long-legged Bustard', call: '', note: 'Check species name - no "Long-legged Bustard" in SA lists' },
  'Buttonquail Kurrichane': { name: 'Kurrichane Buttonquail', call: '' },
  'Cameroptera Grey-backed': { name: 'Grey-backed Camaroptera', call: 'Camaroptera Grey-backed', note: 'File name misspelt (Cameroptera)' },
  "Chat Arnott's": { name: "Arnot's Chat", call: "Chat Arnot's" },
  'Courser Temminks': { name: "Temminck's Courser", call: '' },
  'Dove Emerald Spotted': { name: 'Emerald-spotted Wood-Dove', call: '' },
  'Flycatcher Black': { name: 'Southern Black Flycatcher', call: 'Flycatcher Southern Black' },
  'Flycatcher Grey-Tit': { name: 'Grey Tit-Flycatcher', call: 'Flycatcher Grey Tit' },
  'Goose Pygmy': { name: 'African Pygmy Goose', call: '' },
  'Goshawk Dark-Chanting': { name: 'Dark Chanting Goshawk', call: '' },
  'Hawk Eagle African': { name: 'African Hawk-Eagle', call: '' },
  "Helmet-Shrike Retz's": { name: "Retz's Helmet-Shrike", call: "Helmetshrike Retz's" },
  'Kingfisher Pygmy': { name: 'African Pygmy Kingfisher', call: '' },
  'Mourning Dove': { name: 'African Mourning Dove', call: '' },
  'Nightjar Pennant-winged in progress': { name: 'Pennant-winged Nightjar', call: 'Nightjar Pennant-winged', note: 'File name says "in progress"' },
  "Owl Pel's Fishing": { name: "Pel's Fishing-Owl", call: "Owl Pel's Fishing" },
  'Owl Scops': { name: 'African Scops-Owl', call: 'Owl African Scops' },
  'Owl White-faced': { name: 'Southern White-faced Owl', call: 'Owl Southern White-faced' },
  'Owlet Barred': { name: 'African Barred Owlet', call: 'Owlet African Barred' },
  'Palmthrush Collared': { name: 'Collared Palm-Thrush', call: 'Palm-Thrush Collared' },
  'Parrot Meyers': { name: "Meyer's Parrot", call: '' },
  'Penduline-Tit Grey': { name: 'Grey Penduline-Tit', call: 'Tit Grey Penduline' },
  'Pigeon Green': { name: 'African Green Pigeon', call: 'Pigeon African Green' },
  'Robin Eastern Bearded Scrub': { name: 'Eastern Bearded Scrub-Robin', call: 'Scrub-Robin Eastern Bearded' },
  'Roller Broadbilled': { name: 'Broad-billed Roller', call: 'Roller Broad-billed' },
  "Starling Meeve's": { name: "Meves's Starling", call: "Starling Meves's" },
  'Waxbill Violet eared': { name: 'Violet-eared Waxbill', call: 'Waxbill Violet-eared' },
  'Publication': { name: '', call: '', note: 'Unknown bird - file named "Publication"; please identify' },
};

// Call file name -> correct common name, where the default rule gets it wrong.
const CALL_FIXES = {
  'Hawk Cuckoo': 'African Cuckoo-Hawk',
  'Nightingale Thrush': 'Thrush Nightingale',
  'Lark Fawncoloured 2': 'Fawn-coloured Lark (2nd recording)',
  'Bittern': 'Eurasian Bittern',
  'Wood Hoopoe Violet': 'Violet Wood-Hoopoe',
  'Owl African Scops': 'African Scops-Owl',
  "Owl Pel's Fishing": "Pel's Fishing-Owl",
  'Weaver Red-billed Buffalo': 'Red-billed Buffalo-Weaver',
  'Barbet Yellow-fronted Tinker': 'Yellow-fronted Tinkerbird',
  'Barbet Yellow-rumped Tinker': 'Yellow-rumped Tinkerbird',
  'Flycatcher Black and White Shrike': 'Black-and-white Shrike-Flycatcher',
  'Flycatcher Grey Tit': 'Grey Tit-Flycatcher',
  'Tit Grey Penduline': 'Grey Penduline-Tit',
  'Tit Cape Penduline': 'Cape Penduline-Tit',
  'Pigeon African Green': 'African Green Pigeon',
};

const SINGLE = new Set(['Bokmakierie', 'Brubru', 'Chaffinch', 'Neddicky', 'Rockrunner', 'Shikra']);

function flip(raw) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2 || SINGLE.has(raw)) return raw;
  const group = parts.shift();
  return parts.join(' ') + ' ' + group;
}
function cleanPhotoBase(base) {
  return base.replace(/-Edit$/i, '').replace(/[\s_-]*\d[\d_\-]*$/, '').trim();
}
function slug(s) {
  return s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function csv(rows) {
  return rows.map(r => r.map(v => {
    v = v == null ? '' : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',')).join('\r\n') + '\r\n';
}

// ---- calls ----
const callFiles = fs.readdirSync(CALL_DIR).filter(f => /\.mp3$/i.test(f)).sort();
const callByBase = new Map();
const calls = callFiles.map(f => {
  const base = f.replace(/\.mp3$/i, '');
  const name = CALL_FIXES[base] || flip(base);
  const c = { id: slug(base), base, file: f, name, group: base.split(/\s+/)[0], appPath: 'media/calls/' + slug(base) + '.mp3', fgasa80: '', photo: '', bytes: fs.statSync(path.join(CALL_DIR, f)).size };
  callByBase.set(base.toLowerCase(), c);
  return c;
});

// ---- photos / birds ----
const photoFiles = fs.readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).sort();
let unknownN = 0;
const birds = photoFiles.map(f => {
  const cleaned = cleanPhotoBase(f.replace(/\.jpe?g$/i, ''));
  const fix = PHOTO_FIXES[cleaned];
  let name, callBase, note = '';
  if (fix) { name = fix.name; callBase = fix.call; note = fix.note || ''; }
  else { name = flip(cleaned); callBase = cleaned; }
  if (!name) name = 'Unknown bird ' + (++unknownN);
  name = name.charAt(0).toUpperCase() + name.slice(1);
  const call = callBase ? callByBase.get(callBase.toLowerCase()) : null;
  if (callBase && !call && !fix) callBase = '';
  if (fix && fix.call && !call) throw new Error('Fix points at missing call: ' + fix.call);
  const id = slug(name);
  if (call) { call.fgasa80 = 'Yes'; call.photo = 'media/birds/' + id + '.jpg'; }
  return {
    id, name, group: name.startsWith('Unknown') ? '' : (call ? call.group : cleaned.split(/\s+/)[0]),
    photoFile: f, photo: 'media/birds/' + id + '.jpg',
    callFile: call ? call.file : '', call: call ? call.appPath : '',
    active: name.startsWith('Unknown') ? 'No' : 'Yes', note,
  };
});

// ---- write outputs ----
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'app'), { recursive: true });

const birdRows = [['ID', 'Common name', 'Group', 'Module', 'Photo file (original)', 'Photo (app)', 'Call file (original)', 'Call (app)', 'Active', 'Notes / check', 'Extra fact (optional)']];
birds.forEach(b => birdRows.push([b.id, b.name, b.group, 'FGASA Savanna 80 Birds', b.photoFile, b.photo, b.callFile, b.call, b.active, b.note, '']));
fs.writeFileSync(path.join(ROOT, 'data', 'birds.csv'), csv(birdRows));

const callRows = [['ID', 'Common name', 'Group (file)', 'In FGASA 80?', 'Call file (original)', 'Call (app)', 'Photo (app)', 'Active']];
calls.forEach(c => callRows.push([c.id, c.name, c.group, c.fgasa80 || 'No', c.file, c.appPath, c.photo, 'Yes']));
fs.writeFileSync(path.join(ROOT, 'data', 'calls.csv'), csv(callRows));

const appData = {
  generated: new Date().toISOString().slice(0, 10),
  modules: [
    { id: 'fgasa80', title: 'FGASA Savanna 80 Birds', subtitle: 'Photos and calls of the 80 core savanna birds',
      items: birds.filter(b => b.active === 'Yes').map(b => {
        const c = b.callFile ? calls.find(x => x.file === b.callFile) : null;
        return { id: b.id, name: b.name, group: b.group, photo: b.photo, call: b.call, bytes: c ? c.bytes : 0 };
      }) },
    { id: 'calls', title: 'Bird Calls of Southern Africa', subtitle: calls.length + ' calls - the full call library',
      items: calls.map(c => ({ id: c.id, name: c.name, group: c.group, call: c.appPath, photo: c.photo, bytes: c.bytes })) },
  ],
};
// ---- manual questions (data/questions.csv = export of the sheet's "Questions" tab) ----
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
const CHAPTER_PHOTO = { Birds: 'media/birds/african-scops-owl.jpg' };
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
  const chapters = [...new Set(qs.map(x => x.chapter))];
  return chapters.map(ch => {
    const items = qs.filter(x => x.chapter === ch).map(x => {
      const o = { id: x.id, q: x.q, a: x.a, w: x.w, ex: x.ex, group: x.group, page: x.page };
      if (x.status !== 'Approved') o.draft = true;
      return o;
    });
    return { id: 'q-' + slug(ch), kind: 'questions', title: ch + ' - manual questions', photo: CHAPTER_PHOTO[ch] || '',
      subtitle: `${items.length} questions from the Botswana Guide Training Manual`, items };
  });
}
const header = '// Generated by tools/build-data.js - do not edit by hand\n';
const publicData = Object.assign({}, appData, { modules: appData.modules.concat(questionModules(false)) });
fs.writeFileSync(path.join(ROOT, 'app', 'data.js'), header + 'window.AGA_DATA = ' + JSON.stringify(publicData, null, 1) + ';\n');
// Preview build (adds Draft questions) - loaded only when the app is opened with ?preview
const previewData = Object.assign({}, appData, { preview: true, modules: appData.modules.concat(questionModules(true)) });
fs.writeFileSync(path.join(ROOT, 'app', 'data-preview.js'), header + 'window.AGA_DATA = ' + JSON.stringify(previewData) + ';\n');
publicData.modules.concat(previewData.modules).filter(m => m.kind === 'questions').forEach(m =>
  console.log(`Questions module ${m.id}: ${m.items.length} (${m.items.some(i => i.draft) ? 'preview' : 'public'})`));

fs.writeFileSync(path.join(ROOT, 'data', 'media-plan.json'), JSON.stringify({
  photos: birds.map(b => ({ src: path.join(PHOTO_DIR, b.photoFile), dest: path.join(ROOT, 'app', b.photo) })),
  calls: calls.map(c => ({ src: path.join(CALL_DIR, c.file), dest: path.join(ROOT, 'app', c.appPath) })),
}, null, 1));

const withCall = birds.filter(b => b.call).length;
console.log(`Birds: ${birds.length} (active ${birds.filter(b => b.active === 'Yes').length}), with call: ${withCall}`);
console.log(`Calls: ${calls.length}, linked to FGASA 80: ${calls.filter(c => c.fgasa80).length}`);
console.log('Birds without a call:', birds.filter(b => !b.call && b.active === 'Yes').map(b => b.name).join('; '));
console.log('Notes:', birds.filter(b => b.note).map(b => b.photoFile + ' -> ' + b.note).join('\n  '));
const dupes = birds.map(b => b.id).filter((v, i, a) => a.indexOf(v) !== i);
if (dupes.length) console.log('DUPLICATE IDS:', dupes);
