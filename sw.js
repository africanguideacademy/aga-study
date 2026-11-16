/* AGA Study - offline support.
   - App files (html/css/js/data): network first, so students always get the latest when online; cached copy when offline.
   - Photos and calls: served from the cache when downloaded; calls are only saved when the student taps "Download".
   - Audio is served with byte-range support, which iPhones need to play cached sound. */
const SHELL = 'aga-shell-v1';
const MEDIA = 'aga-media-v1';
const SHELL_FILES = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_FILES.map(u => new Request(u, { cache: 'reload' })));
    // Photos are small (about 6 MB in total), so they are saved straight away.
    try {
      self.window = self;
      importScripts('data.js');
      const photos = [...new Set(self.AGA_DATA.modules.flatMap(m => m.items.map(i => i.photo)).filter(Boolean))];
      const media = await caches.open(MEDIA);
      const have = new Set((await media.keys()).map(r => r.url));
      for (const p of photos) {
        const url = new URL(p, self.registration.scope).href;
        if (!have.has(url)) { try { const r = await fetch(url); if (r.ok) await media.put(url, r); } catch (e) { /* retry next time */ } }
      }
    } catch (e) { /* photos will be cached as they are viewed */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('aga-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function rangeResponse(request, cached) {
  const range = request.headers.get('range');
  if (!range) return cached;
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const start = m && m[1] ? +m[1] : 0;
  const end = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/media/')) {
    event.respondWith((async () => {
      const media = await caches.open(MEDIA);
      const hit = await media.match(url.href);
      if (hit) return rangeResponse(req, hit);
      const res = await fetch(req);
      // cache photos as they are seen; calls are only cached by the Download button
      if (res.ok && res.status === 200 && url.pathname.includes('/media/birds/')) media.put(url.href, res.clone());
      return res;
    })());
    return;
  }

  event.respondWith((async () => {
    const shell = await caches.open(SHELL);
    try {
      const res = req.mode === 'navigate' ? await fetch(req) : await fetch(req.url, { cache: 'no-cache' });
      if (res.ok) shell.put(req, res.clone());
      return res;
    } catch (e) {
      return (await shell.match(req, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? await shell.match('index.html') : Response.error());
    }
  })());
});
