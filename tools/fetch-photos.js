// Fetches one free-licence photo per species from iNaturalist (research-grade observations, Botswana first).
// Only CC0, CC BY and CC BY-SA photos are used: they allow AGA's use with a credit line. NC (non-commercial) photos are skipped.
//
//   input:  data/species-lists/<group>.json   [{name, sci, group, manual, page}]
//   output: app/media/<group>/<slug>.jpg      (resized to 900 px wide)
//           data/photos/<group>.json          [{name, sci, file, license, credit, source, place}]  (cache: species already done are skipped)
//
// Run:  node tools/fetch-photos.js [group ...]       (no group = all lists)
//       node tools/fetch-photos.js mammals --redo "Impala"   (fetch a different photo for one species: skips the photo used now)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const API = 'https://api.inaturalist.org/v1';
const BOTSWANA = 7105, AFRICA = 97392;
const OK = ['cc0', 'cc-by', 'cc-by-sa'];
const HEAD = { 'User-Agent': 'AGA-PocketGuide/1.0 (education; species photos with attribution)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const FFMPEG = (() => {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && e.name === 'ffmpeg.exe') return p; if (e.isDirectory() && /ffmpeg|bin|build/i.test(e.name)) { const r = walk(p); if (r) return r; } } };
  try { return walk(base) || 'ffmpeg'; } catch { return 'ffmpeg'; }
})();

let last = 0;
async function api(url) {
  const wait = 1100 - (Date.now() - last); if (wait > 0) await sleep(wait); // stay well under iNaturalist's rate limit
  last = Date.now();
  for (let i = 0; i < 3; i++) {
    const r = await fetch(API + url, { headers: HEAD });
    if (r.ok) return r.json();
    await sleep(3000 * (i + 1));
  }
  throw new Error('API failed: ' + url);
}
async function taxonId(sci) {
  const j = await api(`/taxa?q=${encodeURIComponent(sci)}&per_page=10`);
  const exact = j.results.find(t => t.name.toLowerCase() === sci.toLowerCase())
    || j.results.find(t => (t.matched_term || '').toLowerCase() === sci.toLowerCase()); // an older name (synonym) that iNaturalist knows
  return exact ? exact.id : null;
}
// Leave out observations annotated as dead, or as tracks, scat, bones, moults, galls, eggs, hair, leaf mines or nests
const ANY_SHAPE = process.argv.includes('--best'); // --best: take the most-liked photo, whatever its shape (birds are often far away in wide shots)
const NOT_ALIVE = '19,25,26,27,28,29,30,31,32,35';
async function findPhoto(tid, skip) {
  for (const place of [BOTSWANA, AFRICA, null]) {
    const q = `/observations?taxon_id=${tid}&quality_grade=research&photo_license=${OK.join(',')}&without_term_value_id=${NOT_ALIVE}&order_by=votes&per_page=30${place ? '&place_id=' + place : ''}`;
    const j = await api(q);
    const cands = [];
    for (const o of j.results) for (const p of (o.photos || []).slice(0, 1)) { // an observation's first photo is usually its best
      if (OK.includes(p.license_code) && !skip.has(p.id)) cands.push({ o, p });
    }
    if (!cands.length) continue;
    // prefer a landscape photo (fits the app's tiles and banners), else the most-voted one
    const dims = c => (c.p.original_dimensions || {});
    const best = (ANY_SHAPE ? null : cands.find(c => dims(c).width >= 1.3 * dims(c).height && dims(c).width >= 800)) || cands[0];
    return Object.assign(best, { place: place === BOTSWANA ? 'Botswana' : place === AFRICA ? 'Africa' : 'elsewhere' });
  }
  return null;
}
async function download(url, out) {
  const r = await fetch(url, { headers: HEAD });
  if (!r.ok) throw new Error('download ' + r.status);
  const tmp = out + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-vf', "scale='min(900,iw)':-2", '-q:v', '5', out]);
  fs.unlinkSync(tmp);
}
const LICENSE = { 'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA' };

(async () => {
  const args = process.argv.slice(2);
  const redo = args.includes('--redo') ? args[args.indexOf('--redo') + 1] : null;
  const groups = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--redo');
  const listDir = path.join(ROOT, 'data', 'species-lists');
  const todo = groups.length ? groups : fs.readdirSync(listDir).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
  fs.mkdirSync(path.join(ROOT, 'data', 'photos'), { recursive: true });
  for (const g of todo) {
    const list = JSON.parse(fs.readFileSync(path.join(listDir, g + '.json'), 'utf8').replace(/^﻿/, ''));
    const cacheFile = path.join(ROOT, 'data', 'photos', g + '.json');
    const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : [];
    const byName = new Map(cache.map(c => [c.name, c]));
    fs.mkdirSync(path.join(ROOT, 'app', 'media', g), { recursive: true });
    let got = 0, missing = [];
    for (const s of list) {
      const prev = byName.get(s.name);
      // --refresh refetches every species; with --resume it skips photos already fetched in the last 40 minutes
      const fresh = prev && prev.file && args.includes('--resume') && fs.existsSync(path.join(ROOT, 'app', prev.file))
        && Date.now() - fs.statSync(path.join(ROOT, 'app', prev.file)).mtimeMs < 40 * 60e3;
      if (prev && prev.file && s.name !== redo && (!args.includes('--refresh') || fresh)) continue;
      try {
        const tid = await taxonId(s.sci);
        if (!tid) { missing.push(`${s.name} (${s.sci}): not found on iNaturalist`); continue; }
        const skip = new Set(prev && prev.photoId && s.name === redo ? [prev.photoId] : []);
        const hit = await findPhoto(tid, skip);
        if (!hit) { missing.push(`${s.name} (${s.sci}): no CC0/CC BY photo`); continue; }
        // the photo id is part of the file name: a new photo gets a new address, so phones that saved the old one show the new one
        const file = `media/${g}/${slug(s.name)}-${hit.p.id}.jpg`;
        await download(hit.p.url.replace(/\/square\./, '/large.'), path.join(ROOT, 'app', file));
        if (prev && prev.file && prev.file !== file) { try { fs.unlinkSync(path.join(ROOT, 'app', prev.file)); } catch (e) { /* already gone */ } }
        byName.set(s.name, {
          name: s.name, sci: s.sci, file, photoId: hit.p.id, license: LICENSE[hit.p.license_code],
          credit: (hit.p.attribution || '').replace(/^\(c\)\s*/i, '© ').replace(/,? ?(some|all) rights reserved.*$|,? ?no rights reserved.*$/i, '').trim() || hit.o.user.login,
          source: `https://www.inaturalist.org/observations/${hit.o.id}`, place: hit.place,
        });
        got++;
        process.stdout.write(`  ${g}: ${s.name} (${hit.place})\n`);
        fs.writeFileSync(cacheFile, JSON.stringify([...byName.values()], null, 1)); // save as we go (resumable)
      } catch (e) { missing.push(`${s.name}: ${e.message}`); }
    }
    console.log(`${g}: ${got} new photos, ${[...byName.values()].filter(c => c.file).length}/${list.length} have a photo`);
    if (missing.length) console.log('  missing:\n   ' + missing.join('\n   '));
  }
})();
