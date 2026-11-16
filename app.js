/* AGA Study - pilot. Reads window.AGA_DATA (generated from the content sheet). */
(function () {
  'use strict';
  const DATA = window.AGA_DATA;
  const view = document.getElementById('view');
  const backBtn = document.getElementById('backBtn');
  const topRight = document.getElementById('topRight');
  const STORE_KEY = 'aga-study-progress-v1';
  const SETTINGS_KEY = 'aga-study-settings-v1';

  // ---------- storage (progress lives in this browser only) ----------
  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode etc. */ } }
  let progress = load(STORE_KEY, {});
  let settings = Object.assign({ length: 10, scope: {} }, load(SETTINGS_KEY, {}));

  function rec(modId, itemId) {
    progress[modId] = progress[modId] || {};
    return progress[modId][itemId] || { box: 0, right: 0, wrong: 0 };
  }
  function record(modId, itemId, correct) {
    const r = rec(modId, itemId);
    if (correct) { r.right++; r.box = Math.min(5, r.box + 1); } else { r.wrong++; r.box = 0; }
    r.last = Date.now();
    progress[modId][itemId] = r;
    save(STORE_KEY, progress);
  }
  const MASTERED = 3;
  function masteredCount(mod, items) { return items.filter(i => rec(mod.id, i.id).box >= MASTERED).length; }

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const modById = id => DATA.modules.find(m => m.id === id);

  // Weighted pick: birds you don't know yet come up more often (simple spaced repetition).
  function pickItems(mod, items, n) {
    const pool = items.map(i => ({ i, w: 6 - rec(mod.id, i.id).box + Math.random() * 2 }));
    pool.sort((a, b) => b.w - a.w);
    return shuffle(pool.slice(0, Math.min(n, pool.length)).map(p => p.i));
  }
  // Wrong answers: prefer the same group (other cuckoos, other larks...), then anything.
  function distractors(answer, pool, n) {
    const others = pool.filter(i => i.id !== answer.id && i.name !== answer.name);
    const same = shuffle(others.filter(i => i.group && i.group === answer.group));
    const rest = shuffle(others.filter(i => !(i.group && i.group === answer.group)));
    return same.slice(0, Math.min(2, same.length)).concat(rest).slice(0, n)
      .concat(same.slice(2)).slice(0, n);
  }

  // ---------- audio ----------
  const audio = new Audio();
  let audioBtn = null;
  audio.addEventListener('ended', () => setPlaying(false));
  audio.addEventListener('pause', () => setPlaying(false));
  function setPlaying(on) { if (audioBtn) { audioBtn.classList.toggle('playing', on); const l = audioBtn.querySelector('.lbl'); if (l) l.textContent = on ? 'Stop' : (audioBtn.dataset.label || 'Play call'); } }
  function playCall(src, btn) {
    if (!src) return;
    if (audioBtn === btn && !audio.paused) { audio.pause(); return; }
    audio.pause(); setPlaying(false);
    audioBtn = btn || null;
    audio.src = src; audio.currentTime = 0;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  function stopAudio() { audio.pause(); audioBtn = null; }

  // ---------- offline ----------
  const MEDIA_CACHE = 'aga-media-v1';
  const hasCaches = 'caches' in window;
  let cachedSet = new Set();
  const abs = u => new URL(u, location.href).href;
  async function refreshCached() {
    if (!hasCaches) return;
    try { const c = await caches.open(MEDIA_CACHE); cachedSet = new Set((await c.keys()).map(r => r.url)); } catch (e) { /* ignore */ }
  }
  // Offline, a call can only be used if it has been downloaded.
  const callOk = i => !!i.call && (navigator.onLine || cachedSet.has(abs(i.call)));
  const netBadge = document.getElementById('netBadge');
  function updateNet() { netBadge.hidden = navigator.onLine; }
  window.addEventListener('online', () => { updateNet(); route(); });
  window.addEventListener('offline', () => { updateNet(); route(); });
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (location.hash === '#/offline') route(); });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mb = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
  let downloading = null; // { key, done, total, cancel }

  // ---------- modes ----------
  const MODES = {
    photo2name: { icon: '📷', title: 'Name the bird', desc: 'See a photo, pick the right name.', needs: i => i.photo },
    call2name: { icon: '🔊', title: 'Whose call is this?', desc: 'Listen to the call, pick the bird.', needs: callOk },
    call2photo: { icon: '🎧', title: 'Match call to photo', desc: 'Listen, then tap the right photo.', needs: i => callOk(i) && i.photo },
    name2photo: { icon: '🔎', title: 'Find the bird', desc: 'Read the name, tap the right photo.', needs: i => i.photo },
  };
  function scopedItems(mod) {
    const sc = settings.scope[mod.id] || 'all';
    if (sc === 'all') return mod.items;
    if (sc === 'fgasa') return mod.items.filter(i => i.photo);
    return mod.items.filter(i => i.group === sc);
  }
  function modesFor(mod) {
    const items = scopedItems(mod);
    return Object.keys(MODES).filter(k => items.filter(MODES[k].needs).length >= 4);
  }

  // ---------- routing ----------
  function go(hash) { location.hash = hash; }
  window.addEventListener('hashchange', route);
  document.getElementById('homeLink').addEventListener('click', () => go('#/'));
  backBtn.addEventListener('click', () => {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    go(parts.length > 2 ? '#/m/' + parts[1] : '#/');
  });
  let keyHandler = null;
  document.addEventListener('keydown', e => { if (keyHandler && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') keyHandler(e); });

  function route() {
    stopAudio(); keyHandler = null; topRight.textContent = '';
    const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    backBtn.hidden = p.length === 0;
    if (p[0] === 'offline') return renderOffline();
    if (p[0] === 'm' && modById(p[1])) {
      const mod = modById(p[1]);
      if (p[2] === 'quiz' && MODES[p[3]]) return startQuiz(mod, p[3], p[4] === 'missed' ? lastMissed : null);
      if (p[2] === 'flash') return startFlash(mod);
      if (p[2] === 'browse') return renderBrowse(mod);
      return renderModule(mod);
    }
    renderHome();
  }
  function show(html) { view.innerHTML = html; view.focus({ preventScroll: true }); window.scrollTo(0, 0); }

  // ---------- home ----------
  function renderHome() {
    const cards = DATA.modules.map(m => {
      const n = m.items.length, done = masteredCount(m, m.items);
      const thumb = m.items.find(i => i.photo);
      return `<button class="card module" data-mod="${esc(m.id)}">
        ${m.id === 'calls' ? '<div class="thumb-sound">🔊</div>' : `<img src="${esc(thumb && thumb.photo)}" alt="">`}
        <div><h3>${esc(m.title)}</h3><p>${esc(m.subtitle)}</p>
        <div class="bar"><span style="width:${(100 * done / n).toFixed(1)}%"></span></div>
        <div class="bar-label">${done} of ${n} mastered</div></div></button>`;
    }).join('');
    const allCalls = callList(DATA.modules);
    const saved = allCalls.filter(u => cachedSet.has(abs(u))).length;
    const offlineCard = hasCaches ? `<button class="card module offline-card" data-go-offline>
        <div class="thumb-sound">📥</div>
        <div><h3>Use offline &amp; install</h3><p>Download calls so you can study in camp with no signal.</p>
        <div class="bar-label">${saved ? saved + ' of ' + allCalls.length + ' calls saved on this device' : 'No calls downloaded yet'}</div></div></button>` : '';
    show(`<h1>Study modules</h1><p class="sub">Pick a module to practise. Your progress is saved on this device.</p>
      <div class="module-list">${cards}${offlineCard}</div>`);
    view.querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', () => go('#/m/' + b.dataset.mod)));
    const oc = view.querySelector('[data-go-offline]');
    if (oc) oc.addEventListener('click', () => go('#/offline'));
  }

  // ---------- offline page ----------
  function callList(mods) { return [...new Set(mods.flatMap(m => m.items.map(i => i.call)).filter(Boolean))]; }
  function bytesOf(urls) {
    const size = {};
    DATA.modules.forEach(m => m.items.forEach(i => { if (i.call) size[i.call] = i.bytes || 0; }));
    return urls.reduce((s, u) => s + (size[u] || 0), 0);
  }
  async function download(key, urls) {
    if (downloading) return;
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* ignore */ }
    const cache = await caches.open(MEDIA_CACHE);
    const todo = urls.filter(u => !cachedSet.has(abs(u)));
    downloading = { key, done: urls.length - todo.length, total: urls.length, failed: 0, cancelled: false };
    renderOffline();
    let next = 0;
    async function worker() {
      while (next < todo.length && !downloading.cancelled) {
        const u = todo[next++];
        try {
          const res = await fetch(u, { cache: 'no-store' });
          if (!res.ok) throw new Error(res.status);
          await cache.put(abs(u), res);
          cachedSet.add(abs(u));
          downloading.done++;
        } catch (e) { downloading.failed++; }
        paintProgress();
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    const result = downloading; downloading = null;
    await refreshCached();
    if (location.hash === '#/offline') renderOffline(result.failed && !result.cancelled ? `${result.failed} files could not be downloaded - check your connection and tap Download again.` : '');
  }
  function paintProgress() {
    const el = document.getElementById('dlProg');
    if (!el || !downloading) return;
    el.querySelector('span').style.width = (100 * downloading.done / downloading.total) + '%';
    document.getElementById('dlText').textContent = `Downloading... ${downloading.done} of ${downloading.total}`;
  }
  async function removeCalls() {
    const cache = await caches.open(MEDIA_CACHE);
    for (const r of await cache.keys()) if (r.url.includes('/media/calls/')) await cache.delete(r);
    await refreshCached(); renderOffline();
  }
  function renderOffline(message) {
    const packs = [
      { key: 'fgasa', title: 'FGASA 80 birds - calls', urls: callList([modById('fgasa80')]) },
      { key: 'all', title: 'Full call library', urls: callList(DATA.modules) },
    ];
    const photos = [...new Set(DATA.modules.flatMap(m => m.items.map(i => i.photo)).filter(Boolean))];
    const photosSaved = photos.filter(u => cachedSet.has(abs(u))).length;
    const packHtml = packs.map(p => {
      const have = p.urls.filter(u => cachedSet.has(abs(u))).length;
      const left = p.urls.filter(u => !cachedSet.has(abs(u)));
      const busy = downloading && downloading.key === p.key;
      let action;
      if (busy) action = `<div class="bar" id="dlProg"><span style="width:${100 * downloading.done / downloading.total}%"></span></div>
          <div class="row"><span class="bar-label" id="dlText">Downloading... ${downloading.done} of ${downloading.total}</span><button class="linkish" id="dlCancel">Cancel</button></div>`;
      else if (!left.length) action = `<span class="done">✓ Saved on this device</span>`;
      else action = `<button class="btn" data-dl="${p.key}"${downloading || !navigator.onLine ? ' disabled' : ''}>${have ? 'Download the rest' : 'Download'} (${mb(bytesOf(left))})</button>`;
      return `<div class="card dl"><h3>${esc(p.title)}</h3><p>${p.urls.length} calls &middot; ${mb(bytesOf(p.urls))} &middot; ${have} saved</p>${action}</div>`;
    }).join('');

    let install;
    if (isStandalone()) install = `<p class="done">✓ The app is installed on this device.</p>`;
    else if (installPrompt) install = `<p>Add AGA Study to your home screen so it opens like a normal app.</p><button class="btn" id="installBtn">Install app</button>`;
    else if (isIOS) install = `<ol class="steps"><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (square with an arrow).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol>`;
    else install = `<ol class="steps"><li>Open this page in <strong>Chrome</strong>.</li><li>Tap the <strong>⋮</strong> menu.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li></ol>`;

    show(`<h1>Use offline</h1>
      <p class="sub">${navigator.onLine ? 'Download before you go to camp. Everything you download keeps working with no signal.' : 'You are offline. Quizzes use the photos and calls already saved on this device.'}</p>
      ${message ? `<div class="feedback bad"><div class="msg">${esc(message)}</div></div>` : ''}
      <h2>1. Install on your phone</h2><div class="card dl">${install}</div>
      <h2>2. Download content</h2>
      <div class="card dl"><h3>App and all photos</h3><p>Saved automatically the first time you open the app.</p>
        ${photosSaved >= photos.length ? '<span class="done">✓ Saved on this device</span>' : `<span class="bar-label">${photosSaved} of ${photos.length} photos saved - keep the app open on Wi-Fi for a moment.</span>`}</div>
      ${packHtml}
      <p class="sub" style="font-size:13px">Tip: download on Wi-Fi. The full library is large, so most students only need the FGASA 80 calls.</p>
      ${[...cachedSet].some(u => u.includes('/media/calls/')) && !downloading ? '<button class="linkish" id="rmCalls">Remove downloaded calls to free up space</button>' : ''}`);
    view.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => download(b.dataset.dl, packs.find(p => p.key === b.dataset.dl).urls)));
    const c = document.getElementById('dlCancel'); if (c) c.addEventListener('click', () => { downloading.cancelled = true; });
    const ib = document.getElementById('installBtn');
    if (ib) ib.addEventListener('click', async () => { installPrompt.prompt(); try { await installPrompt.userChoice; } catch (e) { /* ignore */ } installPrompt = null; renderOffline(); });
    const rm = document.getElementById('rmCalls');
    if (rm) rm.addEventListener('click', () => { if (confirm('Remove all downloaded calls from this device? You can download them again later.')) removeCalls(); });
  }

  // ---------- module ----------
  function renderModule(mod) {
    const items = scopedItems(mod);
    const done = masteredCount(mod, items);
    const groups = [...new Set(mod.items.map(i => i.group).filter(Boolean))].sort();
    const sc = settings.scope[mod.id] || 'all';
    const scopeSel = mod.id === 'calls' ? `<label>Practise:
        <select class="chip" id="scope">
          <option value="all"${sc === 'all' ? ' selected' : ''}>All ${mod.items.length} calls</option>
          <option value="fgasa"${sc === 'fgasa' ? ' selected' : ''}>FGASA 80 birds only</option>
          <optgroup label="One group">${groups.map(g => `<option value="${esc(g)}"${sc === g ? ' selected' : ''}>${esc(g)} (${mod.items.filter(i => i.group === g).length})</option>`).join('')}</optgroup>
        </select></label>` : '';
    const lens = [10, 20, 0].map(n => `<button class="chip" data-len="${n}" aria-pressed="${settings.length === n}">${n || 'All'}</button>`).join('');
    const modes = modesFor(mod).map(k => `<button class="card mode" data-mode="${k}"><div class="icon">${MODES[k].icon}</div><h3>${MODES[k].title}</h3><p>${MODES[k].desc}</p></button>`).join('');
    show(`<h1>${esc(mod.title)}</h1><p class="sub">${esc(mod.subtitle)}</p>
      <div class="bar"><span style="width:${(100 * done / Math.max(1, items.length)).toFixed(1)}%"></span></div>
      <div class="bar-label">${done} of ${items.length} mastered (answered right 3 times in a row)</div>
      <h2>Settings</h2>
      <div class="settings">${scopeSel}<span>Questions per round:</span>${lens}</div>
      <h2>Quiz</h2><div class="modes">${modes || '<p class="empty">Not enough items in this selection - pick a bigger group.</p>'}</div>
      <h2>Learn</h2><div class="modes">
        <button class="card mode" data-go="flash"><div class="icon">🃏</div><h3>Flashcards</h3><p>Flip through, mark what you know.</p></button>
        <button class="card mode" data-go="browse"><div class="icon">📚</div><h3>Browse all</h3><p>Look and listen at your own pace.</p></button>
      </div>`);
    const s = document.getElementById('scope');
    if (s) s.addEventListener('change', () => { settings.scope[mod.id] = s.value; save(SETTINGS_KEY, settings); renderModule(mod); });
    view.querySelectorAll('[data-len]').forEach(b => b.addEventListener('click', () => { settings.length = +b.dataset.len; save(SETTINGS_KEY, settings); renderModule(mod); }));
    view.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => go(`#/m/${mod.id}/quiz/${b.dataset.mode}`)));
    view.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(`#/m/${mod.id}/${b.dataset.go}`)));
  }

  // ---------- quiz ----------
  let lastMissed = null;
  function startQuiz(mod, modeKey, onlyItems) {
    const mode = MODES[modeKey];
    const pool = scopedItems(mod).filter(mode.needs);
    const n = settings.length || pool.length;
    const questions = onlyItems ? shuffle(onlyItems.filter(mode.needs)) : pickItems(mod, pool, n);
    // wrong answers come from the chosen selection (e.g. only cisticolas); fall back to the whole module if it's too small
    const optPool = pool.length >= 4 ? pool : mod.items.filter(mode.needs);
    const state = { i: 0, score: 0, missed: [] };

    function ask() {
      const q = questions[state.i];
      const opts = shuffle([q].concat(distractors(q, optPool, 3)));
      topRight.textContent = `${state.score} / ${state.i}`;
      const prog = `<div class="progress"><span>${state.i + 1} of ${questions.length}</span><div class="bar"><span style="width:${100 * state.i / questions.length}%"></span></div></div>`;
      let prompt;
      if (modeKey === 'photo2name') prompt = `<img class="main" src="${esc(q.photo)}" alt="Bird photo"><div class="q">Which bird is this?</div>`;
      else if (modeKey === 'name2photo') prompt = `<div class="big-name">${esc(q.name)}</div><div class="sub">Tap the right photo</div>`;
      else prompt = `<button class="play" id="playQ" data-label="Play call">▶ <span class="lbl">Play call</span></button><div class="q">${modeKey === 'call2photo' ? 'Tap the bird that makes this call' : 'Whose call is this?'}</div><div class="sub" style="margin:0">Tap the button to replay</div>`;
      const pics = modeKey === 'call2photo' || modeKey === 'name2photo';
      const optHtml = opts.map((o, k) => pics
        ? `<button class="opt" data-id="${esc(o.id)}"><img src="${esc(o.photo)}" alt="Option ${k + 1}"><span class="cap"></span></button>`
        : `<button class="opt" data-id="${esc(o.id)}"><span class="k">${k + 1}</span><span>${esc(o.name)}</span></button>`).join('');
      show(`${prog}<div class="card prompt">${prompt}</div><div class="options ${pics ? 'pics' : 'text'}">${optHtml}</div><div id="fb"></div>`);
      const pb = document.getElementById('playQ');
      if (pb) { pb.addEventListener('click', () => playCall(q.call, pb)); playCall(q.call, pb); }
      const buttons = [...view.querySelectorAll('.opt')];
      buttons.forEach(b => b.addEventListener('click', () => answer(q, b.dataset.id, buttons, opts, pics)));
      keyHandler = e => {
        if (/^[1-4]$/.test(e.key) && buttons[+e.key - 1] && !buttons[0].disabled) buttons[+e.key - 1].click();
        else if ((e.key === 'r' || e.key === 'R') && pb) playCall(q.call, pb);
      };
    }

    function answer(q, chosenId, buttons, opts, pics) {
      const correct = chosenId === q.id;
      record(mod.id, q.id, correct);
      if (correct) state.score++; else state.missed.push({ item: q, chose: opts.find(o => o.id === chosenId) });
      buttons.forEach(b => {
        b.disabled = true;
        if (b.dataset.id === q.id) b.classList.add('right');
        else if (b.dataset.id === chosenId) b.classList.add('wrong');
        if (pics) b.querySelector('.cap').textContent = opts.find(o => o.id === b.dataset.id).name;
      });
      topRight.textContent = `${state.score} / ${state.i + 1}`;
      const last = state.i === questions.length - 1;
      const fbImg = !pics && q.photo && modeKey !== 'photo2name' ? `<img src="${esc(q.photo)}" alt="">` : '';
      const fbCall = q.call && modeKey === 'photo2name' ? `<button class="mini-play" id="fbPlay" data-label="Hear call">▶ <span class="lbl">Hear call</span></button>` : '';
      document.getElementById('fb').innerHTML = `<div class="feedback ${correct ? 'good' : 'bad'}">${fbImg}
        <div class="msg"><strong>${correct ? 'Correct!' : 'Not quite.'}</strong> ${correct ? '' : 'It is the <strong>' + esc(q.name) + '</strong>.'}</div>
        ${fbCall}<button class="btn" id="next">${last ? 'See results' : 'Next'} →</button></div>`;
      const fp = document.getElementById('fbPlay');
      if (fp) fp.addEventListener('click', () => playCall(q.call, fp));
      const nx = document.getElementById('next');
      nx.focus({ preventScroll: true });
      nx.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const advance = () => { stopAudio(); state.i++; last ? results() : ask(); };
      nx.addEventListener('click', advance);
      keyHandler = e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
        else if ((e.key === 'r' || e.key === 'R') && q.call) playCall(q.call, document.getElementById('playQ') || fp);
      };
    }

    function results() {
      topRight.textContent = '';
      lastMissed = state.missed.map(m => m.item);
      const pct = Math.round(100 * state.score / questions.length);
      const msg = pct === 100 ? 'Perfect round!' : pct >= 80 ? 'Great work.' : pct >= 50 ? 'Getting there - keep practising.' : 'Keep at it - try the flashcards first.';
      const list = state.missed.map(m => `<li class="card">${m.item.photo ? `<img src="${esc(m.item.photo)}" alt="">` : '<div class="ph">🔊</div>'}
        <div class="nm">${esc(m.item.name)}<span class="yours">You chose: ${esc(m.chose ? m.chose.name : '-')}</span></div>
        ${m.item.call ? `<button class="mini-play" data-call="${esc(m.item.call)}" data-label="Play">▶ <span class="lbl">Play</span></button>` : ''}</li>`).join('');
      show(`<div class="card prompt"><div class="sub">${esc(MODES[modeKey].title)}</div>
        <div class="score">${state.score} / ${questions.length}</div><p>${msg}</p></div>
        <div class="btn-row">
          ${state.missed.length ? '<button class="btn" id="again">Practise the ones I missed</button>' : ''}
          <button class="btn ${state.missed.length ? 'ghost' : ''}" id="new">New round</button>
          <button class="btn ghost" id="done">Back to module</button></div>
        ${list ? `<h2>To review</h2><ul class="review">${list}</ul>` : ''}`);
      const a = document.getElementById('again');
      if (a) a.addEventListener('click', () => { location.hash === `#/m/${mod.id}/quiz/${modeKey}/missed` ? route() : go(`#/m/${mod.id}/quiz/${modeKey}/missed`); });
      document.getElementById('new').addEventListener('click', () => { location.hash === `#/m/${mod.id}/quiz/${modeKey}` ? route() : go(`#/m/${mod.id}/quiz/${modeKey}`); });
      document.getElementById('done').addEventListener('click', () => go('#/m/' + mod.id));
      view.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => playCall(b.dataset.call, b)));
    }

    if (questions.length === 0) return show('<p class="empty">Nothing to practise here yet.</p>');
    ask();
  }

  // ---------- flashcards ----------
  function startFlash(mod) {
    const pool = scopedItems(mod);
    let deck = pickItems(mod, pool, settings.length || pool.length);
    let seen = 0, known = 0;
    const total = deck.length;
    function card() {
      if (!deck.length) {
        topRight.textContent = '';
        show(`<div class="card prompt"><div class="score">${known} / ${total}</div><p>cards marked "I knew it" first time.</p></div>
          <div class="btn-row"><button class="btn" id="new">Another deck</button><button class="btn ghost" id="done">Back to module</button></div>`);
        document.getElementById('new').addEventListener('click', () => startFlash(mod));
        document.getElementById('done').addEventListener('click', () => go('#/m/' + mod.id));
        return;
      }
      const c = deck[0];
      topRight.textContent = `${Math.min(seen + 1, total)} / ${total}`;
      const soundFront = !c.photo;
      const front = soundFront
        ? `<button class="play" id="fPlay" data-label="Play call">▶ <span class="lbl">Play call</span></button><div class="hint">Whose call is this? Tap the card to check.</div>`
        : `<img src="${esc(c.photo)}" alt="Bird photo"><div class="hint">Who is this? Tap the card to check.</div>`;
      const back = `${c.photo && soundFront ? '' : ''}<div class="big-name">${esc(c.name)}</div><div class="sub">${esc(c.group || '')}</div>
        ${c.call ? `<button class="mini-play" id="bPlay" data-label="Play call">▶ <span class="lbl">Play call</span></button>` : '<div class="sub">(no call recording in the library)</div>'}`;
      show(`<div class="flash" id="flash"><div class="flash-inner"><div class="card face front">${front}</div><div class="card face back">${back}</div></div></div>
        <div class="grade" id="grade" hidden><button class="btn again" id="gAgain">Again</button><button class="btn know" id="gKnow">I knew it</button></div>`);
      const flash = document.getElementById('flash');
      const grade = document.getElementById('grade');
      const flip = () => { flash.classList.toggle('flipped'); grade.hidden = false; };
      flash.addEventListener('click', e => { if (!e.target.closest('button')) flip(); });
      const fp = document.getElementById('fPlay'); if (fp) { fp.addEventListener('click', () => playCall(c.call, fp)); playCall(c.call, fp); }
      const bp = document.getElementById('bPlay'); if (bp) bp.addEventListener('click', () => playCall(c.call, bp));
      const mark = ok => {
        stopAudio();
        if (!c._seen) { record(mod.id, c.id, ok); seen++; if (ok) known++; c._seen = true; }
        deck.shift();
        if (!ok) deck.splice(Math.min(deck.length, 3), 0, c); // comes back in a few cards
        card();
      };
      document.getElementById('gAgain').addEventListener('click', () => mark(false));
      document.getElementById('gKnow').addEventListener('click', () => mark(true));
      keyHandler = e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
        else if (!grade.hidden && (e.key === '1' || e.key === 'ArrowLeft')) mark(false);
        else if (!grade.hidden && (e.key === '2' || e.key === 'ArrowRight')) mark(true);
        else if ((e.key === 'r' || e.key === 'R') && c.call) playCall(c.call, fp || bp);
      };
    }
    deck = deck.map(i => Object.assign({}, i));
    card();
  }

  // ---------- browse ----------
  function renderBrowse(mod) {
    const items = scopedItems(mod).slice().sort((a, b) => a.name.localeCompare(b.name));
    show(`<h1>${esc(mod.title)}</h1><input class="search" id="q" type="search" placeholder="Search ${items.length} birds..." autocomplete="off"><div class="grid" id="grid"></div>`);
    const grid = document.getElementById('grid');
    function draw(filter) {
      const f = (filter || '').toLowerCase();
      const list = items.filter(i => !f || i.name.toLowerCase().includes(f) || (i.group || '').toLowerCase().includes(f));
      grid.innerHTML = list.map(i => {
        const box = rec(mod.id, i.id).box;
        return `<div class="card tile">${i.photo ? `<img loading="lazy" src="${esc(i.photo)}" alt="">` : '<div class="ph">🔊</div>'}
          <div class="nm">${esc(i.name)}</div>
          <div class="row"><span class="dots" title="Progress">${'●'.repeat(Math.min(box, MASTERED))}${'○'.repeat(Math.max(0, MASTERED - box))}</span>
          ${i.call ? `<button class="mini-play" data-call="${esc(i.call)}" data-label="Play">▶ <span class="lbl">Play</span></button>` : ''}</div></div>`;
      }).join('') || '<p class="empty">No birds match.</p>';
      grid.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => playCall(b.dataset.call, b)));
    }
    document.getElementById('q').addEventListener('input', e => draw(e.target.value));
    draw('');
  }

  updateNet();
  route();
  // Once we know what is saved on this device, refresh the screen (counts, offline-only calls).
  refreshCached().then(() => { if (!downloading && !/\/quiz\/|\/flash/.test(location.hash)) route(); });
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', () => refreshCached());
})();
