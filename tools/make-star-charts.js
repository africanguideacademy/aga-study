// Draws AGA's own animated star charts (SVG) for the Astronomy constellations and stars, from open star data:
//   data/stars/*.json = d3-celestial (Olaf Frohn, BSD licence; star positions/brightness from Hipparcos)
// The chart shows the sky as seen when you look up (north at the top, east on the left), stars sized by brightness and
// coloured by temperature, the constellation lines drawing themselves in, bright stars twinkling, and the item's
// star(s) circled. The item's own name is never printed on its chart, so the chart can be used in quizzes.
//   output: app/media/astronomy/chart-<slug>-<version>.svg  and the chart entries in data/photos/astronomy.json
// Run:  node tools/make-star-charts.js      (then node tools/build-data.js)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const VERSION = 'v2'; // bump when the drawing changes, so phones fetch the new charts
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stars', f), 'utf8'));
const STARS = D('stars.6.json').features, LINES = D('constellations.lines.json').features, NAMES = D('starnames.json');
const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hip = name => Number(Object.keys(NAMES).find(k => NAMES[k].name === name));
const starBy = id => STARS.find(s => s.id === id);

// Which constellations to draw, which stars to circle, which (other) stars to name, and extra points to fit in the frame.
const CHARTS = {
  'Southern Cross (Crux)': { draw: ['Cru', 'Cen'], fit: ['Cru'], fitStars: ['Rigil Kentaurus', 'Hadar'], bold: ['Cru'], label: ['Acrux', 'Mimosa', 'Gacrux'] },
  'The Pointers': { draw: ['Cru', 'Cen'], fit: ['Cru'], fitStars: ['Rigil Kentaurus', 'Hadar'], ring: ['Rigil Kentaurus', 'Hadar'], label: ['Acrux', 'Gacrux'] },
  'Alpha Centauri': { draw: ['Cen', 'Cru'], fit: ['Cru'], fitStars: ['Rigil Kentaurus', 'Hadar'], ring: ['Rigil Kentaurus'], label: ['Hadar', 'Acrux'] },
  'Orion': { draw: ['Ori'], fit: ['Ori'], bold: ['Ori'], label: ['Betelgeuse', 'Rigel', 'Bellatrix', 'Saiph'] },
  "Orion's Belt (Three Kings)": { draw: ['Ori'], fit: ['Ori'], ring: ['Alnitak', 'Alnilam', 'Mintaka'], label: ['Betelgeuse', 'Rigel'] },
  'Betelgeuse': { draw: ['Ori'], fit: ['Ori'], ring: ['Betelgeuse'], label: ['Rigel', 'Bellatrix'] },
  'Rigel': { draw: ['Ori'], fit: ['Ori'], ring: ['Rigel'], label: ['Betelgeuse', 'Saiph'] },
  'Canis Major': { draw: ['CMa'], fit: ['CMa'], bold: ['CMa'], label: ['Sirius', 'Adhara'] },
  'Sirius': { draw: ['CMa', 'Ori'], fit: ['CMa', 'Ori'], ring: ['Sirius'], label: ['Betelgeuse', 'Rigel'] },
  'Procyon': { draw: ['CMi', 'CMa', 'Ori'], fit: ['CMi', 'CMa', 'Ori'], ring: ['Procyon'], label: ['Sirius', 'Betelgeuse'] },
  'Carina': { draw: ['Car'], fit: ['Car'], bold: ['Car'], label: ['Canopus', 'Miaplacidus'] },
  'Canopus': { draw: ['Car', 'CMa'], fit: ['Car'], fitStars: ['Sirius'], ring: ['Canopus'], label: ['Sirius'] },
  'Scorpius': { draw: ['Sco'], fit: ['Sco'], bold: ['Sco'], label: ['Antares', 'Shaula'] },
  'Antares': { draw: ['Sco'], fit: ['Sco'], ring: ['Antares'], label: ['Shaula'] },
  'Taurus': { draw: ['Tau'], fit: ['Tau'], bold: ['Tau'], label: ['Aldebaran', 'Elnath'], pleiades: true },
  'Aldebaran': { draw: ['Tau', 'Ori'], fit: ['Tau'], ring: ['Aldebaran'], label: ['Elnath'], pleiades: true },
  'Leo': { draw: ['Leo'], fit: ['Leo'], bold: ['Leo'], label: ['Regulus', 'Denebola'] },
  'Polaris (North Star)': { draw: ['UMi', 'UMa'], fit: ['UMi', 'UMa'], ring: ['Polaris'], label: [] },
};

