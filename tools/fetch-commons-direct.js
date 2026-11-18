// Fallback for tools/fetch-commons.js when Wikimedia's lookup service is rate-limiting us: downloads each listed
// Commons file straight from the thumbnail server (the address is worked out from the file name, no lookup needed).
// The licence was already checked when the list was made; the photographer's name is filled in later by running
// tools/fetch-commons.js again (it only re-downloads items whose Commons file changed, and updates credits).
// Run:  node tools/fetch-commons-direct.js geology
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const HEAD = { 'User-Agent': 'AGA-PocketGuide/1.0 (education; images with attribution)' };
const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FFMPEG = (() => {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && e.name === 'ffmpeg.exe') return p; if (e.isDirectory() && /ffmpeg|bin|build/i.test(e.name)) { const r = walk(p); if (r) return r; } } };
  try { return walk(base) || 'ffmpeg'; } catch { return 'ffmpeg'; }
})();
(async () => {
  const g = process.argv[2];
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'species-lists', g + '.json'), 'utf8').replace(/^﻿/, ''));
  const cf = path.join(ROOT, 'data', 'photos', g + '.json');
  const cache = new Map((fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : []).map(c => [c.name, c]));
  fs.mkdirSync(path.join(ROOT, 'app', 'media', g), { recursive: true });
  const fails = [];
  for (const s of list) {
    const prev = cache.get(s.name);
    if (prev && (prev.chart || (prev.commons === s.commons && fs.existsSync(path.join(ROOT, 'app', prev.file))))) continue;
    const name = s.commons.replace(/^File:/, '').replace(/ /g, '_');
    const h = crypto.createHash('md5').update(name).digest('hex');
    const enc = encodeURIComponent(name);
    const id = h.slice(0, 10);
    const file = `media/${g}/${slug(s.name)}-${id}.jpg`;
    let ok = false;
    for (const w of [1280, 960, 800, 640, 500, 330]) {
      const url = `https://thumb.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${enc}/${w}px-${enc}${/\.(svg|tiff?)$/i.test(name) ? '.png' : ''}`;
      const r = await fetch(url, { headers: HEAD });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        const tmp = path.join(ROOT, 'app', file + '.tmp');
        fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
        execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-vf', "scale='min(900,iw)':-2", '-q:v', '5', path.join(ROOT, 'app', file)]);
        fs.unlinkSync(tmp);
        ok = true; break;
      }
      await sleep(300);
    }
    if (!ok) { fails.push(s.name); continue; }
    if (prev && prev.file && prev.file !== file) { try { fs.unlinkSync(path.join(ROOT, 'app', prev.file)); } catch (e) { /* gone */ } }
    cache.set(s.name, { name: s.name, sci: '', file, commons: s.commons, license: 'see source', credit: 'Wikimedia Commons (photographer named on the source page)',
      source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(s.commons.replace(/ /g, '_')), place: 'Wikimedia Commons', needsCredit: true });
    fs.writeFileSync(cf, JSON.stringify([...cache.values()], null, 1));
    process.stdout.write(`  ${s.name}\n`);
    await sleep(400);
  }
  console.log(`${g}: ${[...cache.values()].length}/${list.length} have an image${fails.length ? '; failed: ' + fails.join(', ') : ''}`);
})();
