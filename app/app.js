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
    // subject icons for the manual chapters
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    star: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    mountain: '<path d="m3 20 6.5-11 4 6.5 2.5-4L21 20z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
    cycle: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12A8 8 0 0 1 18 6.7"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 14 10"/>',
    bug: '<ellipse cx="12" cy="13" rx="5" ry="7"/><path d="M12 6V3M9 4 7 2M15 4l2-2M7 10H3M17 10h4M7 15H3M17 15h4M12 6v14"/>',
    snake: '<path d="M4 18c3 0 3-4 6-4s3 4 6 4 4-2 4-5-2-5-5-5H9a3 3 0 0 1 0-6h7"/>',
    paw: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5a2.5 2.5 0 0 1-4 2 2.5 2.5 0 0 1-4-2z"/>',
    scale: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0zM8 21h8"/>',
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
  // ---------- progress submission to AGA (Google Apps Script -> "AGA Study App - Student Progress" sheet) ----------
  const PROGRESS_URL = 'https://script.google.com/macros/s/AKfycbyJ3sijfiw4uparWC1Di-WnlNS7rl7-HzI6ACw2VhGJPtrzCqvwa4MiM8Wuf1iqcrWgZw/exec';
  const STUDENT_KEY = 'aga-study-student-v1', SESSION_KEY = 'aga-study-session-v1', QUEUE_KEY = 'aga-study-queue-v1', DEVICE_KEY = 'aga-study-device-v1';
  let session = load(SESSION_KEY, { answers: 0, correct: 0, since: Date.now() });
  function deviceId() {
    let d = load(DEVICE_KEY, ''); if (!d) { d = Math.random().toString(36).slice(2, 10); save(DEVICE_KEY, d); } return d;
  }
  function record(modId, itemId, correct) {
    session.answers++; if (correct) session.correct++; save(SESSION_KEY, session);
    progress[modId] = progress[modId] || {};
    const r = Object.assign({}, rec(modId, itemId));
    if (correct) { r.right++; r.box = Math.min(5, r.box + 1); } else { r.wrong++; r.box = 0; }
    r.last = Date.now();
    progress[modId][itemId] = r;
    save(STORE_KEY, progress);
  }
  const masteredCount = (mod, items) => items.filter(i => rec(mod.id, i.id).box >= MASTERED).length;
  const practisedCount = (mod, items) => items.filter(i => { const r = rec(mod.id, i.id); return r.right + r.wrong > 0; }).length;
  // Two-tone bar: light = practised at least once, green = mastered (3 right in a row)
  const progBar = (pr, ms, n) => `<div class="bar bar2"><span class="pr" style="width:${n ? 100 * pr / n : 0}%"></span><span class="ms" style="width:${n ? 100 * ms / n : 0}%"></span></div>`;

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
  // Warm the browser cache for an upcoming call (keeps one hidden Audio element loading in the background)
  const preloader = new Audio(); preloader.preload = 'auto'; preloader.muted = true;
  function preloadCall(item) { if (item && item.call && navigator.onLine) { try { preloader.src = item.call; preloader.load(); } catch (e) { /* ignore */ } } }
  const playBtnHtml = (id, label, big) => big
    ? `<button class="play" id="${id}" aria-label="Play call"><span class="pi">${icon('play')}</span></button>`
    : `<button class="mini-play" id="${id}" data-label="${label}"><span class="pi">${icon('play')}</span><span class="lbl">${label}</span></button>`;

  // ---------- offline ----------
  const MEDIA_CACHE = 'aga-media-v2'; // must match sw.js
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
    mcq: { icon: 'book', title: 'Manual quiz', desc: 'Multiple choice, with explanations', needs: i => !!i.q },
  };
  function scopedItems(mod) {
    const sc = settings.scope[mod.id] || mod.defaultScope || 'all'; // bird calls default to the FGASA 80 ("featured")
    if (sc === 'all') return mod.items;
    if (sc === 'featured' || sc === 'fgasa') { const f = mod.items.filter(i => i.f); return f.length ? f : mod.items; }
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
    if (p[0] === 'submit') return renderSubmit();
    if (p[0] === 'credits') return renderCredits();
    if (p[0] === 'photo') { const m = modById(p[1]); return renderSharePhoto(m, m && m.items.find(i => i.id === p[2])); }
    if (p[0] === 's' && SUBJECTS.find(x => x.id === p[1])) return renderSubject(SUBJECTS.find(x => x.id === p[1]));
    if (p[0] === 'm' && modById(p[1])) {
      const mod = modById(p[1]);
      if (p[2] === 'quiz' && MODES[p[3]]) return startQuiz(mod, p[3], p[4] === 'review' ? reviewItems : null);
      if (p[2] === 'flash') return startFlash(mod);
      if (p[2] === 'browse') return renderBrowse(mod);
      if (p[2] === 'sp' && mod.items.find(i => i.id === p[3])) return renderSpecies(mod, p[3]);
      return renderSubject(subjectOf(mod));
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
  const footer = () => `<div class="foot"><img src="brand/logo-colour.png" alt="African Guide Academy">Pocket Guide &middot; for AGA students
    <div class="foot-links"><a href="#/photo">Share a photo</a> &middot; <a href="#/credits">Photo credits</a></div></div>`;

  // ---------- subjects (one per manual chapter; each groups a photo, a call and a manual-question module) ----------
  const SUBJECTS = [
    { id: 'birds', title: 'Birds', noun: 'bird', blurb: 'Photos, calls and manual questions', photo: 'media/birds/racket-tailed-roller.jpg',
      photoSets: ['fgasa80', 'prominent40', 'kwapa63'], calls: 'calls', manual: 'q-birds' },
    { id: 'amphibians', title: 'Amphibians', noun: 'frog', blurb: 'Frogs - calls and manual questions', photo: 'media/frogs/f-angolan-reed-frog.jpg',
      photoSets: ['amphibians-photos'], calls: 'frog-calls', manual: 'q-amphibians' },
  ];
  if (modById('amphibians-photos')) SUBJECTS[1].blurb = 'Frogs - photos, calls and manual questions';
  const PHOTO_NOUN = { mammals: 'mammal', reptiles: 'reptile', arthropods: 'creature', plants: 'plant', astronomy: 'sky object' };
  // Every other manual chapter that has questions becomes its own (manual-only) subject automatically.
  const CHAPTER_ICON = { 'Guiding Principles': 'compass', 'Astronomy': 'star', 'Geology': 'mountain', 'Weather and Climate': 'cloud', 'Ecology': 'cycle',
    'Plants': 'leaf', 'Arthropods': 'bug', 'Reptiles': 'snake', 'Mammals': 'paw', 'Tourism and Legislation': 'scale' };
  DATA.modules.filter(m => m.kind === 'questions' && !SUBJECTS.some(s => s.manual === m.id)).forEach(m => {
    const ch = m.chapter || m.title.replace(/ - manual$/, '');
    const id = m.id.replace(/^q-/, ''), pm = modById(id + '-photos');
    if (pm) { // chapters with a species photo set get the full subject page (photo quizzes, photo cards, browse)
      const manualPics = pm.items.filter(i => i.f && i.photo);
      SUBJECTS.push({ id, title: ch, noun: PHOTO_NOUN[id] || 'species', blurb: `${pm.items.length} photos and ${m.items.length} manual questions`,
        photo: (manualPics[0] || pm.items[0]).photo, icon: CHAPTER_ICON[ch] || 'book', photoSets: [pm.id], manual: m.id });
      return;
    }
    SUBJECTS.push({ id, title: ch, noun: 'answer', blurb: `${m.items.length} questions from the manual`, photo: m.photo || '',
      icon: CHAPTER_ICON[ch] || 'book', manual: m.id, compact: true });
  });
  // Banner photos must be landscape ("wide") so they fit the wide tile without cutting the animal off.
  // Keep the chosen photo if it is wide; otherwise use the first wide photo of a manual species, then any wide photo.
  // Preferred banner species per subject (used if its photo is landscape).
  const BANNER = { amphibians: ['Painted Reed Frog', 'Long Reed Frog', 'Bubbling Kassina'], mammals: ['Elephant', 'Leopard', 'African Wild Dog'],
    reptiles: ['Southern African python', 'Black mamba'], arthropods: ['Golden orb-web spider', 'Ball-rolling dung beetle (Scarabaeus)', 'Praying mantis (Mantodea)'],
    plants: ['Leadwood', 'Knob-thorn', 'Kalahari apple-leaf'], astronomy: ['Milky Way', 'The Milky Way', 'Southern Cross', 'Orion'] };
  SUBJECTS.forEach(s => {
    const items = (s.photoSets || []).map(modById).filter(Boolean).flatMap(m => m.items).filter(i => i.photo);
    if (!items.length) return;
    const cur = items.find(i => i.photo === s.photo);
    const pick = (BANNER[s.id] || []).map(n => items.find(i => i.name === n && i.wide)).find(Boolean)
      || (cur && cur.wide ? cur : null) || items.find(i => i.wide && i.f) || items.find(i => i.wide);
    if (pick) s.photo = pick.photo;
  });
  const ALL_CHAPTERS = ['Guiding Principles', 'Astronomy', 'Geology', 'Weather and Climate', 'Ecology', 'Plants', 'Arthropods', 'Reptiles', 'Mammals', 'Tourism and Legislation'];
  const COMING_SOON = ALL_CHAPTERS.filter(c => !SUBJECTS.some(s => s.title === c));
  const photoSetsOf = s => (s.photoSets || [s.photos]).filter(id => id && modById(id) && modById(id).items.length);
  // the photo set chosen in the subject's "Bird list" setting (first one by default)
  const currentPhotoMod = s => { const ids = photoSetsOf(s); const want = (settings.photoSet || {})[s.id]; return modById(ids.includes(want) ? want : ids[0]); };
  const subjectModIds = s => [...photoSetsOf(s), s.calls, s.manual].filter(Boolean);
  const subjectOf = mod => SUBJECTS.find(s => subjectModIds(s).includes(mod.id)) || SUBJECTS[0];
  const homeOf = mod => '#/s/' + subjectOf(mod).id;
  const subjectMods = s => subjectModIds(s).map(modById).filter(Boolean);
  function subjectProgress(s) {
    let d = 0, n = 0;
    let pr = 0;
    subjectMods(s).forEach(m => { d += masteredCount(m, m.items); pr += practisedCount(m, m.items); n += m.items.length; });
    return { d, n, pr };
  }
  // Quiz wording per subject ("Name the bird" / "Name the frog")
  const modeTitle = (k, mod) => {
    const noun = subjectOf(mod).noun || 'bird';
    return ({ photo2name: `Name the ${noun}`, name2photo: `Find the ${noun}` })[k] || MODES[k].title;
  };

  // ---------- home ----------
  function renderHome() {
    chrome({ tab: 'home' });
    const fg = modById('fgasa80');
    const wide = fg.items.filter(i => i.photo && i.wide);
    const heroPhoto = shuffle(wide.length ? wide : fg.items.filter(i => i.photo))[0].photo;
    // big photo tiles for the media subjects (Birds, Amphibians); compact icon tiles for manual-only chapters
    const compactTiles = SUBJECTS.filter(s => s.compact && subjectMods(s).length).map(s => {
      const { d, n, pr } = subjectProgress(s);
      return `<a class="card subject-sm" href="#/s/${s.id}"><div class="tile-ico">${icon(s.icon || 'book')}</div>
        <strong>${esc(s.title)}</strong>${progBar(pr, d, n)}<span class="small">${pr ? `${pr}/${n} practised` : `${n} questions`}</span></a>`;
    }).join('');
    const tiles = SUBJECTS.filter(s => !s.compact && subjectMods(s).length).map(s => {
      const { d, n, pr } = subjectProgress(s);
      return `<a class="card subject" href="#/s/${s.id}">
        <div class="subject-img" style="background-image:url('${esc(s.photo)}')"></div>
        <div class="subject-body"><h3>${esc(s.title)}</h3><p>${esc(s.blurb)}</p>
          ${progBar(pr, d, n)}
          <div class="bar-label"><span>${pr ? `${pr} practised &middot; ${d} mastered` : 'Not started yet'}</span><span class="go">Open ${icon('chev')}</span></div></div></a>`;
    }).join('');
    const soon = COMING_SOON.map(t => `<span class="soon">${esc(t)}</span>`).join('');
    const savedCalls = callList(DATA.modules).filter(u => cachedSet.has(abs(u))).length;
    const nudge = hasCaches && !savedCalls ? `<a class="card nudge" href="#/offline"><div class="tile-ico">${icon('download')}</div>
      <div><strong>Studying in camp?</strong><span class="small">Download the calls so the app works with no signal.</span></div>${icon('chev', 'chev')}</a>` : '';
    const previewNote = DATA.preview ? `<div class="alert" style="margin-bottom:14px"><strong>Preview mode</strong> - includes Draft questions that are still being reviewed.</div>` : '';
    show(`${previewNote}<section class="hero compact" style="background-image:url('${esc(heroPhoto)}')">
        <div class="eyebrow">African Guide Academy</div>
        <h1>Pocket Guide</h1>
        <p>Choose a subject to practise for your guiding exams.</p>
      </section>
      <div class="section-title">Subjects</div>
      <div class="subject-list">${tiles}</div>
      ${compactTiles ? `<div class="section-title">Manual chapters</div><div class="subject-grid">${compactTiles}</div>` : ''}
      ${COMING_SOON.length ? `<div class="card coming"><div class="small" style="margin-bottom:8px">Coming soon</div><div class="soon-wrap">${soon}</div></div>` : ''}
      ${nudge}${footer()}`);
  }

  // ---------- subject page: every quiz and study tool for one subject ----------
  function renderSubject(s) {
    chrome({ tab: 'home', back: '#/' });
    const pm = currentPhotoMod(s), cm = modById(s.calls), qm = modById(s.manual);
    const sets = photoSetsOf(s).map(modById);
    // photo sets with a "featured" subset (species in the manual) get a Show setting: in the manual / all / one group
    const psc = pm ? (settings.scope[pm.id] || pm.defaultScope || 'all') : 'all';
    const pgroups = pm && pm.featured ? [...new Set(pm.items.map(i => i.group).filter(Boolean))].sort() : [];
    const showSel = pm && pm.featured ? `<div class="setting-row"><label for="photoScope">Show</label><select class="select" id="photoScope">
        <option value="all"${psc === 'all' ? ' selected' : ''}>All ${pm.items.length} ${esc(pm.short ? pm.short.toLowerCase() : 'species')}</option>
        <option value="featured"${psc === 'featured' ? ' selected' : ''}>${esc(pm.featured)} (${pm.items.filter(i => i.f).length})</option>
        <optgroup label="One group">${pgroups.map(g => `<option value="${esc(g)}"${psc === g ? ' selected' : ''}>${esc(g)} (${pm.items.filter(i => i.group === g).length})</option>`).join('')}</optgroup>
      </select></div>` : '';
    const setSel = sets.length > 1 ? `<div class="setting-row"><label for="photoSet">${esc((s.noun || 'bird').replace(/^./, c => c.toUpperCase()))} list</label><select class="select" id="photoSet">
        ${sets.map(m => `<option value="${esc(m.id)}"${pm && pm.id === m.id ? ' selected' : ''}>${esc(m.short || m.title)} (${m.items.length})</option>`).join('')}
      </select></div>` : '';
    const { d, n, pr } = subjectProgress(s);
    const lens = [10, 20, 0].map(x => `<button data-len="${x}" aria-pressed="${settings.length === x}">${x || 'All'}</button>`).join('');
    // calls setting: featured set / all / one group
    const csc = cm ? (settings.scope[cm.id] || cm.defaultScope || 'all') : 'all';
    const cgroups = cm ? [...new Set(cm.items.map(i => i.group).filter(Boolean))].sort() : [];
    const callSel = cm ? `<div class="setting-row"><label for="callScope">Calls</label><select class="select" id="callScope">
        ${cm.featured ? `<option value="featured"${csc === 'featured' || csc === 'fgasa' ? ' selected' : ''}>${esc(cm.featured)} (${cm.items.filter(i => i.f).length})</option>` : ''}
        <option value="all"${csc === 'all' ? ' selected' : ''}>All ${cm.items.length} calls</option>
        <optgroup label="One group">${cgroups.map(g => `<option value="${esc(g)}"${csc === g ? ' selected' : ''}>${esc(g)} (${cm.items.filter(i => i.group === g).length})</option>`).join('')}</optgroup>
      </select></div>` : '';
    const qsc = qm ? (settings.scope[qm.id] || 'all') : 'all';
    const topicSel = qm ? `<div class="setting-row"><label for="qScope">Manual topic</label><select class="select" id="qScope">
        <option value="all"${qsc === 'all' ? ' selected' : ''}>All topics (${qm.items.length})</option>
        ${[...new Set(qm.items.map(i => i.group).filter(Boolean))].map(g => `<option value="${esc(g)}"${qsc === g ? ' selected' : ''}>${esc(g)} (${qm.items.filter(i => i.group === g).length})</option>`).join('')}
      </select></div>` : '';

    const tile = (href, ic, title, sub, ok = true) => ok
      ? `<a class="card act" href="${href}"><div class="tile-ico">${icon(ic)}</div><strong>${title}</strong><span>${sub}</span></a>`
      : `<div class="card act off"><div class="tile-ico">${icon(ic)}</div><strong>${title}</strong><span>${navigator.onLine ? 'Not enough in this selection' : 'Download calls to use offline'}</span></div>`;
    const has = (m, k) => m && modesFor(m).includes(k);
    // "12 practised · 3 mastered" for a section header (or "0 of 40" before starting)
    const mp = m => { if (!m) return ''; const p = practisedCount(m, m.items), x = masteredCount(m, m.items); return p ? `${p} practised &middot; ${x} mastered` : `0 of ${m.items.length} practised`; };
    const section = (title, sub, tiles) => tiles ? `<div class="section-title">${title}${sub ? `<span class="sec-sub">${sub}</span>` : ''}</div><div class="act-grid">${tiles}</div>` : '';
    // call-to-photo uses the photo module if its items have calls (birds), else the call library's items that have photos (frogs)
    const both = m => m ? m.items.filter(i => i.call && i.photo).length : 0;
    const matchMod = both(pm) >= 4 ? pm : both(cm) >= 4 ? cm : (pm || cm);
    const noun = s.noun || 'bird';

    show(`<section class="mod-head${s.photo ? '' : ' plain'}" style="${s.photo ? `background-image:url('${esc(s.photo)}')` : ''}">
        ${s.photo ? '' : `<div class="head-ico">${icon(s.icon || 'book')}</div>`}
        <h1>${esc(s.title)}</h1><p>${esc(s.blurb)}</p>
        ${progBar(pr, d, n)}
        <div class="bar-label"><span>${pr} of ${n} practised &middot; ${d} mastered</span><span>${pct(d, n)}%</span></div>
      </section>
      <div class="section-title">Settings</div>
      <div class="card"><div class="setting-row"><label>Questions per round</label><div class="seg">${lens}</div></div>${setSel}${showSel}${callSel}${topicSel}</div>
      ${pm ? section('By sight', mp(pm),
        tile(`#/m/${pm.id}/quiz/photo2name`, 'camera', `Name the ${noun}`, 'See a photo, pick the name') +
        tile(`#/m/${pm.id}/quiz/name2photo`, 'search', `Find the ${noun}`, 'Read a name, tap the photo')) : ''}
      ${cm ? section('By sound', mp(cm),
        tile(`#/m/${cm.id}/quiz/call2name`, 'sound', 'Whose call is this?', `Listen, pick the ${noun}`, has(cm, 'call2name')) +
        (matchMod && matchMod.items.filter(i => i.call && i.photo).length >= 4
          ? tile(`#/m/${matchMod.id}/quiz/call2photo`, 'match', 'Match call to photo', 'Listen, tap the photo', has(matchMod, 'call2photo')) : '')) : ''}
      ${qm ? section('Manual knowledge', mp(qm),
        tile(`#/m/${qm.id}/quiz/mcq`, 'book', 'Manual quiz', 'Multiple choice with explanations') +
        tile(`#/m/${qm.id}/browse`, 'list', 'Study list', 'Every question and answer')) : ''}
      ${section('Flashcards', '',
        (pm ? tile(`#/m/${pm.id}/flash`, 'camera', 'Photo cards', 'Who is this?') : '') +
        (cm ? tile(`#/m/${cm.id}/flash`, 'sound', 'Call cards', 'Whose call?') : '') +
        (qm ? tile(`#/m/${qm.id}/flash`, 'cards', 'Question cards', 'From the manual') : '') +
        ((pm || cm) ? tile(`#/m/${(pm || cm).id}/browse`, 'grid', `Browse ${s.title.toLowerCase()}`, pm ? (cm || pm.items.some(i => i.call) ? 'Photos and calls' : 'Photos and facts') : 'Listen to every call') : ''))}
      <p class="small" style="margin:14px 4px 0">An item counts as mastered after 3 right answers in a row. Anything you get wrong comes up more often.</p>`);
    view.querySelectorAll('[data-len]').forEach(b => b.addEventListener('click', () => {
      settings.length = +b.dataset.len; save(SETTINGS_KEY, settings);
      view.querySelectorAll('[data-len]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    const ps = $('photoSet'); if (ps) ps.addEventListener('change', () => { settings.photoSet = Object.assign({}, settings.photoSet, { [s.id]: ps.value }); save(SETTINGS_KEY, settings); renderSubject(s); });
    const pss = $('photoScope'); if (pss) pss.addEventListener('change', () => { settings.scope[pm.id] = pss.value; save(SETTINGS_KEY, settings); renderSubject(s); });
    const cs = $('callScope'); if (cs) cs.addEventListener('change', () => { settings.scope[cm.id] = cs.value; save(SETTINGS_KEY, settings); renderSubject(s); });
    const qs = $('qScope'); if (qs) qs.addEventListener('change', () => { settings.scope[qm.id] = qs.value; save(SETTINGS_KEY, settings); renderSubject(s); });
  }


  // ---------- quiz ----------
  let reviewItems = null;
  function startQuiz(mod, modeKey, onlyItems) {
    const mode = MODES[modeKey];
    chrome({ focus: true, back: homeOf(mod), title: modeTitle(modeKey, mod), progress: true });
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
      const noun = subjectOf(mod).noun || 'bird'; // "bird" / "frog"
      if (modeKey === 'photo2name') prompt = `<img class="main" src="${esc(q.photo)}" alt="Photo"><div class="q">Which ${noun} is this?</div>`;
      else if (modeKey === 'name2photo') prompt = `<div class="hint">Tap the photo of the</div><div class="big-name">${esc(q.name)}</div>`;
      else prompt = `${playBtnHtml('playQ', '', true)}<div class="q">${modeKey === 'call2photo' ? `Tap the ${noun} that makes this call` : 'Whose call is this?'}</div><div class="hint">Tap the button to play it again</div>`;
      const optHtml = opts.map((o, k) => pics
        ? `<button class="opt" data-id="${esc(o.id)}" aria-label="Option ${k + 1}"><img src="${esc(o.photo)}" alt=""><span class="cap"></span></button>`
        : `<button class="opt" data-id="${esc(o.id)}"><span class="k">${'ABCD'[k]}</span><span>${esc(o.name)}</span></button>`).join('');
      show(`<div class="card prompt">${prompt}</div><div class="options ${pics ? 'pics' : 'text'}">${optHtml}</div>`);
      document.querySelectorAll('.sheet').forEach(s => s.remove());
      const pb = $('playQ');
      if (pb) { pb.addEventListener('click', () => playCall(q.call, pb)); playCall(q.call, pb); }
      preloadCall(questions[state.i + 1]); // start loading the next question's call now, so it plays instantly
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
      chrome({ focus: true, back: homeOf(mod), title: 'Results' });
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
          <button class="btn ghost" id="done">Back to ${esc(subjectOf(mod).title)}</button>
          <a class="btn ghost" href="#/submit">${icon('check')} Finished? Submit my progress</a></div>
        ${list ? `<div class="section-title">To review</div><ul class="card review">${list}</ul>` : ''}`);
      const a = $('again');
      if (a) a.addEventListener('click', () => { reviewItems = state.missed.map(m => m.item); go(`#/m/${mod.id}/quiz/${modeKey}/review`); });
      $('new').addEventListener('click', () => go(`#/m/${mod.id}/quiz/${modeKey}`));
      $('done').addEventListener('click', () => go(homeOf(mod)));
      view.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => playCall(b.dataset.call, b)));
    }
    ask();
  }
  const PRAISE = ['Correct!', 'Well done!', 'Spot on!', 'Nice one!', 'Great!'];
  const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  // ---------- flashcards ----------
  function startFlash(mod) {
    const isCallMod = mod.id === subjectOf(mod).calls;
    const cardTitle = isQ(mod) ? 'Question cards' : isCallMod ? 'Call cards' : 'Photo cards';
    chrome({ focus: true, back: homeOf(mod), title: cardTitle, progress: true });
    const pool = scopedItems(mod);
    let deck = pickItems(mod, pool, settings.length || pool.length).map(i => Object.assign({}, i));
    let seen = 0, known = 0;
    const total = deck.length;
    function card() {
      if (!deck.length) {
        document.querySelectorAll('.sheet').forEach(s => s.remove());
        view.dataset.dirty = '';
        chrome({ focus: true, back: homeOf(mod), title: cardTitle });
        show(`<div class="card result"><div class="big-name">${known} / ${total}</div><div class="score-line">cards you knew first time</div></div>
          <div class="btn-stack"><button class="btn" id="new">Another deck</button><button class="btn ghost" id="done">Back to ${esc(subjectOf(mod).title)}</button></div>`);
        $('new').addEventListener('click', () => startFlash(mod));
        $('done').addEventListener('click', () => go(homeOf(mod)));
        return;
      }
      const c = deck[0];
      topRight.textContent = `${Math.min(seen + 1, total)} / ${total}`;
      setQuizProgress(seen / total);
      const soundFront = isCallMod || !c.photo; // call cards: listen first, photo on the back
      if (c.q) { textCard(c); return; }
      const front = soundFront
        ? `${playBtnHtml('fPlay', '', true)}<div class="hint">Whose call is this? Tap the card to check.</div>`
        : `<img src="${esc(c.photo)}" alt="Photo"><div class="hint">Who is this? Tap the card to check.</div>`;
      const back = `${c.photo ? `<img src="${esc(c.photo)}" alt="">` : ''}<div class="big-name">${esc(c.name)}</div>
        <div class="small" style="margin-bottom:12px">${esc(c.group || '')}</div>
        ${c.call ? playBtnHtml('bPlay', 'Play call') : '<div class="small">No call recording in the library</div>'}
        ${INFO[c.name] && INFO[c.name].titbit ? `<div class="titbit small-tb">${esc(INFO[c.name].titbit)}</div>` : ''}`;
      show(`<div class="flash" id="flash"><div class="flash-inner"><div class="card face front">${front}</div><div class="card face back">${back}</div></div></div>`);
      const flash = $('flash');
      const fp = $('fPlay'), bp = $('bPlay');
      if (fp) { fp.addEventListener('click', () => playCall(c.call, fp)); playCall(c.call, fp); }
      preloadCall(deck[1]);
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
    const subj = subjectOf(mod);
    chrome({ tab: 'home', back: homeOf(mod), title: isQ(mod) ? 'Study list' : 'Browse ' + subj.title.toLowerCase() });
    if (isQ(mod)) return renderStudyList(mod);
    const items = scopedItems(mod).slice().sort((a, b) => a.name.localeCompare(b.name));
    show(`<div class="search-wrap" style="position:sticky">${icon('search')}<input class="search" id="q" type="search" placeholder="Search ${items.length} ${esc(subj.title.toLowerCase())}" autocomplete="off" aria-label="Search"></div>
      <div class="grid" id="grid"></div>
      <p class="small" style="margin:16px 4px 0">Tap a photo for facts. Missing a species, or have a better photo? <a href="#/photo/${mod.id}">Share a photo</a>.</p>`);
    const grid = $('grid');
    function draw(filter) {
      const f = (filter || '').toLowerCase();
      const list = items.filter(i => !f || i.name.toLowerCase().includes(f) || (i.group || '').toLowerCase().includes(f));
      grid.innerHTML = list.map(i => {
        const box = rec(mod.id, i.id).box;
        const dots = [0, 1, 2].map(k => `<i class="${k < box ? 'on' : ''}"></i>`).join('');
        return `<div class="card tile"><a class="tile-link" href="#/m/${mod.id}/sp/${esc(i.id)}" aria-label="About the ${esc(i.name)}">${i.photo ? `<img loading="lazy" src="${esc(i.photo)}" alt="">` : `<div class="ph">${icon('sound')}</div>`}
          ${INFO[i.name] ? `<span class="info-dot" aria-hidden="true">i</span>` : ''}
          <div class="nm">${esc(i.name)}</div></a>
          <div class="row"><span class="dots" title="Progress">${dots}</span>
          ${i.call ? `<button class="mini-play" data-call="${esc(i.call)}" data-label="Play" aria-label="Play call of ${esc(i.name)}"><span class="pi">${icon('play')}</span><span class="lbl">Play</span></button>` : ''}</div></div>`;
      }).join('') || '<p class="empty">Nothing matches your search.</p>';
      grid.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => playCall(b.dataset.call, b)));
    }
    const q = $('q');
    q.value = browseFilter[mod.id] || '';
    q.addEventListener('input', e => { browseFilter[mod.id] = e.target.value; draw(e.target.value); });
    draw(q.value);
  }
  const browseFilter = {};

  // ---------- species page (tap a tile in Browse) ----------
  const INFO = DATA.info || {};
  const FACTS = [['size', 'Size'], ['habitat', 'Where it lives'], ['food', 'Food'], ['breeding', 'Breeding']];
  function renderSpecies(mod, id) {
    const subj = subjectOf(mod);
    const items = scopedItems(mod).slice().sort((a, b) => a.name.localeCompare(b.name));
    const k = items.findIndex(i => i.id === id);
    const it = k >= 0 ? items[k] : mod.items.find(i => i.id === id);
    const info = INFO[it.name];
    chrome({ tab: 'home', back: `#/m/${mod.id}/browse`, title: it.name });
    const nav = (j, dir) => j >= 0 && j < items.length ? `<a class="btn ghost sp-nav ${dir > 0 ? 'nx' : ''}" href="#/m/${mod.id}/sp/${esc(items[j].id)}">${dir < 0 ? '&lsaquo; ' : ''}${esc(items[j].name)}${dir > 0 ? ' &rsaquo;' : ''}</a>` : '<span></span>';
    const LABELS = { plants: { size: 'Size and form', food: 'Uses', breeding: 'Flowers and fruit' },
      astronomy: { size: 'What it is', habitat: 'Where and when to look', food: 'How to find it', breeding: 'Stories and beliefs' } };
    const label = (f, l) => (LABELS[subj.id] || {})[f] || l;
    const facts = info ? FACTS.filter(([f]) => info[f]).map(([f, l]) => `<div class="fact"><div class="fl">${label(f, l)}</div><div class="fv">${esc(info[f])}</div></div>`).join('') : '';
    show(`<div class="card species">
        ${it.photo ? `<img class="sp-photo" src="${esc(it.photo)}" alt="${esc(it.name)}">` : ''}
        <div class="sp-body">
          <h1 class="sp-name">${esc(it.name)}</h1>
          ${it.group ? `<div class="small">${esc(it.group)}${it.sci ? ` &middot; <i>${esc(it.sci)}</i>` : ''}</div>` : ''}
          ${it.call ? `<div style="margin-top:12px">${playBtnHtml('spPlay', 'Play call')}</div>` : ''}
          ${info && info.titbit ? `<div class="titbit"><div class="fl">Did you know?</div>${esc(info.titbit)}</div>` : ''}
          ${facts ? `<div class="facts">${facts}</div>` : ''}
          ${!info ? `<p class="small" style="margin-top:14px">No fact card for this ${esc(subj.noun || 'species')} yet.</p>` : ''}
          ${info && info.draft ? `<p class="small draft-note"><span class="draft">Draft</span> Facts still being checked by AGA trainers.</p>` : ''}
          ${it.photo && it.credit ? `<p class="small credit">Photo: ${esc(it.credit)}${it.license ? ` (${esc(it.license)})` : ''}${it.src ? ` &middot; <a href="${esc(it.src)}" target="_blank" rel="noopener">source</a>` : ''}</p>` : ''}
          <a class="btn ghost block" style="margin-top:14px" href="#/photo/${mod.id}/${esc(it.id)}">${icon('camera')} ${it.photo ? 'Send a better photo' : 'Send a photo'}</a>
        </div></div>
      ${k >= 0 ? `<div class="sp-pager">${nav(k - 1, -1)}${nav(k + 1, 1)}</div>` : ''}`);
    const b = $('spPlay');
    if (b) b.addEventListener('click', () => playCall(it.call, b));
    keyHandler = e => {
      if (e.key === 'ArrowLeft' && k > 0) go(`#/m/${mod.id}/sp/${items[k - 1].id}`);
      else if (e.key === 'ArrowRight' && k >= 0 && k < items.length - 1) go(`#/m/${mod.id}/sp/${items[k + 1].id}`);
    };
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
    let answered = 0, right = 0, mastered = 0, practised = 0, last = 0;
    DATA.modules.forEach(m => Object.values(progress[m.id] || {}).forEach(r => {
      answered += r.right + r.wrong; right += r.right; if (r.right + r.wrong) practised++; if (r.box >= MASTERED) mastered++; if (r.last > last) last = r.last;
    }));
    const modRows = DATA.modules.map(m => {
      const recs = m.items.map(i => ({ i, r: rec(m.id, i.id) }));
      const d = recs.filter(x => x.r.box >= MASTERED).length;
      const pr = recs.filter(x => x.r.right + x.r.wrong > 0).length;
      const weak = recs.filter(x => x.r.wrong > 0 && x.r.box < MASTERED).sort((a, b) => (b.r.wrong - b.r.right) - (a.r.wrong - a.r.right)).slice(0, 10).map(x => x.i);
      const mode = isQ(m) ? 'mcq' : weak.every(i => i.photo) ? 'photo2name' : 'call2name';
      return { m, d, pr, weak, mode };
    });
    const ago = t => { const mins = Math.round((Date.now() - t) / 60000); return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`; };
    // group the lists under their subject (Birds, Amphibians)
    const cards = SUBJECTS.map(s => {
      const rows = modRows.filter(x => subjectModIds(s).includes(x.m.id));
      if (!rows.length) return '';
      return `<div class="section-title">${esc(s.title)}</div><div class="card">${rows.map(({ m, d, pr, weak, mode }) => `<div class="pad">
        <h3>${esc(m.short || m.title)}</h3>
        ${progBar(pr, d, m.items.length)}
        <div class="bar-label"><span>${pr} of ${m.items.length} practised &middot; ${d} mastered</span><span>${pct(d, m.items.length)}%</span></div>
        ${weak.length ? `<p style="margin:12px 0 8px">${isQ(m) ? `${plural(weak.length, 'question')} to work on, e.g. "${esc(weak[0].q)}"` : `To work on: ${weak.slice(0, 5).map(i => esc(i.name)).join(', ')}${weak.length > 5 ? '...' : ''}`}</p>
          <button class="btn ghost" data-weak="${m.id}" data-mode="${mode}">Practise these ${weak.length}</button>` : ''}
      </div>`).join('')}</div>`;
    }).join('');
    const st = load(STUDENT_KEY, {});
    const pending = load(QUEUE_KEY, []).length;
    const submitCard = `<a class="card nudge" href="#/submit" style="margin:0 0 14px"><div class="tile-ico">${icon('check')}</div>
      <div><strong>Submit my progress to AGA</strong><span class="small">${pending ? `${pending} submission waiting for signal` : st.lastSent ? `Last submitted ${ago(st.lastSent)}` : 'Send your results to your instructors'}${session.answers ? ` &middot; ${session.answers} new answers` : ''}</span></div>${icon('chev', 'chev')}</a>`;
    show(`<h1>Your progress</h1><p class="sub">${last ? `Last studied ${ago(last)}.` : 'You have not started yet.'}</p>${submitCard}
      <div class="stat-grid four"><div class="card stat"><b>${practised}</b><span>practised</span></div>
        <div class="card stat"><b>${mastered}</b><span>mastered</span></div>
        <div class="card stat"><b>${answered}</b><span>answers</span></div>
        <div class="card stat"><b>${answered ? pct(right, answered) + '%' : '-'}</b><span>accuracy</span></div></div>
      <p class="small" style="margin:10px 4px 0"><span class="legend pr"></span> practised &nbsp; <span class="legend ms"></span> mastered (right 3 times in a row)</p>
      ${cards}
      <div class="card pad" style="margin-top:16px"><h3>Where is my progress saved?</h3>
        <p style="margin:0">On this phone, in this browser. The installed app, Safari/Chrome and links opened inside WhatsApp each keep their own progress - so always study from the same place (the installed app is best).</p></div>
      ${answered ? '<button class="linkish" id="reset">Reset all progress on this device</button>' : ''}
      ${footer()}`);
    view.querySelectorAll('[data-weak]').forEach(b => b.addEventListener('click', () => {
      const r = modRows.find(x => x.m.id === b.dataset.weak);
      reviewItems = r.weak; go(`#/m/${r.m.id}/quiz/${b.dataset.mode}/review`);
    }));
    const rs = $('reset');
    if (rs) rs.addEventListener('click', () => { if (confirm('Reset all your progress on this device? This cannot be undone.')) { progress = {}; save(STORE_KEY, progress); renderProgress(); } });
  }

  // ---------- submit progress ----------
  function progressSummary() {
    let answered = 0, correct = 0, practised = 0, mastered = 0, last = 0;
    const lists = DATA.modules.map(m => {
      let pr = 0, ms = 0;
      m.items.forEach(i => { const r = rec(m.id, i.id); const n = r.right + r.wrong; answered += n; correct += r.right; if (n) { pr++; practised++; } if (r.box >= MASTERED) { ms++; mastered++; } if (r.last > last) last = r.last; });
      return { title: (subjectOf(m).title + ' - ' + (m.short || m.title)), practised: pr, mastered: ms, total: m.items.length };
    }).filter(l => l.practised);
    return { totals: { answered, correct, practised, mastered, last }, lists };
  }
  async function postProgress(payload) {
    const body = JSON.stringify(payload);
    // Only a confirmed {ok:true} from the AGA script counts as sent; anything else is kept and retried later.
    try {
      const r = await fetch(PROGRESS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
      const j = await r.json();
      return j && j.ok ? 'ok' : (j && j.error === 'missing details' ? 'rejected' : 'offline');
    } catch (e) {
      return 'offline';
    }
  }
  async function flushQueue() {
    const q = load(QUEUE_KEY, []);
    if (!q.length || !navigator.onLine) return;
    const left = [];
    for (const p of q) { if ((await postProgress(p)) === 'offline') left.push(p); }
    save(QUEUE_KEY, left);
    if (left.length < q.length) { const st = load(STUDENT_KEY, {}); st.lastSent = Date.now(); save(STUDENT_KEY, st); }
  }
  window.addEventListener('online', () => flushQueue());
  setInterval(() => flushQueue(), 5 * 60 * 1000); // retry waiting submissions every 5 minutes while the app is open
  // ---------- share a photo (students send photos for the Pocket Guide; a trainer approves them first) ----------
  // Shrinks the photo on the phone (max 1600 px, JPEG) before sending, so it uploads quickly on a weak signal.
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('not an image'));
      img.src = URL.createObjectURL(file);
    });
  }
  function renderSharePhoto(mod, it) {
    const back = it ? `#/m/${mod.id}/sp/${it.id}` : '#/';
    chrome({ tab: 'home', back, title: 'Share a photo' });
    const st = load(STUDENT_KEY, {});
    show(`<h1>Share a photo</h1>
      <p class="sub">Took a good photo${it ? ` of ${/^[aeiou]/i.test(it.name) ? 'an' : 'a'} ${esc(it.name)}` : ''}? Send it to African Guide Academy. If a trainer approves it, it can be used in the Pocket Guide with your name as the credit.</p>
      ${it && it.photo ? `<div class="card share-now"><img src="${esc(it.photo)}" alt=""><div><strong>${esc(it.name)}</strong><span class="small">Current photo${it.credit ? ` &middot; ${esc(it.credit)}` : ''}</span></div></div>` : ''}
      <form class="card pad form" id="pform">
        ${it ? '' : `<label>What is in the photo? (species name)<input name="species" required maxlength="80" placeholder="e.g. Red lechwe"></label>`}
        <label>Photo<input type="file" name="photo" accept="image/*" required id="pfile"></label>
        <img id="pprev" class="share-prev" alt="" hidden>
        <label>Where was it taken? (optional)<input name="where" maxlength="120" placeholder="e.g. Khwai, Moremi Game Reserve"></label>
        <label>First name(s)<input name="first" required maxlength="80" autocomplete="given-name" value="${esc(st.first || '')}"></label>
        <label>Surname<input name="surname" required maxlength="80" autocomplete="family-name" value="${esc(st.surname || '')}"></label>
        <label>Omang / Passport number (optional, links it to your student profile)<input name="idno" maxlength="40" autocomplete="off" value="${esc(st.idno || '')}"></label>
        <label class="check"><input type="checkbox" name="consent" required> I took this photo myself, and AGA may use it in its study materials with my name as the credit.</label>
        <button class="btn block" type="submit" id="pbtn">${icon('camera')} Send photo</button>
        <p class="small" style="margin:10px 0 0">You need signal to send a photo. Photos are checked by a trainer before they appear in the app.</p>
      </form>`);
    let dataUrl = '';
    $('pfile').addEventListener('change', async e => {
      const f = e.target.files[0]; const prev = $('pprev');
      if (!f) { prev.hidden = true; dataUrl = ''; return; }
      try { dataUrl = await shrinkPhoto(f); prev.src = dataUrl; prev.hidden = false; }
      catch (x) { dataUrl = ''; prev.hidden = true; alert('That file could not be opened as a photo. Please choose a JPG or PNG photo.'); }
    });
    $('pform').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const first = String(f.get('first')).trim(), surname = String(f.get('surname')).trim(), idno = String(f.get('idno') || '').trim();
      const species = it ? it.name : String(f.get('species') || '').trim();
      if (!dataUrl) { alert('Please choose a photo first.'); return; }
      if (!navigator.onLine) { alert('No signal right now. Please send the photo when you are back online.'); return; }
      Object.assign(st, { first, surname }); if (idno) st.idno = idno; save(STUDENT_KEY, st);
      const btn = $('pbtn'); btn.disabled = true; btn.textContent = 'Sending...';
      const payload = { app: 'aga-study', type: 'photo', version: DATA.generated, device: deviceId(), first, surname, idno, species,
        sci: it && it.sci || '', module: mod ? mod.id : '', itemId: it ? it.id : '', where: String(f.get('where') || '').trim(),
        consent: true, mime: 'image/jpeg', image: dataUrl.split(',')[1] };
      const res = await postProgress(payload);
      if (res === 'ok') {
        show(`<div class="card pad done-card"><span class="done">${icon('check')} Photo sent - thank you, ${esc(first)}!</span>
          <p class="small" style="margin:8px 0 0">A trainer will look at it. If it is approved, it will appear in the Pocket Guide with your name.</p></div>
          <div class="btn-stack"><a class="btn" href="${back}">Done</a><button class="btn ghost" id="another">Send another photo</button></div>`);
        $('another').addEventListener('click', () => renderSharePhoto(mod, it));
      } else {
        btn.disabled = false; btn.innerHTML = icon('camera') + ' Send photo';
        alert(res === 'offline' ? 'Could not reach AGA. Please check your signal and try again.' : 'Sorry, the photo was not accepted. Please check your details and try again.');
      }
    });
  }

  // ---------- photo credits (free-licence photos must name the photographer) ----------
  function renderCredits() {
    chrome({ tab: 'home', back: '#/', title: 'Photo credits' });
    const seen = new Set(), rows = [];
    DATA.modules.forEach(m => m.items.forEach(i => {
      if (!i.credit || seen.has(i.photo)) return; seen.add(i.photo);
      rows.push(`<li><strong>${esc(i.name)}</strong> &middot; ${esc(i.credit)}${i.license ? ` &middot; ${esc(i.license)}` : ''}${i.src ? ` &middot; <a href="${esc(i.src)}" target="_blank" rel="noopener">source</a>` : ''}</li>`);
    }));
    show(`<h1>Photo credits</h1>
      <p class="sub">Bird photos are AGA's own. Other species photos come from <a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a> photographers who share them under free licences (CC0, CC BY, CC BY-SA), from Wikimedia Commons and NASA, and from AGA students and staff. The star charts are drawn by AGA from the Hipparcos star catalogue (via d3-celestial, BSD licence). Thank you!</p>
      <ul class="card pad credits">${rows.join('')}</ul>`);
  }

  function renderSubmit(message) {
    chrome({ tab: 'progress', back: '#/progress', title: 'Submit progress' });
    const st = load(STUDENT_KEY, {});
    const sum = progressSummary();
    const pending = load(QUEUE_KEY, []).length;
    show(`<h1>Submit progress</h1>
      <p class="sub">Send your study results to African Guide Academy so your instructors can follow your progress.</p>
      ${message || ''}
      <div class="card pad"><h3>What will be sent</h3>
        <p style="margin:0">This session: <strong>${session.answers}</strong> answers${session.answers ? ` (${pct(session.correct, session.answers)}% right)` : ''}.<br>
        Overall: <strong>${sum.totals.practised}</strong> practised, <strong>${sum.totals.mastered}</strong> mastered, ${sum.totals.answered} answers${sum.totals.answered ? ` (${pct(sum.totals.correct, sum.totals.answered)}% right)` : ''}.</p></div>
      <form class="card pad form" id="sform" autocomplete="on">
        <label>First name(s)<input name="first" required maxlength="80" autocomplete="given-name" value="${esc(st.first || '')}"></label>
        <label>Surname<input name="surname" required maxlength="80" autocomplete="family-name" value="${esc(st.surname || '')}"></label>
        <label>Omang / Passport number<input name="idno" required maxlength="40" autocomplete="off" value="${esc(st.idno || '')}"></label>
        <p class="small" style="margin:4px 0 12px">Your details are remembered on this phone and are only sent to African Guide Academy, to link your results to your student profile.</p>
        <button class="btn block" type="submit" id="sbtn">${icon('check')} Submit progress</button>
        ${pending ? `<p class="small" style="margin:10px 0 0">${pending} earlier submission is waiting for signal and will be sent automatically.</p>` : ''}
      </form>`);
    $('sform').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const first = String(f.get('first')).trim(), surname = String(f.get('surname')).trim(), idno = String(f.get('idno')).trim();
      if (!first || !surname || idno.replace(/[^A-Za-z0-9]/g, '').length < 5) { alert('Please fill in your name, surname and a valid Omang / passport number.'); return; }
      Object.assign(st, { first, surname, idno }); save(STUDENT_KEY, st);
      const btn = $('sbtn'); btn.disabled = true; btn.textContent = 'Sending...';
      const payload = Object.assign({ app: 'aga-study', version: DATA.generated, device: deviceId(), first, surname, idno, sentAt: Date.now(),
        session: { answers: session.answers, correct: session.correct, since: session.since } }, progressSummary());
      const res = await postProgress(payload);
      if (res === 'ok' || res === 'offline') {
        if (res === 'offline') { const q = load(QUEUE_KEY, []); q.push(payload); save(QUEUE_KEY, q); }
        else { st.lastSent = Date.now(); save(STUDENT_KEY, st); }
        session = { answers: 0, correct: 0, since: Date.now() }; save(SESSION_KEY, session);
        renderSubmit(res === 'ok'
          ? `<div class="card pad done-card"><span class="done">${icon('check')} Submitted - thank you, ${esc(first)}!</span></div>`
          : `<div class="alert">Couldn't reach AGA right now (no signal?). Your progress is saved on this phone and will be sent automatically later.</div>`);
      } else {
        btn.disabled = false; btn.innerHTML = icon('check') + ' Submit progress';
        alert('Sorry, the submission was not accepted. Please check your details and try again.');
      }
    });
  }

  // ---------- offline page ----------
  function bytesOf(urls) {
    const size = {};
    DATA.modules.forEach(m => m.items.forEach(i => { if (i.call) size[i.call] = i.bytes || 0; if (i.photo && i.pb) size[i.photo] = i.pb; }));
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
      { key: 'fgasa', title: 'Birds - FGASA 80 calls', urls: callList([modById('fgasa80')]) },
      { key: 'prominent', title: 'Birds - 40 prominent (manual)', urls: callList([modById('prominent40')].filter(Boolean)) },
      { key: 'kwapa', title: 'Birds - Kwapa list', urls: callList([modById('kwapa63')].filter(Boolean)) },
      { key: 'frogs', title: 'Amphibians - frog calls', urls: callList([modById('frog-calls')].filter(Boolean)) },
      { key: 'all', title: 'Birds - full call library', urls: callList([modById('calls')].filter(Boolean)) },
      ...DATA.modules.filter(m => /-photos$/.test(m.id)).map(m => ({ key: m.id, title: `${m.short || m.title} - photos`, photos: true,
        urls: [...new Set(m.items.map(i => i.photo).filter(Boolean))] })),
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
      return `<div class="pad"><h3>${esc(p.title)}</h3><p>${p.urls.length} ${p.photos ? 'photos' : 'calls'} &middot; ${mb(bytesOf(p.urls))}${have ? ` &middot; ${have} saved` : ''}</p>${action}</div>`;
    }).join('');

    let install;
    if (isStandalone()) install = `<span class="done">${icon('check')} Installed on this device</span>`;
    else if (installPrompt) install = `<p>Put Pocket Guide on your home screen so it opens like a normal app.</p><button class="btn" id="installBtn">${icon('phone')} Install app</button>`;
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
  flushQueue();
  // Once we know what is saved on this device, refresh the screen (counts, offline-only calls).
  refreshCached().then(() => { if (!downloading && !inFocus()) route(); });
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', () => refreshCached());
})();
