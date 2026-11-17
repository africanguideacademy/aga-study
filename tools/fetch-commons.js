// Downloads the Wikimedia Commons image named in a species list ("commons": "File:...") - used for Astronomy,
// where iNaturalist has nothing. Only Public domain / CC0 / CC BY / CC BY-SA files are accepted.
//   input:  data/species-lists/<group>.json   [{name, group, manual, page, commons}]
//   output: app/media/<group>/<slug>-<pageid>.jpg  +  data/photos/<group>.json (same format as fetch-photos.js)
// Run:  node tools/fetch-commons.js astronomy        (only items whose Commons file changed are downloaded again)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const HEAD = { 'User-Agent': 'AGA-PocketGuide/1.0 (education; images with attribution)' };
const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const OK = /^(public domain|pd|cc0|cc[ -]by(-sa)?([ -][\d.]+)?)/i;
const FFMPEG = (() => {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && e.name === 'ffmpeg.exe') return p; if (e.isDirectory() && /ffmpeg|bin|build/i.test(e.name)) { const r = walk(p); if (r) return r; } } };
  try { return walk(base) || 'ffmpeg'; } catch { return 'ffmpeg'; }
})();
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Wikimedia limits automated clients: on a "too many requests" answer, wait and try again
async function get(url, kind) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: HEAD });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && (kind === 'json' ? ct.includes('json') : ct.startsWith('image/'))) return kind === 'json' ? r.json() : Buffer.from(await r.arrayBuffer());
    await sleep(15000 * (i + 1));
  }
  throw new Error('Wikimedia kept refusing: ' + url);
}

(async () => {
  const g = process.argv[2] || 'astronomy';
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'species-lists', g + '.json'), 'utf8').replace(/^﻿/, ''));
  const cf = path.join(ROOT, 'data', 'photos', g + '.json');
  const cache = new Map((fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : []).map(c => [c.name, c]));
  fs.mkdirSync(path.join(ROOT, 'app', 'media', g), { recursive: true });
  const problems = [];
  for (const s of list) {
    if (!s.commons) { problems.push(`${s.name}: no Commons file`); continue; }
    const prev = cache.get(s.name);
    if (prev && prev.commons === s.commons && fs.existsSync(path.join(ROOT, 'app', prev.file))) continue;
    const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1400&titles=${encodeURIComponent(s.commons)}`;
    const j = await get(u, 'json');
    const page = Object.values(j.query.pages)[0];
    const ii = page && page.imageinfo && page.imageinfo[0];
    if (!ii) { problems.push(`${s.name}: ${s.commons} not found`); continue; }
    const md = ii.extmetadata || {};
    const lic = strip(md.LicenseShortName && md.LicenseShortName.value);
    if (!OK.test(lic)) { problems.push(`${s.name}: licence "${lic}" not allowed`); continue; }
    const file = `media/${g}/${slug(s.name)}-${page.pageid}.jpg`;
    const tmp = path.join(ROOT, 'app', file + '.tmp');
    fs.writeFileSync(tmp, await get(ii.thumburl || ii.url, 'image'));
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-vf', "scale='min(900,iw)':-2", '-q:v', '5', path.join(ROOT, 'app', file)]);
    fs.unlinkSync(tmp);
    if (prev && prev.file !== file) { try { fs.unlinkSync(path.join(ROOT, 'app', prev.file)); } catch (e) { /* gone */ } }
    const artist = strip(md.Artist && md.Artist.value).slice(0, 80) || 'Wikimedia Commons';
    cache.set(s.name, { name: s.name, sci: '', file, commons: s.commons, license: /^(pd|public domain)/i.test(lic) ? 'Public domain' : lic,
      credit: artist, source: ii.descriptionurl, place: 'Wikimedia Commons' });
    console.log(`  ${s.name}: ${s.commons} (${lic})`);
    fs.writeFileSync(cf, JSON.stringify([...cache.values()], null, 1));
    await sleep(2500);
  }
  console.log(`${g}: ${[...cache.values()].length}/${list.length} have an image`);
  if (problems.length) console.log('Problems:\n  ' + problems.join('\n  '));
})().catch(e => { console.error(e); process.exit(1); });
