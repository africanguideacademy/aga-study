// Turns the manual PDF into one small PDF per chapter for the app's Manual tab, with every two-page spread cut into
// single pages (much easier to read on a phone).
// It reads the page headers itself ("92 | BIRDS", "PLANTS | 37"), so a NEW EDITION only needs:
//   cd tools/pdf  &&  npm install            (once)
//   node make-manual.mjs "<path to the new PDF>" "8th edition (2026)"
//   then: node ../build-data.js  and publish.
// Output: app/media/manual/<edition>/<chapter>.pdf  +  data/manual.json  (chapters, page ranges, file sizes)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = process.argv[2] || 'Y:/TRAINING/TRAINING MATERIALS/CURRENT MANUALS/Nature Guide/Botswana Guide Training Manual.pdf';
const EDITION = process.argv[3] || '7th edition (2025)';
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const title = s => s.toLowerCase().replace(/\b(and|of|the)\b|\b\w/g, w => (/^(and|of|the)$/.test(w) ? w : w.toUpperCase()));

const bytes = new Uint8Array(fs.readFileSync(SRC));
const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true }).promise;
const parts = []; // one entry per single page: { pdfIndex, half: null|'L'|'R', printed, chapter }
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const [x0, y0, x1, y1] = page.view, w = x1 - x0, h = y1 - y0;
  const spread = w > h * 1.2;
  const tc = await page.getTextContent();
  const halves = spread ? [['L', x0, x0 + w / 2], ['R', x0 + w / 2, x1]] : [[null, x0, x1]];
  for (const [half, a, b] of halves) {
    // rebuild text lines in this half, then look for a running header
    const lines = {};
    for (const it of tc.items) {
      const x = it.transform[4], y = Math.round(it.transform[5]);
      if (x < a || x >= b || !it.str.trim()) continue;
      (lines[y] = lines[y] || []).push([x, it.str]);
    }
    let printed = null, chapter = null;
    for (const l of Object.values(lines).map(v => v.sort((p, q) => p[0] - q[0]).map(p => p[1]).join(' ').replace(/\s+/g, ' ').trim())) {
      // "92 | BIRDS", "PLANTS | 37", or both on one line on single pages: "26 | WEATHER AND CLIMATE WEATHER AND CLIMATE | 26"
      const m = /^(\d{1,3}) ?\| ?([A-Z][A-Z &,']{2,}?)(?: \2 ?\| ?\1)?$/.exec(l) || /^([A-Z][A-Z &,']{2,}) ?\| ?(\d{1,3})$/.exec(l);
      if (!m) continue;
      const [num, name] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
      printed = Number(num); chapter = title(name.trim()); break;
    }
    parts.push({ pdfIndex: n - 1, half, printed, chapter, hdr: chapter });
  }
}
// pages without a header: a chapter's opening page belongs to the NEXT chapter; photo pages inside a chapter stay in it
for (let i = 0; i < parts.length; i++) {
  if (parts[i].chapter) continue;
  const prev = parts.slice(0, i).reverse().find(p => p.hdr), next = parts.slice(i + 1).find(p => p.hdr);
  parts[i].chapter = !prev ? 'Introduction' : next && next.hdr !== prev.hdr ? next.hdr : prev.hdr;
  if (prev && prev.printed && parts[i - 1].printed) parts[i].printed = parts[i - 1].printed + 1;
}
// write one PDF per chapter
const outDir = path.join(ROOT, 'app', 'media', 'manual', slug(EDITION));
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const src = await PDFDocument.load(bytes);
const chapters = [];
for (const p of parts) {
  let c = chapters[chapters.length - 1];
  if (!c || c.title !== p.chapter) chapters.push(c = { id: slug(p.chapter), title: p.chapter, parts: [] });
  c.parts.push(p);
}
for (const c of chapters) {
  const out = await PDFDocument.create();
  const idx = [...new Set(c.parts.map(p => p.pdfIndex))];
  (await out.copyPages(src, idx)).forEach(pg => out.addPage(pg));
  // views: what the app shows, in order - page n of this chapter file, the left/right half of a spread or the whole page
  c.views = c.parts.map(p => [idx.indexOf(p.pdfIndex) + 1, p.half || '', p.printed || 0]);
  out.setTitle(`Botswana Guide Training Manual - ${c.title}`);
  const file = `media/manual/${slug(EDITION)}/${c.id}.pdf`;
  fs.writeFileSync(path.join(ROOT, 'app', file), await out.save({ useObjectStreams: true }));
  const nums = c.parts.map(p => p.printed).filter(Boolean);
  Object.assign(c, { file, bytes: fs.statSync(path.join(ROOT, 'app', file)).size, from: nums[0] || null, to: nums[nums.length - 1] || null });
  delete c.parts;
}
fs.writeFileSync(path.join(ROOT, 'data', 'manual.json'), JSON.stringify({ edition: EDITION, source: path.basename(SRC), chapters }, null, 1));
for (const c of chapters) console.log(`${c.title.padEnd(26)} pp ${c.from}-${c.to}  ${c.views.length} pages  ${(c.bytes / 1048576).toFixed(2)} MB`);
console.log(`Total ${(chapters.reduce((s, c) => s + c.bytes, 0) / 1048576).toFixed(1)} MB in ${chapters.length} chapters`);
