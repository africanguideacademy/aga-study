/* AGA Study - African Guide Academy. Reads window.AGA_DATA (generated from the content sheet). */
(function () {
  'use strict';
  const DATA = window.AGA_DATA;
  const $ = id => document.getElementById(id);
  const view = $('view'), backBtn = $('backBtn'), topRight = $('topRight'), barTitle = $('barTitle');
  const quizProgress = $('quizProgress'), tabbar = $('tabbar'), netBadge = $('netBadge');
  const STORE_KEY = 'aga-study-progress-v1';
  const SETTINGS_KEY = 'aga-study-settings-v1';
  const MASTERED = 3;

  // ---------- icons (inline SVG, inherit text colour) ----------
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8.5 7 10 4.5h4L15.5 7"/>',
    sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    match: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2.5" y="13.5" width="4.5" height="7" rx="1.5"/><rect x="17" y="13.5" width="4.5" height="7" rx="1.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
    cards: '<rect x="6.5" y="3.5" width="13" height="16" rx="2.5"/><path d="M4.5 7v11a3 3 0 0 0 3 3h8"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M7 7l10 10M17 7 7 17"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  };
  const icon = (n, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  // ---------- storage (progress lives in this browser only) ----------
  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } }
  let progress = load(STORE_KEY, {});
  let settings = Object.assign({ length: 10, scope: {} }, load(SETTINGS_KEY, {}));
  function rec(modId, itemId) { return (progress[modId] && progress[modId][itemId]) || { box: 0, right: 0, wrong: 0 }; }
  function record(modId, itemId, correct) {
    progress[modId] = progress[modId] || {};
    const r = Object.assign({}, rec(modId, itemId));
    if (correct) { r.right++; r.box = Math.min(5, r.box + 1); } else { r.wrong++; r.box = 0; }
    r.last = Date.now();
    progress[modId][itemId] = r;
    save(STORE_KEY, progress);
  }
  const masteredCount = (mod, items) => items.filter(i => rec(mod.id, i.id).box >= MASTERED).length;

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const modById = id => DATA.modules.find(m => m.id === id);
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const BANNERS = { fgasa80: 'media/birds/racket-tailed-roller.jpg', calls: 'media/birds/pels-fishing-owl.jpg' };
  const isQ = mod => mod.kind === 'questions';
  function bannerFor(mod) {
    if (mod.photo) return mod.photo;
    const want = BANNERS[mod.id];
    return (want && mod.items.concat(DATA.modules[0].items).some(i => i.photo === want)) ? want : (mod.items.find(i => i.photo) || DATA.modules[0].items[0]).photo;
  }

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
    return same.slice(0, 2).concat(rest, same.slice(2)).slice(0, n);
  }

  // ---------- audio ----------
  const audio = new Audio();
  audio.preload = 'auto';
  let audioBtn = null;
  audio.addEventListener('ended', () => setPlaying(false));
  audio.addEventListener('pause', () => setPlaying(false));
  function setPlaying(on) {
    if (!audioBtn) return;
    audioBtn.classList.toggle('playing', on);
    const i = audioBtn.querySelector('.pi'); if (i) i.innerHTML = icon(on ? 'stop' : 'play');
    const l = audioBtn.querySelector('.lbl'); if (l) l.textContent = on ? 'Stop' : (audioBtn.dataset.label || 'Play');
  }
  function playCall(src, btn) {
    if (!src) return;
    if (audioBtn === btn && !audio.paused) { audio.pause(); return; }
    audio.pause(); setPlaying(false);
    audioBtn = btn || null;
    audio.src = src; audio.currentTime = 0;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  function stopAudio() { audio.pause(); audioBtn = null; }
  const playBtnHtml = (id, label, big) => big
    ? `<button class="play" id="${id}" aria-label="Play call"><span class="pi">${icon('play')}</span></button>`
    : `<button class="mini-play" id="${id}" data-label="${label}"><span class="pi">${icon('play')}</span><span class="lbl">${label}</span></button>`;

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
  function updateNet() { netBadge.hidden = navigator.onLine; }
  window.addEventListener('online', () => { updateNet(); if (!inFocus()) route(); });
  window.addEventListener('offline', () => { updateNet(); if (!inFocus()) route(); });
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (location.hash === '#/offline') route(); });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mb = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
  let downloading = null;
  const callList = mods => [...new Set(mods.flatMap(m => m.items.map(i => i.call)).filter(Boolean))];

  // ---------- modes ----------
  const MODES = {
    photo2name: { icon: 'camera', title: 'Name the bird', desc: 'See a photo, pick the right name', needs: i => i.photo },
    call2name: { icon: 'sound', title: 'Whose call is this?', desc: 'Listen, then pick the bird', needs: callOk },
    call2photo: { icon: 'match', title: 'Match call to photo', desc: 'Listen, then tap the right photo', needs: i => callOk(i) && i.photo },
    name2photo: { icon: 'search', title: 'Find the bird', desc: 'Read the name, tap the right photo', needs: i => i.photo },
    mcq: { icon: 'book', title: 'Practice quiz', desc: 'Multiple choice, with explanations', needs: i => !!i.q },
  };
  function scopedItems(mod) {
    const sc = settings.scope[mod.id] || 'all';
    if (sc === 'all') return mod.items;
    if (sc === 'fgasa') return mod.items.filter(i => i.photo);
    const g = mod.items.filter(i => i.group === sc);
    return g.length ? g : mod.items;
  }
  const modesFor = mod => { const items = scopedItems(mod); return Object.keys(MODES).filter(k => items.filter(MODES[k].needs).length >= 4); };

  // ---------- chrome (header / tab bar) ----------
  ['home', 'progress', 'offline'].forEach(t => {
    const a = tabbar.querySelector(`[data-tab="${t}"]`);
    a.innerHTML = icon({ home: 'home', progress: 'chart', offline: 'download' }[t]) + `<span>${{ home: 'Home', progress: 'Progress', offline: 'Offline' }[t]}</span>`;
  });
  let backTarget = '#/';
  function chrome(o) {
    o = o || {};
    document.body.classList.toggle('focus', !!o.focus);
    document.body.classList.toggle('titled', !!o.title);
    backBtn.hidden = !o.back;
    backBtn.innerHTML = icon(o.focus ? 'close' : 'back');
    backBtn.setAttribute('aria-label', o.focus ? 'Quit' : 'Back');
    backTarget = o.back || '#/';
    barTitle.textContent = o.title || '';
    topRight.textContent = '';
    quizProgress.hidden = !o.progress;
    tabbar.querySelectorAll('a').forEach(a => {
      const on = a.dataset.tab === o.tab;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  const inFocus = () => document.body.classList.contains('focus');
  const setQuizProgress = f => { quizProgress.firstElementChild.style.width = (100 * f) + '%'; };
  backBtn.addEventListener('click', () => {
    if (inFocus() && view.dataset.dirty === '1' && !confirm('Quit this round? Answers so far are saved.')) return;
    go(backTarget);
  });

  // ---------- routing ----------
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  window.addEventListener('hashchange', route);
  let keyHandler = null;
  let usingKeyboard = false; // only move focus to buttons for keyboard users (avoids focus rings on phones)
  document.addEventListener('pointerdown', () => { usingKeyboard = false; }, true);
  document.addEventListener('keydown', e => {
    usingKeyboard = true;
    if (keyHandler && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) keyHandler(e);
  });
  function route() {
    stopAudio(); keyHandler = null; view.dataset.dirty = '';
    document.querySelectorAll('.sheet').forEach(s => s.remove());
    const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] === 'offline') return renderOffline();
    if (p[0] === 'progress') return renderProgress();
    if (p[0] === 'm' && modById(p[1])) {
      const mod = modById(p[1]);
      if (p[2] === 'quiz' && MODES[p[3]]) return startQuiz(mod, p[3], p[4] === 'review' ? reviewItems : null);
      if (p[2] === 'flash') return startFlash(mod);
      if (p[2] === 'browse') return renderBrowse(mod);
      return renderModule(mod);
    }
    renderHome();
  }
  function show(html) { view.innerHTML = html; view.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  function sheet(html, cls) {
    document.querySelectorAll('.sheet').forEach(s => s.remove());
    const s = document.createElement('div');
    s.className = 'sheet ' + (cls || '');
    s.innerHTML = `<div class="sheet-inner">${html}</div>`;
    document.body.appendChild(s);
    return s;
  }
  const footer = () => `<div class="foot"><img src="brand/logo-colour.png" alt="African Guide Academy">Study app &middot; for AGA students</div>`;

  // ---------- home ----------
  function renderHome() {
    chrome({ tab: 'home' });
    const fg = modById('fgasa80');
    const heroPhoto = shuffle(fg.items.filter(i => i.photo))[0].photo;
    const done = masteredCount(fg, fg.items);
    // Each module shows its quiz types and study options straight on the home page.
    const cards = DATA.modules.map(m => {
      const n = m.items.length, d = masteredCount(m, m.items);
      const count = isQ(m) ? plural(n, 'question') : m.id === 'calls' ? `${n} calls` : `${n} birds`;
      const rows = modesFor(m).map(k => `<a class="row-btn" href="#/m/${esc(m.id)}/quiz/${k}"><div class="tile-ico">${icon(MODES[k].icon)}</div>
          <div class="txt"><strong>${MODES[k].title}</strong><span class="d">${MODES[k].desc}</span></div>${icon('chev', 'chev')}</a>`).join('');
      const sc = settings.scope[m.id];
      const scopeNote = sc && sc !== 'all' ? ` &middot; ${esc(sc === 'fgasa' ? 'FGASA 80 only' : sc)}` : '';
      return `<section class="card mod-card">
        <a class="mod-top" href="#/m/${esc(m.id)}">
          <div class="mod-thumb" style="background-image:url('${esc(bannerFor(m))}')"></div>
          <div class="mod-info"><h3>${esc(m.title)}</h3>
            <div class="bar"><span style="width:${pct(d, n)}%"></span></div>
            <div class="bar-label"><span>${d} of ${count} mastered${scopeNote}</span></div></div>
          <span class="mod-more">Settings ${icon('chev')}</span>
        </a>
        <div class="list">${rows}
          <a class="row-btn" href="#/m/${esc(m.id)}/flash"><div class="tile-ico">${icon('cards')}</div><div class="txt"><strong>Flashcards</strong><span class="d">Flip through and mark what you know</span></div>${icon('chev', 'chev')}</a>
          <a class="row-btn" href="#/m/${esc(m.id)}/browse"><div class="tile-ico">${icon(isQ(m) ? 'list' : 'grid')}</div><div class="txt"><strong>${isQ(m) ? 'Study list' : 'Browse all'}</strong><span class="d">${isQ(m) ? 'Read every question and answer' : 'Look and listen at your own pace'}</span></div>${icon('chev', 'chev')}</a>
        </div></section>`;
    }).join('');
    const lens = [10, 20, 0].map(n => `<button data-len="${n}" aria-pressed="${settings.length === n}">${n || 'All'}</button>`).join('');
    const savedCalls = callList(DATA.modules).filter(u => cachedSet.has(abs(u))).length;
    const nudge = hasCaches && !savedCalls ? `<a class="card nudge" href="#/offline"><div class="tile-ico">${icon('download')}</div>
      <div><strong>Studying in camp?</strong><span class="small">Download the calls so the app works with no signal.</span></div>${icon('chev', 'chev')}</a>` : '';
    const previewNote = DATA.preview ? `<div class="alert" style="margin-bottom:14px"><strong>Preview mode</strong> - includes Draft questions that are still being reviewed.</div>` : '';
    show(`${previewNote}<section class="hero compact" style="background-image:url('${esc(heroPhoto)}')">
        <div class="eyebrow">African Guide Academy</div>
        <h1>Learn the birds</h1>
        <p>By sight and by sound - pick a quiz below.${done ? ` ${done} birds mastered so far.` : ''}</p>
      </section>
      <div class="card setting-row home-setting"><label>Questions per round</label><div class="seg">${lens}</div></div>
      ${nudge}
      <div class="module-list">${cards}</div>${footer()}`);
    view.querySelectorAll('[data-len]').forEach(b => b.addEventListener('click', () => {
      settings.length = +b.dataset.len; save(SETTINGS_KEY, settings);
      view.querySelectorAll('[data-len]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
  }

  // ---------- module ----------
  function renderModule(mod) {
    chrome({ tab: 'home', back: '#/' });
    const items = scopedItems(mod);
    const done = masteredCount(mod, items);
    const groups = [...new Set(mod.items.map(i => i.group).filter(Boolean))].sort();
    const sc = settings.scope[mod.id] || 'all';
    const groupOpts = gs => gs.map(g => `<option value="${esc(g)}"${sc === g ? ' selected' : ''}>${esc(g)} (${mod.items.filter(i => i.group === g).length})</option>`).join('');
    const scopeRow = mod.id === 'calls' ? `<div class="setting-row"><label for="scope">Practise</label>
        <select class="select" id="scope">
          <option value="all"${sc === 'all' ? ' selected' : ''}>All ${mod.items.length} calls</option>
          <option value="fgasa"${sc === 'fgasa' ? ' selected' : ''}>FGASA 80 birds only</option>
          <optgroup label="One group">${groupOpts(groups)}</optgroup>
        </select></div>`
      : isQ(mod) ? `<div class="setting-row"><label for="scope">Topic</label>
        <select class="select" id="scope">
          <option value="all"${sc === 'all' ? ' selected' : ''}>All topics (${mod.items.length})</option>
          ${groupOpts([...new Set(mod.items.map(i => i.group).filter(Boolean))])}
        </select></div>` : '';
    const lens = [10, 20, 0].map(n => `<button data-len="${n}" aria-pressed="${settings.length === n}">${n || 'All'}</button>`).join('');
    const rows = modesFor(mod).map(k => `<button class="row-btn" data-mode="${k}"><div class="tile-ico">${icon(MODES[k].icon)}</div>
        <div class="txt"><strong>${MODES[k].title}</strong><span class="d">${MODES[k].desc}</span></div>${icon('chev', 'chev')}</button>`).join('');
    const offlineNote = !navigator.onLine && mod.items.some(i => i.call && !cachedSet.has(abs(i.call)))
      ? `<p class="small" style="margin:8px 4px 0">You're offline: call quizzes only use calls you've downloaded.</p>` : '';
    show(`<section class="mod-head" style="background-image:url('${esc(bannerFor(mod))}')">
        <h1>${esc(mod.title)}</h1><p>${esc(mod.subtitle)}</p>
        <div class="bar"><span style="width:${pct(done, items.length)}%"></span></div>
        <div class="bar-label"><span>${done} of ${items.length} mastered</span><span>${pct(done, items.length)}%</span></div>
      </section>
      <div class="section-title">Settings</div>
      <div class="card">${scopeRow}<div class="setting-row"><label>Questions per round</label><div class="seg">${lens}</div></div></div>
      <div class="section-title">Quiz</div>
      <div class="card list">${rows || '<p class="empty">Not enough birds in this selection - pick a bigger group.</p>'}</div>${offlineNote}
      <div class="section-title">Learn</div>
      <div class="card list">
        <button class="row-btn" data-go="flash"><div class="tile-ico">${icon('cards')}</div><div class="txt"><strong>Flashcards</strong><span class="d">Flip through and mark what you know</span></div>${icon('chev', 'chev')}</button>
        ${isQ(mod)
          ? `<button class="row-btn" data-go="browse"><div class="tile-ico">${icon('list')}</div><div class="txt"><strong>Study list</strong><span class="d">Read through every question and answer</span></div>${icon('chev', 'chev')}</button>`
          : `<button class="row-btn" data-go="browse"><div class="tile-ico">${icon('grid')}</div><div class="txt"><strong>Browse all</strong><span class="d">Look and listen at your own pace</span></div>${icon('chev', 'chev')}</button>`}
      </div>
      <p class="small" style="margin:12px 4px 0">${isQ(mod) ? 'A question' : 'A bird'} counts as mastered after 3 right answers in a row. ${isQ(mod) ? 'Questions' : 'Birds'} you get wrong come up more often.</p>`);
    const s = $('scope');
    if (s) s.addEventListener('change', () => { settings.scope[mod.id] = s.value; save(SETTINGS_KEY, settings); renderModule(mod); });
    view.querySelectorAll('[data-len]').forEach(b => b.addEventListener('click', () => { settings.length = +b.dataset.len; save(SETTINGS_KEY, settings); renderModule(mod); }));
    view.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => go(`#/m/${mod.id}/quiz/${b.dataset.mode}`)));
    view.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(`#/m/${mod.id}/${b.dataset.go}`)));
  }

  // ---------- quiz ----------
  let reviewItems = null;
  function startQuiz(mod, modeKey, onlyItems) {
    const mode = MODES[modeKey];
    chrome({ focus: true, back: '#/m/' + mod.id, title: mode.title, progress: true });
    const pool = scopedItems(mod).filter(mode.needs);
    const n = settings.length || pool.length;
    const questions = onlyItems ? shuffle(onlyItems.filter(mode.needs)) : pickItems(mod, pool, n);
    const optPool = pool.length >= 4 ? pool : mod.items.filter(mode.needs);
    const state = { i: 0, score: 0, missed: [] };
    if (!questions.length) { show('<p class="empty">Nothing to practise here yet.</p>'); return; }

    function ask() {
      const q = questions[state.i];
      if (modeKey === 'mcq') return askText(q);
      const opts = shuffle([q].concat(distractors(q, optPool, 3)));
      topRight.textContent = `${state.i + 1} / ${questions.length}`;
      setQuizProgress(state.i / questions.length);
      const pics = modeKey === 'call2photo' || modeKey === 'name2photo';
      let prompt;
      if (modeKey === 'photo2name') prompt = `<img class="main" src="${esc(q.photo)}" alt="Bird photo"><div class="q">Which bird is this?</div>`;
      else if (modeKey === 'name2photo') prompt = `<div class="hint">Tap the photo of the</div><div class="big-name">${esc(q.name)}</div>`;
      else prompt = `${playBtnHtml('playQ', '', true)}<div class="q">${modeKey === 'call2photo' ? 'Tap the bird that makes this call' : 'Whose call is this?'}</div><div class="hint">Tap the button to play it again</div>`;
      const optHtml = opts.map((o, k) => pics
        ? `<button class="opt" data-id="${esc(o.id)}" aria-label="Option ${k + 1}"><img src="${esc(o.photo)}" alt=""><span class="cap"></span></button>`
        : `<button class="opt" data-id="${esc(o.id)}"><span class="k">${'ABCD'[k]}</span><span>${esc(o.name)}</span></button>`).join('');
      show(`<div class="card prompt">${prompt}</div><div class="options ${pics ? 'pics' : 'text'}">${optHtml}</div>`);
      document.querySelectorAll('.sheet').forEach(s => s.remove());
      const pb = $('playQ');
      if (pb) { pb.addEventListener('click', () => playCall(q.call, pb)); playCall(q.call, pb); }
      const buttons = [...view.querySelectorAll('.opt')];
      buttons.forEach(b => b.addEventListener('click', () => answer(q, b.dataset.id, buttons, opts, pics)));
      keyHandler = e => {
        const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
        if (k != null && buttons[k] && !buttons[0].disabled) buttons[k].click();
        else if (e.key.toLowerCase() === 'r' && pb) playCall(q.call, pb);
      };
    }

    // Manual question: the right answer + the sheet's wrong answers, shuffled.
    function askText(q) {
      const opts = shuffle([{ id: q.id, name: q.a }].concat(q.w.map((w, k) => ({ id: q.id + '~' + k, name: w }))));
      topRight.textContent = `${state.i + 1} / ${questions.length}`;
      setQuizProgress(state.i / questions.length);
      show(`<div class="card prompt qprompt">
          <div class="qmeta">${esc(q.group || '')}${q.draft ? ' <span class="draft">Draft</span>' : ''}</div>
          <div class="qtext">${esc(q.q)}</div></div>
        <div class="options text one">${opts.map((o, k) => `<button class="opt" data-id="${esc(o.id)}"><span class="k">${'ABCD'[k]}</span><span>${esc(o.name)}</span></button>`).join('')}</div>`);
      document.querySelectorAll('.sheet').forEach(s => s.remove());
      const buttons = [...view.querySelectorAll('.opt')];
      buttons.forEach(b => b.addEventListener('click', () => answer(q, b.dataset.id, buttons, opts, false)));
      keyHandler = e => {
        const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
        if (k != null && buttons[k] && !buttons[0].disabled) buttons[k].click();
      };
    }

    function answer(q, chosenId, buttons, opts, pics) {
      view.dataset.dirty = '1';
      const correct = chosenId === q.id;
      record(mod.id, q.id, correct);
      if (correct) state.score++; else { state.missed.push({ item: q, chose: opts.find(o => o.id === chosenId) }); if (navigator.vibrate) navigator.vibrate(60); }
      buttons.forEach(b => {
        b.disabled = true;
        if (b.dataset.id === q.id) b.classList.add('right');
        else if (b.dataset.id === chosenId) b.classList.add('wrong');
        else b.classList.add('dim');
        if (pics) b.querySelector('.cap').textContent = opts.find(o => o.id === b.dataset.id).name;
      });
      setQuizProgress((state.i + 1) / questions.length);
      const last = state.i === questions.length - 1;
      const img = q.photo && modeKey !== 'photo2name' && !pics ? `<img src="${esc(q.photo)}" alt="">` : '';
      const hear = q.call && (modeKey === 'photo2name' || modeKey === 'name2photo') ? playBtnHtml('fbPlay', 'Hear call') : '';
      const ansLine = modeKey === 'mcq' ? (correct ? esc(q.a) : 'Answer: ' + esc(q.a)) : (correct ? esc(q.name) : 'It is the ' + esc(q.name));
      const explain = modeKey === 'mcq' && (q.ex || q.page) ? `<div class="explain">${esc(q.ex || '')}${q.page ? ` <span class="pg">Manual p.${esc(q.page)}</span>` : ''}</div>` : '';
      const s = sheet(`<div class="verdict"><div class="mark">${icon(correct ? 'check' : 'x')}</div>
          <div class="msg"><strong>${correct ? pickPraise() : 'Not quite'}</strong><span class="ans">${ansLine}</span></div>${img}</div>${explain}
        <div class="actions">${hear}<button class="btn" id="next">${last ? 'See results' : 'Next'}</button></div>`, correct ? 'good' : 'bad');
      const fp = s.querySelector('#fbPlay');
      if (fp) fp.addEventListener('click', () => playCall(q.call, fp));
      const nx = s.querySelector('#next');
      if (usingKeyboard) nx.focus({ preventScroll: true });
      const advance = () => { stopAudio(); state.i++; last ? results() : ask(); };
      nx.addEventListener('click', advance);
      keyHandler = e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
        else if (e.key.toLowerCase() === 'r' && q.call) playCall(q.call, $('playQ') || fp);
      };
    }

    function results() {
      document.querySelectorAll('.sheet').forEach(s => s.remove());
      view.dataset.dirty = '';
      chrome({ focus: true, back: '#/m/' + mod.id, title: 'Results' });
      const p = pct(state.score, questions.length);
      const msg = p === 100 ? 'Perfect round!' : p >= 80 ? 'Great work!' : p >= 50 ? 'Getting there - keep practising.' : 'Keep at it - try the flashcards first.';
      const C = 2 * Math.PI * 64;
      const list = state.missed.map((m, k) => modeKey === 'mcq'
        ? `<li class="qreview"><div class="nm"><span class="qq">${esc(m.item.q)}</span>${esc(m.item.a)}<span class="yours">You chose: ${esc(m.chose ? m.chose.name : '-')}</span>${m.item.page ? `<span class="pg">Manual p.${esc(m.item.page)}</span>` : ''}</div></li>`
        : `<li>${m.item.photo ? `<img src="${esc(m.item.photo)}" alt="">` : `<div class="ph">${icon('sound')}</div>`}
        <div class="nm">${esc(m.item.name)}<span class="yours">You chose: ${esc(m.chose ? m.chose.name : '-')}</span></div>
        ${m.item.call ? `<button class="mini-play" data-call="${esc(m.item.call)}" data-label="Play"><span class="pi">${icon('play')}</span><span class="lbl">Play</span></button>` : ''}</li>`).join('');
      show(`<div class="card result">
          <div class="ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" fill="none" stroke="var(--line)" stroke-width="12"/>
            <circle cx="75" cy="75" r="64" fill="none" stroke="${p >= 50 ? 'var(--good)' : 'var(--accent)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p / 100)}"/></svg>
            <div class="pct">${p}%</div></div>
          <div class="score-line">${state.score} of ${questions.length} correct &middot; ${esc(MODES[modeKey].title)}</div>
          <div class="msg">${msg}</div></div>
        <div class="btn-stack">
          ${state.missed.length ? `<button class="btn" id="again">${state.missed.length === 1 ? 'Practise the one I missed' : `Practise the ${state.missed.length} I missed`}</button>` : ''}
          <button class="btn ${state.missed.length ? 'ghost' : ''}" id="new">New round</button>
          <button class="btn ghost" id="done">Back to ${esc(mod.title)}</button></div>
        ${list ? `<div class="section-title">To review</div><ul class="card review">${list}</ul>` : ''}`);
      const a = $('again');
      if (a) a.addEventListener('click', () => { reviewItems = state.missed.map(m => m.item); go(`#/m/${mod.id}/quiz/${modeKey}/review`); });
      $('new').addEventListener('click', () => go(`#/m/${mod.id}/quiz/${modeKey}`));
      $('done').addEventListener('click', () => go('#/m/' + mod.id));
      view.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => playCall(b.dataset.call, b)));
    }
    ask();
  }
  const PRAISE = ['Correct!', 'Well done!', 'Spot on!', 'Nice one!', 'Great!'];
  const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  // ---------- flashcards ----------
  function startFlash(mod) {
    chrome({ focus: true, back: '#/m/' + mod.id, title: 'Flashcards', progress: true });
    const pool = scopedItems(mod);
    let deck = pickItems(mod, pool, settings.length || pool.length).map(i => Object.assign({}, i));
    let seen = 0, known = 0;
    const total = deck.length;
    function card() {
      if (!deck.length) {
        document.querySelectorAll('.sheet').forEach(s => s.remove());
        view.dataset.dirty = '';
        chrome({ focus: true, back: '#/m/' + mod.id, title: 'Flashcards' });
        show(`<div class="card result"><div class="big-name">${known} / ${total}</div><div class="score-line">cards you knew first time</div></div>
          <div class="btn-stack"><button class="btn" id="new">Another deck</button><button class="btn ghost" id="done">Back to ${esc(mod.title)}</button></div>`);
        $('new').addEventListener('click', () => startFlash(mod));
        $('done').addEventListener('click', () => go('#/m/' + mod.id));
        return;
      }
      const c = deck[0];
      topRight.textContent = `${Math.min(seen + 1, total)} / ${total}`;
      setQuizProgress(seen / total);
      const soundFront = !c.photo;
      if (c.q) { textCard(c); return; }
      const front = soundFront
        ? `${playBtnHtml('fPlay', '', true)}<div class="hint">Whose call is this? Tap the card to check.</div>`
        : `<img src="${esc(c.photo)}" alt="Bird photo"><div class="hint">Who is this? Tap the card to check.</div>`;
      const back = `${c.photo ? `<img src="${esc(c.photo)}" alt="">` : ''}<div class="big-name">${esc(c.name)}</div>
        <div class="small" style="margin-bottom:12px">${esc(c.group || '')}</div>
        ${c.call ? playBtnHtml('bPlay', 'Play call') : '<div class="small">No call recording in the library</div>'}`;
      show(`<div class="flash" id="flash"><div class="flash-inner"><div class="card face front">${front}</div><div class="card face back">${back}</div></div></div>`);
      const flash = $('flash');
      const fp = $('fPlay'), bp = $('bPlay');
      if (fp) { fp.addEventListener('click', () => playCall(c.call, fp)); playCall(c.call, fp); }
      if (bp) bp.addEventListener('click', () => playCall(c.call, bp));
      let flipped = false;
      const showGrade = () => {
        const s = sheet(`<div class="grade"><button class="btn again" id="gAgain">${icon('x')} Again</button><button class="btn know" id="gKnow">${icon('check')} I knew it</button></div>`);
        s.querySelector('#gAgain').addEventListener('click', () => mark(false));
        s.querySelector('#gKnow').addEventListener('click', () => mark(true));
      };
      const showReveal = () => {
        const s = sheet(`<button class="btn block" id="reveal">Show answer</button>`);
        s.querySelector('#reveal').addEventListener('click', flip);
      };
      function flip() { flipped = !flipped; flash.classList.toggle('flipped', flipped); if (flipped) showGrade(); else showReveal(); }
      flash.addEventListener('click', e => { if (!e.target.closest('button')) flip(); });
      showReveal();
      const mark = ok => markCard(c, ok);
      keyHandler = e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
        else if (flipped && (e.key === '1' || e.key === 'ArrowLeft')) mark(false);
        else if (flipped && (e.key === '2' || e.key === 'ArrowRight')) mark(true);
        else if (e.key.toLowerCase() === 'r' && c.call) playCall(c.call, fp || bp);
      };
    }
    function markCard(c, ok) {
      view.dataset.dirty = '1';
      stopAudio();
      if (!c._seen) { record(mod.id, c.id, ok); seen++; if (ok) known++; c._seen = true; }
      deck.shift();
      if (!ok) deck.splice(Math.min(deck.length, 3), 0, c); // comes back in a few cards
      card();
    }
    // Manual question flashcard: question on the front, answer + explanation on the back
    function textCard(c) {
      show(`<div class="flash" id="flash"><div class="flash-inner">
          <div class="card face front qface"><div class="qmeta">${esc(c.group || '')}</div><div class="qtext">${esc(c.q)}</div><div class="hint">Think of your answer, then tap the card.</div></div>
          <div class="card face back qface"><div class="qmeta">Answer</div><div class="big-name">${esc(c.a)}</div>
            ${c.ex ? `<div class="explain">${esc(c.ex)}</div>` : ''}${c.page ? `<div class="small" style="margin-top:8px">Manual p.${esc(c.page)}</div>` : ''}</div>
        </div></div>`);
      const flash = $('flash');
      let flipped = false;
      const showGrade = () => {
        const s = sheet(`<div class="grade"><button class="btn again" id="gAgain">${icon('x')} Again</button><button class="btn know" id="gKnow">${icon('check')} I knew it</button></div>`);
        s.querySelector('#gAgain').addEventListener('click', () => markCard(c, false));
        s.querySelector('#gKnow').addEventListener('click', () => markCard(c, true));
      };
      const showReveal = () => { const s = sheet(`<button class="btn block" id="reveal">Show answer</button>`); s.querySelector('#reveal').addEventListener('click', flip); };
      function flip() { flipped = !flipped; flash.classList.toggle('flipped', flipped); if (flipped) showGrade(); else showReveal(); }
      flash.addEventListener('click', flip);
      showReveal();
      keyHandler = e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
        else if (flipped && (e.key === '1' || e.key === 'ArrowLeft')) markCard(c, false);
        else if (flipped && (e.key === '2' || e.key === 'ArrowRight')) markCard(c, true);
      };
    }
    card();
  }

  // ---------- browse ----------
  function renderBrowse(mod) {
    chrome({ tab: 'home', back: '#/m/' + mod.id, title: mod.title });
    if (isQ(mod)) return renderStudyList(mod);
    const items = scopedItems(mod).slice().sort((a, b) => a.name.localeCompare(b.name));
    show(`<div class="search-wrap" style="position:sticky">${icon('search')}<input class="search" id="q" type="search" placeholder="Search ${items.length} birds" autocomplete="off" aria-label="Search birds"></div>
      <div class="grid" id="grid"></div>`);
    const grid = $('grid');
    function draw(filter) {
      const f = (filter || '').toLowerCase();
      const list = items.filter(i => !f || i.name.toLowerCase().includes(f) || (i.group || '').toLowerCase().includes(f));
      grid.innerHTML = list.map(i => {
        const box = rec(mod.id, i.id).box;
        const dots = [0, 1, 2].map(k => `<i class="${k < box ? 'on' : ''}"></i>`).join('');
        return `<div class="card tile">${i.photo ? `<img loading="lazy" src="${esc(i.photo)}" alt="">` : `<div class="ph">${icon('sound')}</div>`}
          <div class="nm">${esc(i.name)}</div>
          <div class="row"><span class="dots" title="Progress">${dots}</span>
          ${i.call ? `<button class="mini-play" data-call="${esc(i.call)}" data-label="Play" aria-label="Play call of ${esc(i.name)}"><span class="pi">${icon('play')}</span><span class="lbl">Play</span></button>` : ''}</div></div>`;
      }).join('') || '<p class="empty">No birds match your search.</p>';
      grid.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => playCall(b.dataset.call, b)));
    }
    $('q').addEventListener('input', e => draw(e.target.value));
    draw('');
  }

  // Study list for manual questions: grouped by topic, tap a question to show the answer.
  function renderStudyList(mod) {
    const items = scopedItems(mod);
    const groups = [...new Set(items.map(i => i.group || 'General'))];
    show(`<div class="search-wrap" style="position:sticky">${icon('search')}<input class="search" id="q" type="search" placeholder="Search ${items.length} questions" autocomplete="off" aria-label="Search questions"></div>
      <div id="qlist"></div>`);
    const list = $('qlist');
    function draw(filter) {
      const f = (filter || '').toLowerCase();
      list.innerHTML = groups.map(g => {
        const qs = items.filter(i => (i.group || 'General') === g && (!f || (i.q + ' ' + i.a + ' ' + (i.ex || '')).toLowerCase().includes(f)));
        if (!qs.length) return '';
        return `<div class="section-title">${esc(g)}</div><div class="card list">${qs.map(i => `<details class="qa">
            <summary><span>${esc(i.q)}</span>${i.draft ? '<span class="draft">Draft</span>' : ''}</summary>
            <div class="qa-body"><strong>${esc(i.a)}</strong>${i.ex ? `<p>${esc(i.ex)}</p>` : ''}${i.page ? `<span class="pg">Manual p.${esc(i.page)}</span>` : ''}</div></details>`).join('')}</div>`;
      }).join('') || '<p class="empty">No questions match your search.</p>';
    }
    $('q').addEventListener('input', e => draw(e.target.value));
    draw('');
  }

  // ---------- progress ----------
  function renderProgress() {
    chrome({ tab: 'progress' });
    let answered = 0, right = 0, mastered = 0;
    DATA.modules.forEach(m => Object.values(progress[m.id] || {}).forEach(r => { answered += r.right + r.wrong; right += r.right; if (r.box >= MASTERED) mastered++; }));
    const modRows = DATA.modules.map(m => {
      const recs = m.items.map(i => ({ i, r: rec(m.id, i.id) }));
      const d = recs.filter(x => x.r.box >= MASTERED).length;
      const weak = recs.filter(x => x.r.wrong > 0 && x.r.box < MASTERED).sort((a, b) => (b.r.wrong - b.r.right) - (a.r.wrong - a.r.right)).slice(0, 10).map(x => x.i);
      const mode = isQ(m) ? 'mcq' : weak.every(i => i.photo) ? 'photo2name' : 'call2name';
      return { m, d, weak, mode };
    });
    const cards = modRows.map(({ m, d, weak, mode }) => `<div class="pad">
        <h3>${esc(m.title)}</h3>
        <div class="bar"><span style="width:${pct(d, m.items.length)}%"></span></div>
        <div class="bar-label"><span>${d} of ${m.items.length} mastered</span><span>${pct(d, m.items.length)}%</span></div>
        ${weak.length ? `<p style="margin:12px 0 8px">${isQ(m) ? `${plural(weak.length, 'question')} to work on, e.g. "${esc(weak[0].q)}"` : `Birds to work on: ${weak.slice(0, 5).map(i => esc(i.name)).join(', ')}${weak.length > 5 ? '...' : ''}`}</p>
          <button class="btn ghost" data-weak="${m.id}" data-mode="${mode}">Practise these ${weak.length}</button>` : ''}
      </div>`).join('');
    show(`<h1>Your progress</h1><p class="sub">Saved on this device.</p>
      <div class="stat-grid"><div class="card stat"><b>${mastered}</b><span>mastered</span></div>
        <div class="card stat"><b>${answered}</b><span>answers</span></div>
        <div class="card stat"><b>${answered ? pct(right, answered) + '%' : '-'}</b><span>accuracy</span></div></div>
      <div class="section-title">By module</div><div class="card">${cards}</div>
      ${answered ? '<button class="linkish" id="reset">Reset all progress on this device</button>' : '<p class="small" style="margin-top:14px">Do a quiz or some flashcards and your progress will show here.</p>'}
      ${footer()}`);
    view.querySelectorAll('[data-weak]').forEach(b => b.addEventListener('click', () => {
      const r = modRows.find(x => x.m.id === b.dataset.weak);
      reviewItems = r.weak; go(`#/m/${r.m.id}/quiz/${b.dataset.mode}/review`);
    }));
    const rs = $('reset');
    if (rs) rs.addEventListener('click', () => { if (confirm('Reset all your progress on this device? This cannot be undone.')) { progress = {}; save(STORE_KEY, progress); renderProgress(); } });
  }

  // ---------- offline page ----------
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
    if (location.hash === '#/offline') renderOffline(result.failed && !result.cancelled ? `${result.failed} files could not be downloaded. Check your connection and tap Download again.` : '');
  }
  function paintProgress() {
    const el = $('dlProg');
    if (!el || !downloading) return;
    el.querySelector('span').style.width = pct(downloading.done, downloading.total) + '%';
    $('dlText').textContent = `Downloading... ${downloading.done} of ${downloading.total}`;
  }
  async function removeCalls() {
    const cache = await caches.open(MEDIA_CACHE);
    for (const r of await cache.keys()) if (r.url.includes('/media/calls/')) await cache.delete(r);
    await refreshCached(); renderOffline();
  }
  function renderOffline(message) {
    chrome({ tab: 'offline' });
    if (!hasCaches) { show(`<h1>Use offline</h1><p class="sub">This browser can't save content for offline use. Try Chrome on Android or Safari on iPhone.</p>`); return; }
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
      if (busy) action = `<div class="bar" id="dlProg"><span style="width:${pct(downloading.done, downloading.total)}%"></span></div>
          <div class="bar-label"><span id="dlText">Downloading... ${downloading.done} of ${downloading.total}</span><button class="linkish" id="dlCancel" style="padding:0">Cancel</button></div>`;
      else if (!left.length) action = `<span class="done">${icon('check')} Saved on this device</span>`;
      else action = `<button class="btn" data-dl="${p.key}"${downloading || !navigator.onLine ? ' disabled' : ''}>${icon('download')} ${have ? 'Download the rest' : 'Download'} (${mb(bytesOf(left))})</button>`;
      return `<div class="pad"><h3>${esc(p.title)}</h3><p>${p.urls.length} calls &middot; ${mb(bytesOf(p.urls))}${have ? ` &middot; ${have} saved` : ''}</p>${action}</div>`;
    }).join('');

    let install;
    if (isStandalone()) install = `<span class="done">${icon('check')} Installed on this device</span>`;
    else if (installPrompt) install = `<p>Put AGA Study on your home screen so it opens like a normal app.</p><button class="btn" id="installBtn">${icon('phone')} Install app</button>`;
    else if (isIOS) install = `<ol class="steps"><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (the square with an arrow).</li><li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li></ol>`;
    else install = `<ol class="steps"><li>Open this page in <strong>Chrome</strong>.</li><li>Tap the <strong>&#8942;</strong> menu (top right).</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li></ol>`;

    show(`<h1>Use offline</h1>
      <p class="sub">${navigator.onLine ? 'Get set up before you go to camp. Everything you download keeps working with no signal.' : 'You are offline. The app uses the photos and calls already saved on this phone.'}</p>
      ${message ? `<div class="alert">${esc(message)}</div>` : ''}
      <div class="section-title">Step 1 - Install on your phone</div><div class="card pad">${install}</div>
      <div class="section-title">Step 2 - Download content</div>
      <div class="card">
        <div class="pad"><h3>App and all photos</h3><p>Saved automatically the first time you open the app.</p>
          ${photosSaved >= photos.length ? `<span class="done">${icon('check')} Saved on this device</span>` : `<span class="small">${photosSaved} of ${photos.length} photos saved - keep the app open on Wi-Fi for a moment.</span>`}</div>
        ${packHtml}
      </div>
      <p class="small" style="margin:12px 4px 0">Tip: download on Wi-Fi. Most students only need the FGASA 80 calls.</p>
      ${[...cachedSet].some(u => u.includes('/media/calls/')) && !downloading ? '<button class="linkish" id="rmCalls">Remove downloaded calls to free up space</button>' : ''}`);
    view.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => download(b.dataset.dl, packs.find(p => p.key === b.dataset.dl).urls)));
    const c = $('dlCancel'); if (c) c.addEventListener('click', () => { downloading.cancelled = true; });
    const ib = $('installBtn');
    if (ib) ib.addEventListener('click', async () => { installPrompt.prompt(); try { await installPrompt.userChoice; } catch (e) { /* ignore */ } installPrompt = null; renderOffline(); });
    const rm = $('rmCalls');
    if (rm) rm.addEventListener('click', () => { if (confirm('Remove all downloaded calls from this phone? You can download them again later.')) removeCalls(); });
  }

  updateNet();
  route();
  // Once we know what is saved on this device, refresh the screen (counts, offline-only calls).
  refreshCached().then(() => { if (!downloading && !inFocus()) route(); });
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', () => refreshCached());
})();