const W = 1200, H = 800, PAD = 110, rad = d => d * Math.PI / 180;
const vec = ([lon, lat]) => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];
function makeProjection(points) {
  const m = points.map(vec).reduce((a, v) => a.map((x, i) => x + v[i]), [0, 0, 0]);
  const l0 = Math.atan2(m[1], m[0]), p0 = Math.atan2(m[2], Math.hypot(m[0], m[1]));
  const raw = ([lon, lat]) => {
    const l = rad(lon), p = rad(lat), c = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0);
    if (c < -0.2) return null; // far side of the sky
    const k = 2 / (1 + c);
    return [-k * Math.cos(p) * Math.sin(l - l0), -k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0))];
  };
  const xy = points.map(raw).filter(Boolean);
  const [x0, x1, y0, y1] = [Math.min(...xy.map(p => p[0])), Math.max(...xy.map(p => p[0])), Math.min(...xy.map(p => p[1])), Math.max(...xy.map(p => p[1]))];
  const s = Math.min((W - 2 * PAD) / (x1 - x0 || 1e-3), (H - 2 * PAD) / (y1 - y0 || 1e-3));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // From Botswana (about 20° south) you face NORTH to see stars north of about -10° declination, and they appear
  // "upside down" compared with northern star maps: south at the top, east on the right. Stars far south are seen
  // facing south (north at the top, east on the left); the band in between passes high overhead.
  const dec = p0 * 180 / Math.PI;
  const view = dec > -10 ? 'north' : dec < -32 ? 'south' : 'overhead';
  const flip = view === 'north';
  return { scale: s, view, p: ll => { const r = raw(ll); if (!r) return r; const x = W / 2 + (r[0] - cx) * s, y = H / 2 + (r[1] - cy) * s; return flip ? [W - x, H - y] : [x, y]; } };
}
const inside = q => q && q[0] > -20 && q[0] < W + 20 && q[1] > -20 && q[1] < H + 20;
// star colour from B-V colour index (blue-white hot stars to orange-red cool stars)
function colour(bv) {
  const b = Math.max(-0.3, Math.min(2, Number(bv) || 0.6));
  const stops = [[-0.3, [155, 180, 255]], [0, [200, 215, 255]], [0.4, [248, 247, 255]], [0.8, [255, 236, 200]], [1.2, [255, 205, 150]], [2, [255, 160, 100]]];
  for (let i = 1; i < stops.length; i++) if (b <= stops[i][0]) {
    const [a0, c0] = stops[i - 1], [a1, c1] = stops[i], t = (b - a0) / (a1 - a0);
    return 'rgb(' + c0.map((c, j) => Math.round(c + (c1[j] - c) * t)).join(',') + ')';
  }
  return 'rgb(255,160,100)';
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function chart(cfg) {
  const lineSets = id => (LINES.find(f => f.id === id) || { geometry: { coordinates: [] } }).geometry.coordinates;
  const fitPts = cfg.fit.flatMap(id => lineSets(id).flat()).concat((cfg.fitStars || []).map(n => starBy(hip(n)).geometry.coordinates));
  const { p, scale, view } = makeProjection(fitPts);
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
  out.push(`<defs><radialGradient id="sky" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#132a4f"/><stop offset="1" stop-color="#050b18"/></radialGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`);
  out.push(`<style>
.ln{fill:none;stroke:#e8b65a;stroke-width:2.2;stroke-linecap:round;opacity:.55;stroke-dasharray:1;stroke-dashoffset:0;animation:draw 2.6s ease-out backwards}
.ln.bold{stroke-width:3.4;opacity:.9}
.tw{animation:tw 3.4s ease-in-out infinite}
.ring{fill:none;stroke:#ffd27a;stroke-width:3;transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-in-out infinite;opacity:0;animation-delay:2s}
.lb{font:700 36px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;fill:#f3e3c3;animation:fade 1s ease-out 2.2s backwards}
.lb.sm{font-size:30px;fill:#c9d6ee}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes pulse{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}
@keyframes fade{from{opacity:0}to{opacity:1}}
</style>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  // stars, faintest first
  const shown = STARS.filter(s => s.properties.mag <= 5.6).map(s => ({ s, q: p(s.geometry.coordinates) })).filter(o => inside(o.q))
    .sort((a, b) => b.s.properties.mag - a.s.properties.mag);
  const R = m => Math.max(1.1, Math.min(13, (6 - m) * 2.1)) * Math.min(1.25, Math.max(0.8, scale / 900));
  // constellation lines (under the stars), each segment drawn in turn
  let k = 0;
  for (const id of cfg.draw) for (const seg of lineSets(id)) {
    const pts = seg.map(p);
    if (pts.some(q => !q)) continue;
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const d = 'M' + pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join('L');
    out.push(`<path class="ln${(cfg.bold || []).includes(id) ? ' bold' : ''}" d="${d}" pathLength="1" style="animation-delay:${(0.15 * k++).toFixed(2)}s"/>`);
  }
  shown.forEach(({ s, q }, i) => {
    const m = s.properties.mag, r = R(m), c = colour(s.properties.bv);
    const tw = m < 2.6 ? ` class="tw" style="animation-delay:${(i % 7) * 0.45}s"` : '';
    out.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${c}"${m < 3 ? ' filter="url(#glow)"' : ''}${tw}/>`);
  });
  if (cfg.pleiades) { // the Pleiades cluster (M45) as a small glowing patch
    const q = p([56.75, 24.12]);
    if (inside(q)) out.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="14" fill="#a9c4ff" opacity=".35" filter="url(#glow)"/><text class="lb sm" x="${(q[0] + 20).toFixed(0)}" y="${(q[1] - 14).toFixed(0)}">Pleiades</text>`);
  }
  for (const n of cfg.ring || []) {
    const st = starBy(hip(n)), q = st && p(st.geometry.coordinates);
    if (!q) continue;
    const r = R(st.properties.mag) + 16;
    out.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#ffd27a" stroke-width="2.5" opacity=".9"/>`);
    out.push(`<circle class="ring" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r.toFixed(1)}"/>`);
  }
  for (const n of cfg.label || []) {
    const st = starBy(hip(n)), q = st && p(st.geometry.coordinates);
    if (!inside(q)) continue;
    const r = R(st.properties.mag);
    const left = q[0] > W - 300;
    out.push(`<text class="lb" x="${(left ? q[0] - r - 10 : q[0] + r + 10).toFixed(0)}" y="${(q[1] + 12).toFixed(0)}"${left ? ' text-anchor="end"' : ''}>${esc(n === 'Rigil Kentaurus' ? 'Alpha Centauri' : n === 'Hadar' ? 'Beta Centauri' : n)}</text>`);
  }
  const cap = { north: 'As seen from Botswana, looking north', south: 'As seen from Botswana, looking south', overhead: 'As seen from Botswana, high overhead' }[view];
  out.push(`<text x="18" y="${H - 16}" style="font:600 24px system-ui,sans-serif;fill:#a9bbdc">${cap}</text>`);
  out.push(`<text x="${W - 18}" y="${H - 16}" text-anchor="end" style="font:15px system-ui,sans-serif;fill:#7f93b8">AGA star chart · star data: Hipparcos / d3-celestial</text>`);
  out.push('</svg>');
  return out.join('\n');
}

