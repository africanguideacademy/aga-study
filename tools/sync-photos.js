// Pulls the student photos a trainer has APPROVED (Status = Approved on the "Photos" tab of the
// "AGA Study App - Student Progress" sheet) into the app, replacing that species' photo.
//   - saves each photo to app/media/user/<species>-<id>.jpg (900 px wide)
//   - records it in data/photo-overrides.json, which tools/build-data.js applies to every list that has the species
//   - photos whose species name doesn't match a species in the app are listed so they can be renamed on the sheet
// Run:  node tools/sync-photos.js   then   node tools/build-data.js   then publish.
// To undo a replacement: delete its entry from data/photo-overrides.json (or set Status back to Rejected and delete it).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const URL_ = 'https://script.google.com/macros/s/AKfycbyJ3sijfiw4uparWC1Di-WnlNS7rl7-HzI6ACw2VhGJPtrzCqvwa4MiM8Wuf1iqcrWgZw/exec';
const slug = s => s.toLowerCase().replace(/['â€™]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const FFMPEG = (() => {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && e.name === 'ffmpeg.exe') return p; if (e.isDirectory() && /ffmpeg|bin|build/i.test(e.name)) { const r = walk(p); if (r) return r; } } };
  try { return walk(base) || 'ffmpeg'; } catch { return 'ffmpeg'; }
})();

(async () => {
  global.window = {};
  require(path.join(ROOT, 'app', 'data.js'));
  const names = new Map();
  window.AGA_DATA.modules.filter(m => m.kind !== 'questions').forEach(m => m.items.forEach(i => names.set(norm(i.name), i.name)));
  const of = path.join(ROOT, 'data', 'photo-overrides.json');
  const ov = fs.existsSync(of) ? JSON.parse(fs.readFileSync(of, 'utf8').replace(/^ï»¿/, '')) : {};
  const done = new Set(Object.values(ov).map(o => o.fileId).filter(Boolean));
  const list = await (await fetch(URL_ + '?action=photos')).json();
  if (!list.ok) throw new Error('Could not read the approved photo list: ' + JSON.stringify(list));
  fs.mkdirSync(path.join(ROOT, 'app', 'media', 'user'), { recursive: true });
  let added = 0; const unmatched = [];
  for (const p of list.photos) {
    if (done.has(p.fileId)) continue;
    const name = names.get(norm(p.species));
    if (!name) { unmatched.push(`${p.species} (by ${p.credit}) - no species with this name in the app; correct the Species cell on the sheet`); continue; }
    const j = await (await fetch(`${URL_}?action=photo&id=${encodeURIComponent(p.fileId)}`)).json();
    if (!j.ok) { unmatched.push(`${p.species}: ${j.error}`); continue; }
    const file = `media/user/${slug(name)}-${p.fileId.slice(0, 8)}.jpg`;
    const tmp = path.join(ROOT, 'app', file + '.tmp');
    fs.writeFileSync(tmp, Buffer.from(j.b64, 'base64'));
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-vf', "scale='min(900,iw)':-2", '-q:v', '5', path.join(ROOT, 'app', file)]);
    fs.unlinkSync(tmp);
    ov[name] = { photo: file, credit: `${p.credit} (AGA)`, license: 'AGA', fileId: p.fileId };
    added++;
    console.log(`  ${name}: photo by ${p.credit}`);
  }
  fs.writeFileSync(of, JSON.stringify(ov, null, 1));
  console.log(`${added} new approved photo(s) added; ${Object.keys(ov).length} replacement photo(s) in total.`);
  if (unmatched.length) console.log('Not used:\n  ' + unmatched.join('\n  '));
})().catch(e => { console.error(e.message); process.exit(1); });