const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'species-lists', 'astronomy.json'), 'utf8').replace(/^﻿/, ''));
const pf = path.join(ROOT, 'data', 'photos', 'astronomy.json');
const photos = JSON.parse(fs.readFileSync(pf, 'utf8'));
fs.mkdirSync(path.join(ROOT, 'app', 'media', 'astronomy'), { recursive: true });
let n = 0;
for (const [name, cfg] of Object.entries(CHARTS)) {
  if (!list.some(s => s.name === name)) { console.log('  (not in the astronomy list: ' + name + ')'); continue; }
  const file = `media/astronomy/chart-${slug(name)}-${VERSION}.svg`;
  fs.writeFileSync(path.join(ROOT, 'app', file), chart(cfg));
  const i = photos.findIndex(x => x.name === name);
  const prev = i >= 0 ? photos[i] : null;
  if (prev && prev.file !== file && !prev.chart) { try { fs.unlinkSync(path.join(ROOT, 'app', prev.file)); } catch (e) { /* gone */ } }
  const entry = { name, sci: '', file, chart: true, license: 'AGA', credit: 'AGA star chart (star data: Hipparcos via d3-celestial, BSD licence)',
    source: 'https://github.com/ofrohn/d3-celestial', place: 'AGA' };
  if (i >= 0) photos[i] = entry; else photos.push(entry);
  n++;
}
fs.writeFileSync(pf, JSON.stringify(photos, null, 1));
console.log(`${n} star charts written.`);
