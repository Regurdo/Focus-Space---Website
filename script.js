// =====================================================
//  FOCUSSPACE — script.js v2.0
//  Fitur baru: Email/Password login, Login Tamu,
//  Theme Switcher (8 tema), Header timer strip,
//  Daily Quotes, Logout, Centered Session Header
// =====================================================

const $ = id => document.getElementById(id);
const RING_C = 515;

let running = false;
let timerId = null;
let totalSecs = 25 * 60;
let timeLeft = totalSecs;
let sessionNum = 1;
let currentMode = 'focus';
let focusModeActive = false;
let chatNotifEnabled = true;

// ── WEB AUDIO CONTEXT ──
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playNotifSound(type = 'chat') {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'chat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(780, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'timer') {
      [0, 0.18, 0.36].forEach((delay, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = [660, 880, 1100][i];
        g.gain.setValueAtTime(0.22, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
        o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.35);
      });
    } else if (type === 'join') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {}
}

// ── POMODORO TIMER ──
const modeConfig = {
  focus: { min: 25, label: 'Focus Time!', ring: '', tab: 0 },
  break: { min: 5,  label: 'Short Break! ☕', ring: 'break-clr', tab: 1 },
  long:  { min: 15, label: 'Long Break! 🛋️', ring: 'long-clr', tab: 2 },
};

const timerDisplay  = $('timer-display');
const timerLabel    = $('timer-label');
const ringProg      = $('ring-prog');
const toggleBtn     = $('toggle-btn');
const playIcon      = $('play-icon');
const pauseIcon     = $('pause-icon');
const resetBtn      = $('reset-btn');
const skipBtn       = $('skip-btn');
const sessionBadge  = $('session-badge');
const seshNum       = $('sesh-num');
const seshDots      = $('sesh-dots');
const modeTabs      = document.querySelectorAll('.mtab');
const focusRing     = $('focus-ring');

// Header timer elements
const headerTimer    = $('header-timer');
const headerToggleBtn = $('header-toggle-btn');

function formatTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function updateTimerDisplay() {
  const t = formatTime(timeLeft);
  if (timerDisplay) timerDisplay.textContent = t;
  if (headerTimer) headerTimer.textContent = t;
  const focusBigEl = $('focus-timer-big');
  if (focusModeActive && focusBigEl) focusBigEl.textContent = t;
  document.title = `${t} — FocusSpace`;
  updateRing();
}

function updateRing() {
  const offset = RING_C * (1 - timeLeft / totalSecs);
  if (ringProg)  ringProg.style.strokeDashoffset  = offset;
  if (focusRing) focusRing.style.strokeDashoffset = offset;
}

function applyMode(mode) {
  const cfg = modeConfig[mode];
  currentMode = mode;
  totalSecs = cfg.min * 60;
  timeLeft = totalSecs;
  [ringProg, focusRing].forEach(r => {
    if (!r) return;
    r.classList.remove('break-clr','long-clr');
    if (cfg.ring) r.classList.add(cfg.ring);
  });
  if (timerLabel) timerLabel.textContent = cfg.label;
  const focusSub = $('focus-sub-txt');
  if (focusSub) focusSub.textContent = cfg.label;
  updateTimerDisplay();
  const modeToStatus = { focus: 'focus', break: 'break', long: 'break' };
  if (modeToStatus[mode]) updateUserStatus(modeToStatus[mode]);
}

function setPlayState(isPlaying) {
  running = isPlaying;
  if (playIcon)  playIcon.classList.toggle('hidden', isPlaying);
  if (pauseIcon) pauseIcon.classList.toggle('hidden', !isPlaying);
  if (toggleBtn) toggleBtn.classList.toggle('running', isPlaying);
  if (headerToggleBtn) {
    headerToggleBtn.textContent = isPlaying ? '⏸' : '▶';
    headerToggleBtn.classList.toggle('running', isPlaying);
  }
}

modeTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => {
    if (running) return;
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    applyMode(['focus','break','long'][i]);
  });
});

function startTimer() {
  setPlayState(true);
  timerId = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerId); timerId = null;
      setPlayState(false);
      onTimerEnd();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerId); timerId = null;
  setPlayState(false);
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    if (!running) startTimer(); else pauseTimer();
  });
}

// Header play/pause
if (headerToggleBtn) {
  headerToggleBtn.addEventListener('click', () => {
    if (!running) startTimer(); else pauseTimer();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    clearInterval(timerId); timerId = null;
    setPlayState(false);
    timeLeft = totalSecs;
    updateTimerDisplay();
    document.title = 'FocusSpace ☕';
  });
}

const resetSeshBtn = $('reset-sesh-btn');
if (resetSeshBtn) {
  resetSeshBtn.addEventListener('click', () => {
    if (confirm('Reset sesi kembali ke sesi 1?')) {
      sessionNum = 1;
      if (seshNum)      seshNum.textContent = sessionNum;
      if (sessionBadge) sessionBadge.innerHTML = `Sesi ke-<span id="sesh-num">1</span>`;
      updateSessionDots();
      applyMode('focus');
      modeTabs.forEach(t => t.classList.remove('active'));
      modeTabs[0].classList.add('active');
    }
  });
}

if (skipBtn) {
  skipBtn.addEventListener('click', () => {
    clearInterval(timerId); timerId = null;
    setPlayState(false);
    onTimerEnd(true);
  });
}

function onTimerEnd(silent = false) {
  if (!silent) {
    playNotifSound('timer');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FocusSpace ☕', {
        body: currentMode === 'focus'
          ? `Sesi ${sessionNum} selesai! Istirahat yuk 🎉`
          : `Istirahat selesai! Yuk fokus lagi 🧠`,
        icon: 'https://em-content.zobj.net/source/apple/354/hot-beverage_2615.png'
      });
    }
  }
  if (currentMode === 'focus') {
    sessionNum++;
    if (seshNum) seshNum.textContent = sessionNum;
    updateSessionDots();
    const isLong = (sessionNum - 1) % 4 === 0;
    applyMode(isLong ? 'long' : 'break');
    modeTabs.forEach(t => t.classList.remove('active'));
    modeTabs[isLong ? 2 : 1].classList.add('active');
  } else {
    applyMode('focus');
    modeTabs.forEach(t => t.classList.remove('active'));
    modeTabs[0].classList.add('active');
  }
}

function updateSessionDots() {
  if (!seshDots) return;
  const dots = seshDots.querySelectorAll('.sdot');
  const completed = (sessionNum - 1) % 4;
  dots.forEach((d, i) => {
    d.classList.toggle('done', i < completed || (completed === 0 && sessionNum > 1));
  });
}

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ── LO-FI AUDIO MIXER ──
const audioSliders = [
  { slider: $('lofi1-vol'), audio: $('lofi1-audio'), pct: $('lofi1-pct') },
  { slider: $('lofi2-vol'), audio: $('lofi2-audio'), pct: $('lofi2-pct') },
  { slider: $('lofi3-vol'), audio: $('lofi3-audio'), pct: $('lofi3-pct') },
  { slider: $('lofi4-vol'), audio: $('lofi4-audio'), pct: $('lofi4-pct') },
];
audioSliders.forEach(({ slider, audio, pct }) => {
  if (!slider) return;
  function sync() {
    const v = parseFloat(slider.value);
    audio.volume = v;
    const p = Math.round(v * 100);
    if (pct) pct.textContent = `${p}%`;
    slider.style.setProperty('--fill', `${p}%`);
    if (v > 0 && audio.paused) audio.play().catch(() => {});
    else if (v === 0) audio.pause();
  }
  slider.addEventListener('input', sync);
  sync();
});

// ═══════════════════════════════════════════════
//  YOUTUBE PLAYER
// ═══════════════════════════════════════════════
let ytPlayer = null;
let ytReady = false;
let ytApiLoaded = false;
let currentYtVid = null;
let activePresetBtn = null;
let pendingYtPlay = null;

window.onYouTubeIframeAPIReady = function() {
  ytApiLoaded = true;
  if (document.getElementById('yt-player')) {
    initYtPlayer();
  }
};

function initYtPlayer() {
  if (ytPlayer) return;
  ytPlayer = new YT.Player('yt-player', {
    height: '0', width: '0',
    playerVars: { autoplay: 0, controls: 0, origin: location.origin },
    events: {
      onReady: () => {
        ytReady = true;
        if (pendingYtPlay) {
          const { videoId, label } = pendingYtPlay;
          pendingYtPlay = null;
          playYouTube(videoId, label);
        }
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) stopYouTube();
      },
      onError: () => {
        showChatToast('FocusSpace', '❌ Video tidak bisa diputar (mungkin dibatasi)');
        stopYouTube();
      }
    }
  });
}

function extractYtId(url) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /[?&]v=([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function playYouTube(videoId, label) {
  if (!ytReady || !ytPlayer) {
    pendingYtPlay = { videoId, label };
    if (ytApiLoaded && !ytPlayer) initYtPlayer();
    const nowPlaying = $('yt-now-playing');
    const npLabel = $('yt-np-label');
    if (nowPlaying) nowPlaying.classList.remove('hidden');
    if (npLabel) npLabel.textContent = '⏳ ' + (label || 'Custom Track');
    return;
  }
  currentYtVid = videoId;
  ytPlayer.loadVideoById(videoId);
  const vol = parseInt($('yt-vol') ? $('yt-vol').value : '70');
  ytPlayer.setVolume(vol);
  ytPlayer.playVideo();
  const nowPlaying = $('yt-now-playing');
  const npLabel = $('yt-np-label');
  if (nowPlaying) nowPlaying.classList.remove('hidden');
  if (npLabel) npLabel.textContent = label || 'Custom Track';
}

function stopYouTube() {
  pendingYtPlay = null;
  if (ytPlayer && ytReady) ytPlayer.stopVideo();
  currentYtVid = null;
  const nowPlaying = $('yt-now-playing');
  if (nowPlaying) nowPlaying.classList.add('hidden');
  if (activePresetBtn) { activePresetBtn.classList.remove('playing'); activePresetBtn = null; }
  activeUserPresetId = null;
}

// YouTube volume
const ytVol = $('yt-vol');
const ytVolPct = $('yt-vol-pct');
if (ytVol) {
  ytVol.addEventListener('input', () => {
    const v = parseInt(ytVol.value);
    if (ytPlayer && ytReady) ytPlayer.setVolume(v);
    if (ytVolPct) ytVolPct.textContent = `${v}%`;
  });
}

// Stop button
const ytStopBtn = $('yt-stop-btn');
if (ytStopBtn) ytStopBtn.addEventListener('click', stopYouTube);

// YouTube preset buttons
document.querySelectorAll('.yt-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const vid = btn.dataset.vid;
    const label = btn.dataset.label;
    if (activePresetBtn === btn) { stopYouTube(); return; }
    if (activePresetBtn) activePresetBtn.classList.remove('playing');
    activePresetBtn = btn;
    btn.classList.add('playing');
    playYouTube(vid, label);
  });
});

// ── USER YOUTUBE PRESETS ──
const YT_PRESET_LOCAL_KEY = 'fs-yt-presets';
let userYtPresets = [];
let activeUserPresetId = null;

async function loadYtPresets() {
  if (!isGuest && userUid) {
    try {
      const snap = await get(ref(db, `userPresets/${userUid}/ytPresets`));
      userYtPresets = snap.exists() ? (snap.val() || []) : [];
    } catch (e) {
      userYtPresets = [];
    }
  } else {
    try {
      userYtPresets = JSON.parse(localStorage.getItem(YT_PRESET_LOCAL_KEY + '_' + userUid) || '[]');
    } catch (e) { userYtPresets = []; }
  }
  renderUserYtPresets();
}

async function saveYtPresets() {
  if (!isGuest && userUid) {
    try {
      await set(ref(db, `userPresets/${userUid}/ytPresets`), userYtPresets);
    } catch(e) {}
  } else {
    localStorage.setItem(YT_PRESET_LOCAL_KEY + '_' + userUid, JSON.stringify(userYtPresets));
  }
}

function renderUserYtPresets() {
  const list  = $('user-yt-preset-list');
  const empty = $('user-yt-empty');
  if (!list) return;
  Array.from(list.children).forEach(c => { if (c !== empty) c.remove(); });
  if (userYtPresets.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  userYtPresets.forEach(preset => {
    const item = document.createElement('div');
    item.className = 'user-yt-preset-item' + (activeUserPresetId === preset.id ? ' playing-now' : '');
    item.dataset.id = preset.id;

    const playBtn = document.createElement('button');
    playBtn.className = 'user-yt-preset-play';
    playBtn.title = activeUserPresetId === preset.id ? 'Hentikan' : 'Putar';
    playBtn.textContent = activeUserPresetId === preset.id ? '⏹' : '▶';
    playBtn.addEventListener('click', () => {
      if (activeUserPresetId === preset.id) {
        stopYouTube();
        activeUserPresetId = null;
        renderUserYtPresets();
      } else {
        if (activePresetBtn) { activePresetBtn.classList.remove('playing'); activePresetBtn = null; }
        activeUserPresetId = preset.id;
        playYouTube(preset.vid, preset.label);
        renderUserYtPresets();
      }
    });

    const label = document.createElement('span');
    label.className = 'user-yt-preset-label';
    label.textContent = preset.label;

    const delBtn = document.createElement('button');
    delBtn.className = 'user-yt-preset-del';
    delBtn.title = 'Hapus preset';
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', () => {
      if (activeUserPresetId === preset.id) { stopYouTube(); activeUserPresetId = null; }
      userYtPresets = userYtPresets.filter(p => p.id !== preset.id);
      saveYtPresets();
      renderUserYtPresets();
    });

    item.appendChild(playBtn);
    item.appendChild(label);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

// YouTube Custom URL Modal
const openYtCustom  = $('open-yt-custom');
const ytCustomModal = $('yt-custom-modal');
const ytCustomConfirm = $('yt-custom-confirm');
const ytCustomCancel  = $('yt-custom-cancel');

if (openYtCustom) openYtCustom.addEventListener('click', () => {
  if (ytCustomModal) ytCustomModal.classList.remove('hidden');
  loadYtPresets();
});
if (ytCustomCancel) ytCustomCancel.addEventListener('click', () => ytCustomModal && ytCustomModal.classList.add('hidden'));
if (ytCustomConfirm) {
  ytCustomConfirm.addEventListener('click', async () => {
    const urlInput   = $('yt-custom-url');
    const labelInput = $('yt-custom-label');
    const url   = urlInput   ? urlInput.value.trim() : '';
    const label = labelInput ? labelInput.value.trim() || 'Custom Track' : 'Custom Track';
    if (!url) { if (urlInput) urlInput.focus(); return; }
    const vid = extractYtId(url);
    if (!vid) { showChatToast('FocusSpace', '❌ URL YouTube tidak valid!'); return; }

    const newPreset = { id: Date.now().toString(36), label, vid };
    userYtPresets.push(newPreset);
    await saveYtPresets();

    if (activePresetBtn) { activePresetBtn.classList.remove('playing'); activePresetBtn = null; }
    activeUserPresetId = newPreset.id;
    playYouTube(vid, label);
    renderUserYtPresets();

    if (urlInput) urlInput.value = '';
    if (labelInput) labelInput.value = '';
    showChatToast('FocusSpace', `✅ Preset "${label}" disimpan & diputar!`);
  });
}

// ── TODO LIST ──
const todoList  = $('todo-list');
const todoInput = $('todo-input');
const addTodoBt = $('add-todo');
const todoStats = $('todo-stats');
const clearNotesBt = $('clear-notes');

let todos = JSON.parse(localStorage.getItem('fs-todos') || '[]');

function saveTodos() { localStorage.setItem('fs-todos', JSON.stringify(todos)); renderTodos(); }
function renderTodos() {
  if (!todoList) return;
  todoList.innerHTML = '';
  todos.forEach((todo, i) => {
    const item = document.createElement('div');
    item.className = 'todo-item' + (todo.done ? ' done' : '');
    const check = document.createElement('div');
    check.className = 'todo-check';
    check.textContent = todo.done ? '✓' : '';
    check.addEventListener('click', () => { todos[i].done = !todos[i].done; saveTodos(); });
    const text = document.createElement('span');
    text.className = 'todo-text'; text.textContent = todo.text;
    const del = document.createElement('button');
    del.className = 'todo-del'; del.textContent = '×';
    del.addEventListener('click', () => { todos.splice(i, 1); saveTodos(); });
    item.appendChild(check); item.appendChild(text); item.appendChild(del);
    todoList.appendChild(item);
  });
  const done = todos.filter(t => t.done).length;
  if (todoStats) todoStats.textContent = todos.length > 0 ? `${done}/${todos.length} selesai` : '';
}

function addTodoItem() {
  const text = todoInput ? todoInput.value.trim() : '';
  if (!text) return;
  todos.push({ text, done: false });
  if (todoInput) todoInput.value = '';
  saveTodos();
}

if (addTodoBt) {
  addTodoBt.addEventListener('click', addTodoItem);
  if (todoInput) todoInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTodoItem(); });
  if (clearNotesBt) clearNotesBt.addEventListener('click', () => {
    if (todos.length === 0) return;
    if (confirm('Hapus semua target? 🗑️')) { todos = []; saveTodos(); }
  });
}
renderTodos();

// ── FOCUS MODE OVERLAY ──
const focusFab     = $('focus-fab');
const focusOverlay = $('focus-overlay');
const exitFocus    = $('exit-focus');
if (focusFab) {
  focusFab.addEventListener('click', () => {
    focusModeActive = true;
    focusOverlay.classList.remove('hidden');
    if (focusRing) {
      focusRing.classList.remove('break-clr','long-clr');
      const cfg = modeConfig[currentMode];
      if (cfg.ring) focusRing.classList.add(cfg.ring);
      focusRing.style.strokeDashoffset = RING_C * (1 - timeLeft / totalSecs);
    }
    updateTimerDisplay();
  });
}
if (exitFocus) {
  exitFocus.addEventListener('click', () => {
    focusModeActive = false;
    focusOverlay.classList.add('hidden');
  });
}

// ── USER STATUS ──
const statusConfig = {
  focus:    { emoji: '🧠', label: 'Fokus',     color: '#f4845f' },
  break:    { emoji: '☕', label: 'Istirahat', color: '#7ec8a0' },
  studying: { emoji: '📚', label: 'Belajar',   color: '#90c4e4' },
  idle:     { emoji: '💤', label: 'Santai',    color: '#c8c8c8' },
  away:     { emoji: '🚶', label: 'Away',      color: '#f9d878' },
};
let currentUserStatus = 'focus';

function updateUserStatus(status) {
  if (!statusConfig[status]) return;
  currentUserStatus = status;
  const cfg = statusConfig[status];
  const emojiEl = $('current-status-emoji');
  const textEl  = $('current-status-text');
  if (emojiEl) emojiEl.textContent = cfg.emoji;
  if (textEl)  textEl.textContent  = cfg.label;
  document.querySelectorAll('.status-opt').forEach(opt => opt.classList.toggle('active-opt', opt.dataset.status === status));
  document.querySelectorAll('.fstatus-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.status === status));
  if (typeof userRef !== 'undefined' && userRef && typeof set !== 'undefined') {
    set(userRef, { name: username, avatar: userAvatar, uid: userUid, status });
  }
}

document.addEventListener('click', (e) => {
  const wrap = $('status-selector-wrap');
  const dropdown = $('status-dropdown');
  if (!wrap || !dropdown) return;
  if (wrap.contains(e.target)) {
    const isOpen = !dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden', isOpen);
    wrap.classList.toggle('open', !isOpen);
  } else {
    dropdown.classList.add('hidden');
    wrap.classList.remove('open');
  }
});
document.querySelectorAll('.status-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    updateUserStatus(opt.dataset.status);
    $('status-dropdown').classList.add('hidden');
    $('status-selector-wrap').classList.remove('open');
  });
});
document.querySelectorAll('.fstatus-btn').forEach(btn => {
  btn.addEventListener('click', () => updateUserStatus(btn.dataset.status));
});

// ── THEME SWITCHER ──
const THEME_KEY = 'fs-theme';
let currentTheme = localStorage.getItem(THEME_KEY) || 'default';

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.theme === theme);
  });
}

applyTheme(currentTheme);

const openThemeBtn = $('open-theme-btn');
const themePanel   = $('theme-panel');
const closeThemePanel = $('close-theme-panel');

if (openThemeBtn && themePanel) {
  openThemeBtn.addEventListener('click', () => {
    themePanel.classList.toggle('hidden');
  });
  if (closeThemePanel) {
    closeThemePanel.addEventListener('click', () => themePanel.classList.add('hidden'));
  }
  document.addEventListener('click', (e) => {
    if (!themePanel.classList.contains('hidden') &&
        !themePanel.contains(e.target) &&
        e.target !== openThemeBtn) {
      themePanel.classList.add('hidden');
    }
  });
}

document.querySelectorAll('.theme-chip').forEach(chip => {
  chip.addEventListener('click', () => applyTheme(chip.dataset.theme));
});

// ── SCREEN TEMPERATURE ──
const tempLabels = [
  { max: 10,  badge: 'Biru — Normal'  },
  { max: 30,  badge: 'Siang — Segar'  },
  { max: 55,  badge: 'Sore — Nyaman'  },
  { max: 75,  badge: 'Malam — Hangat' },
  { max: 90,  badge: 'Lilin — Panas'  },
  { max: 101, badge: 'Api — Membara'  },
];

function applyScreenTemp(val) {
  const filter = $('warm-filter');
  const badge  = $('temp-badge');
  if (!filter) return;
  const opacity = (val / 100) * 0.55;
  const r = Math.round(230 - (val / 100) * 30);
  const g = Math.round(160 - (val / 100) * 80);
  const b = Math.round(80  - (val / 100) * 60);
  filter.style.background = opacity > 0.005 ? `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})` : 'transparent';
  const entry = tempLabels.find(e => val < e.max) || tempLabels[tempLabels.length - 1];
  if (badge) {
    badge.textContent = entry.badge;
    const badgeOpacity = 0.12 + (val / 100) * 0.45;
    badge.style.background = `rgba(${r}, ${g}, ${b}, ${badgeOpacity.toFixed(2)})`;
    badge.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.45)`;
    badge.style.color = val > 60 ? '#fff' : '';
  }
  document.querySelectorAll('.temp-preset').forEach(btn => {
    const bval = parseInt(btn.dataset.val);
    btn.classList.toggle('active', bval === 0 ? val < 15 : (val >= bval && val < bval + 25));
  });
  localStorage.setItem('fs-screen-temp', val);
}

const screenTempSlider = $('screen-temp-slider');
if (screenTempSlider) {
  const saved = parseInt(localStorage.getItem('fs-screen-temp') || '0');
  screenTempSlider.value = saved;
  applyScreenTemp(saved);
  screenTempSlider.addEventListener('input', () => applyScreenTemp(parseInt(screenTempSlider.value)));
}
document.querySelectorAll('.temp-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.val);
    if (screenTempSlider) screenTempSlider.value = val;
    applyScreenTemp(val);
  });
});

// ── DAILY MOTIVATIONAL QUOTES ──
const quotes = [
  "☕ Satu langkah kecil setiap hari membuatmu jauh lebih maju.",
  "🧠 Fokus bukan soal waktu, tapi soal energi yang kamu arahkan.",
  "🌟 Kelelahan adalah tanda kamu sudah berjuang keras. Istirahat itu bukan menyerah.",
  "📚 Belajar itu investasi terbaik yang pernah ada — return-nya seumur hidup.",
  "🎯 Kamu tidak harus sempurna. Kamu hanya perlu terus bergerak.",
  "🌱 Progres kecil tetaplah progres. Rayakan setiap langkahmu!",
  "💡 Rasa penasaran adalah bahan bakar terbaik untuk belajar.",
  "🚀 Hari ini kamu lebih pintar dari hari kemarin. Terus begitu!",
  "🍵 Jangan banding-bandingkan perjalananmu dengan orang lain.",
  "✨ Konsistensi mengalahkan motivasi. Hadir setiap hari, meski kecil.",
  "🌈 Kesalahan adalah guru terbaik yang bayarannya paling mahal.",
  "💪 Otak yang lelah butuh jeda, bukan paksaan. Istirahat itu produktif!",
  "🎵 Temukan ritme belajarmu sendiri, bukan ritme orang lain.",
  "🌙 Bahkan bintang perlu kegelapan untuk bersinar.",
  "👑 Passion tanpa disiplin itu mimpi. Disiplin tanpa passion itu penyiksaan. Cari keduanya!",
];

let quoteIndex = Math.floor(Math.random() * quotes.length);
function showNextQuote() {
  const el = $('daily-quote');
  if (!el) return;
  quoteIndex = (quoteIndex + 1) % quotes.length;
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = quotes[quoteIndex];
    el.style.opacity = '1';
  }, 200);
}

function initQuote() {
  const el = $('daily-quote');
  if (el) {
    el.style.transition = 'opacity 0.2s ease';
    el.textContent = quotes[quoteIndex];
  }
  const btn = $('next-quote-btn');
  if (btn) btn.addEventListener('click', showNextQuote);
}

// ── FIREBASE v8 (global SDK) ──
const firebaseConfig = {
  apiKey: "AIzaSyDTo8H7OV0XZtcAdJrk2fnXXsLiMDXlTmw",
  authDomain: "focus-space-f158e.firebaseapp.com",
  databaseURL: "https://focus-space-f158e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "focus-space-f158e",
  storageBucket: "focus-space-f158e.firebasestorage.app",
  messagingSenderId: "947141512235",
  appId: "1:947141512235:web:fbca8bcb5c3b98906e2e6e"
};

const fbApp = firebase.initializeApp(firebaseConfig);
const auth  = firebase.auth(fbApp);
const db    = firebase.database(fbApp);
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Helper aliases — wraps Firebase v8 API to match original code style
function ref(dbInst, path)   { return dbInst.ref(path); }
function onValue(r, cb)      { const h = s => cb(s); r.on('value', h); return () => r.off('value', h); }
function onChildAdded(r, cb) { const h = s => cb(s); r.on('child_added', h); return () => r.off('child_added', h); }
function set(r, val)         { return r.set(val); }
function push(r, val)        { return r.push(val); }
function remove(r)           { return r.remove(); }
function onDisconnect(r)     { return r.onDisconnect(); }
async function get(r)        { return r.once('value'); }

let username    = '';
let userAvatar  = '👤';
let userUid     = '';
let userRef     = null;
let roomName    = '';
let unsubscribeUsers = null;
let unsubscribeMsgs  = null;
let prevMemberCount  = 0;
let isGuest = false;
let currentRoomMembers = [];

// ── LOGIN ELEMENTS ──
const loginOverlay = $('login-overlay');
const mainContent  = $('main-content');

function handleLoginSuccess(uid, displayName, avatar, guest = false) {
  userUid    = uid;
  username   = displayName;
  userAvatar = avatar;
  isGuest    = guest;

  // --- FIX PENGAMAN ANTI CRASH ---
  const widgetName = $('widget-name');
  const widgetAvatar = $('widget-avatar');
  if (widgetName)   widgetName.textContent = username;
  if (widgetAvatar) widgetAvatar.textContent = userAvatar;

  if (loginOverlay) {
    loginOverlay.style.opacity = '0';
    loginOverlay.style.pointerEvents = 'none';
    setTimeout(() => loginOverlay.style.display = 'none', 500);
  }

  if (mainContent) mainContent.classList.remove('hidden');
  initQuote();
  listenToActiveRooms();
  setTimeout(() => {
    if (ytApiLoaded && !ytPlayer) initYtPlayer();
    loadYtPresets();
  }, 300);
}

// ── GOOGLE LOGIN ──
const googleLoginBtn = $('google-login-btn');
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    auth.signInWithPopup(googleProvider).then(result => {
      const u = result.user;
      handleLoginSuccess(u.uid, u.displayName || 'Pengguna', '🐱');
    }).catch(err => {
      console.error(err);
      alert('Gagal masuk Google. Pastikan jendela Pop-up diizinkan browser! 🚫');
    });
  });
}

// ── GUEST LOGIN ──
const guestLoginBtn  = $('guest-login-btn');
const guestNameInput = $('guest-name-input');
if (guestLoginBtn) {
  guestLoginBtn.addEventListener('click', async () => {
    const name = guestNameInput ? guestNameInput.value.trim() : '';
    if (!name) { guestNameInput && (guestNameInput.style.borderColor = 'var(--red)'); return; }

    guestLoginBtn.disabled = true;
    guestLoginBtn.textContent = '⏳ Memeriksa...';

    try {
      const nameKey = name.toLowerCase().replace(/\s+/g, '_');
      const snap = await get(ref(db, `activeUsernames/${nameKey}`));
      if (snap.exists()) {
        if (guestNameInput) {
          guestNameInput.style.borderColor = 'var(--red)';
          guestNameInput.focus();
        }
        let errEl = $('guest-name-error');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.id = 'guest-name-error';
          errEl.className = 'guest-note';
          errEl.style.color = 'var(--red)';
          guestNameInput.parentNode.insertAdjacentElement('afterend', errEl);
        }
        errEl.textContent = '❌ Username ini sedang dipakai, coba nama lain!';
        errEl.style.display = 'block';
        setTimeout(() => { if (errEl) errEl.style.display = 'none'; }, 4000);
        return;
      }

      const uid = 'guest_' + Math.random().toString(36).slice(2, 10);
      await set(ref(db, `activeUsernames/${nameKey}`), { uid, name, since: Date.now() });
      onDisconnect(ref(db, `activeUsernames/${nameKey}`)).remove();

      handleLoginSuccess(uid, name, '🐣', true);
    } catch(e) {
      const uid = 'guest_' + Math.random().toString(36).slice(2, 10);
      handleLoginSuccess(uid, name, '🐣', true);
    } finally {
      guestLoginBtn.disabled = false;
      guestLoginBtn.textContent = 'Masuk sebagai Tamu 🚪';
    }
  });
}

function showLoginError(el, msg) {
  if (!el) return;
  el.textContent = `❌ ${msg}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ── LOGOUT ──
const logoutBtn = $('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (!confirm('Yakin mau keluar? 👋')) return;
    if (roomName) leaveRoom();
    if (isGuest && username) {
      const nameKey = username.toLowerCase().replace(/\s+/g, '_');
      try { await remove(ref(db, `activeUsernames/${nameKey}`)); } catch(e) {}
    }
    if (!isGuest) {
      try { await auth.signOut(); } catch(e) {}
    }
    username = ''; userAvatar = '👤'; userUid = ''; isGuest = false;
    mainContent.classList.add('hidden');
    loginOverlay.style.display = '';
    loginOverlay.style.opacity = '1';
    loginOverlay.style.pointerEvents = '';
    $('profile-modal').classList.add('hidden');
  });
}

// ── PROFILE MODAL ──
const profileTrigger       = $('profile-trigger');
const profileModal         = $('profile-modal');
const closeProfileBtn      = $('close-profile-btn');
const saveProfileBtn       = $('save-profile-btn');
const editNameInput        = $('edit-name-input');
const profileAvatarDisplay = $('profile-avatar-display');
let selectedEmoji = '🐱';

if (profileTrigger) {
  profileTrigger.addEventListener('click', () => {
    if (editNameInput) editNameInput.value = username;
    selectedEmoji = userAvatar;
    if (profileAvatarDisplay) profileAvatarDisplay.textContent = selectedEmoji;
    document.querySelectorAll('.emoji-opt').forEach(opt => {
      opt.classList.toggle('selected', opt.textContent === selectedEmoji);
    });
    profileModal.classList.remove('hidden');
  });
}
document.querySelectorAll('.emoji-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedEmoji = opt.textContent;
    if (profileAvatarDisplay) profileAvatarDisplay.textContent = selectedEmoji;
  });
});
if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', () => {
    const newName = editNameInput ? editNameInput.value.trim() : '';
    if (!newName) return;
    username   = newName;
    userAvatar = selectedEmoji;
    
    // --- FIX PENGAMAN DI FITUR SAVE PROFILE ---
    if ($('widget-name'))   $('widget-name').textContent = username;
    if ($('widget-avatar')) $('widget-avatar').textContent = userAvatar;
    
    if (userRef) set(userRef, { name: username, avatar: userAvatar, uid: userUid, status: currentUserStatus });
    profileModal.classList.add('hidden');
  });
}

// ── CREATE ROOM MODAL ──
const createRoomModal   = $('create-room-modal');
const openCreateRoomBtn = $('open-create-room-btn');
const newRoomNameInput  = $('new-room-name');
const newRoomPwInput    = $('new-room-pw');
const confirmCreateRoom = $('confirm-create-room');
const cancelCreateRoom  = $('cancel-create-room');
const togglePwVis       = $('toggle-pw-vis');

if (openCreateRoomBtn) {
  openCreateRoomBtn.addEventListener('click', () => {
    if (newRoomNameInput) newRoomNameInput.value = '';
    if (newRoomPwInput) newRoomPwInput.value = '';
    createRoomModal.classList.remove('hidden');
    setTimeout(() => newRoomNameInput && newRoomNameInput.focus(), 100);
  });
}
if (cancelCreateRoom) cancelCreateRoom.addEventListener('click', () => createRoomModal.classList.add('hidden'));
if (togglePwVis) {
  togglePwVis.addEventListener('click', () => {
    if (newRoomPwInput) newRoomPwInput.type = newRoomPwInput.type === 'password' ? 'text' : 'password';
  });
}
if (confirmCreateRoom) {
  confirmCreateRoom.addEventListener('click', async () => {
    const rn = newRoomNameInput ? newRoomNameInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') : '';
    if (!rn) { newRoomNameInput && newRoomNameInput.focus(); return; }
    const pw = newRoomPwInput ? newRoomPwInput.value.trim() : '';
    const roomSnap = await get(ref(db, `rooms/${rn}/meta`));
    if (roomSnap.exists()) {
      alert(`Ruangan #${rn} sudah ada! Pilih nama lain.`);
      return;
    }
    await set(ref(db, `rooms/${rn}/meta`), {
      ownerUid: userUid, ownerName: username,
      hasPassword: pw.length > 0,
      password: pw.length > 0 ? pw : null,
      createdAt: Date.now()
    });
    createRoomModal.classList.add('hidden');
    joinRoom(rn);
  });
}

// ── PASSWORD MODAL ──
const pwModal         = $('pw-modal');
const pwModalRoomName = $('pw-modal-room-name');
const joinRoomPwInput = $('join-room-pw');
const pwErrorMsg      = $('pw-error-msg');
const confirmJoinPw   = $('confirm-join-pw');
const cancelJoinPw    = $('cancel-join-pw');
const toggleJoinPwVis = $('toggle-join-pw-vis');
let pendingJoinRoom   = '';

if (cancelJoinPw) cancelJoinPw.addEventListener('click', () => { pwModal.classList.add('hidden'); pendingJoinRoom = ''; });
if (toggleJoinPwVis) {
  toggleJoinPwVis.addEventListener('click', () => {
    if (joinRoomPwInput) joinRoomPwInput.type = joinRoomPwInput.type === 'password' ? 'text' : 'password';
  });
}
if (confirmJoinPw) {
  confirmJoinPw.addEventListener('click', async () => {
    const enteredPw = joinRoomPwInput ? joinRoomPwInput.value.trim() : '';
    const snap = await get(ref(db, `rooms/${pendingJoinRoom}/meta`));
    if (!snap.exists()) { pwModal.classList.add('hidden'); return; }
    const meta = snap.val();
    if (enteredPw === meta.password) {
      pwModal.classList.add('hidden');
      if (pwErrorMsg) pwErrorMsg.classList.add('hidden');
      joinRoom(pendingJoinRoom);
      pendingJoinRoom = '';
    } else {
      if (pwErrorMsg) pwErrorMsg.classList.remove('hidden');
      if (joinRoomPwInput) { joinRoomPwInput.value = ''; joinRoomPwInput.focus(); }
    }
  });
  if (joinRoomPwInput) joinRoomPwInput.addEventListener('keypress', e => { if (e.key === 'Enter') confirmJoinPw.click(); });
}

// ── DELETE ROOM MODAL ──
const deleteRoomModal   = $('delete-room-modal');
const deleteRoomBtn     = $('delete-room-btn');
const confirmDeleteRoom = $('confirm-delete-room');
const cancelDeleteRoom  = $('cancel-delete-room');

if (deleteRoomBtn) deleteRoomBtn.addEventListener('click', () => deleteRoomModal.classList.remove('hidden'));
if (cancelDeleteRoom) cancelDeleteRoom.addEventListener('click', () => deleteRoomModal.classList.add('hidden'));
if (confirmDeleteRoom) {
  confirmDeleteRoom.addEventListener('click', async () => {
    if (!roomName) return;
    const deletedRoom = roomName;
    await remove(ref(db, `rooms/${deletedRoom}`));
    deleteRoomModal.classList.add('hidden');
    if (roomName === deletedRoom) leaveRoom();
    showChatToast('FocusSpace', `Ruangan #${deletedRoom} berhasil dihapus 🗑️`);
  });
}

// ── ROOM LOGIC ──
const roomInput   = $('room-input');
const joinBtn     = $('join-btn');
const roomStatus  = $('room-status');
const membersWrap = $('members-wrap');
const membersList = $('members-list');
const chatSection = $('chat-section');
const chatBox     = $('chat-box');
const chatInput   = $('chat-input');
const onlineCount = $('online-count');
let unsubscribeRoomMeta = null;
let roomOwnerUid = '';
let roomOwnerName = '';

function leaveRoom() {
  if (userRef) { remove(userRef); userRef = null; }
  if (unsubscribeUsers)    { unsubscribeUsers();    unsubscribeUsers    = null; }
  if (unsubscribeMsgs)     { unsubscribeMsgs();     unsubscribeMsgs     = null; }
  if (unsubscribeRoomMeta) { unsubscribeRoomMeta(); unsubscribeRoomMeta = null; }
  roomName = '';
  roomOwnerUid = '';
  roomOwnerName = '';
  if (roomInput) roomInput.value = '';
  if (chatBox) chatBox.innerHTML = '';
  if (chatSection) chatSection.style.display = 'none';
  const hint = $('chat-placeholder-hint');
  if (hint) hint.style.display = 'flex';
  if (membersWrap) membersWrap.style.display = 'none';
  if (roomStatus) roomStatus.textContent = 'Belum bergabung ke ruangan';
  if (onlineCount) onlineCount.textContent = 'Pilih ruangan dulu';
  if (deleteRoomBtn) deleteRoomBtn.classList.add('hidden');
  const ownerInfo = $('room-owner-info');
  if (ownerInfo) ownerInfo.classList.add('hidden');
  prevMemberCount = 0;
}

async function attemptJoinRoom(rn) {
  if (!rn) return;
  const snap = await get(ref(db, `rooms/${rn}/meta`));
  if (!snap.exists()) {
    showChatToast('FocusSpace', `Ruangan #${rn} tidak ditemukan. Buat dulu ya! 🚪`);
    return;
  }
  const meta = snap.val();
  if (meta.hasPassword && meta.ownerUid !== userUid) {
    pendingJoinRoom = rn;
    if (pwModalRoomName) pwModalRoomName.textContent = `Ruangan: #${rn}`;
    if (joinRoomPwInput) joinRoomPwInput.value = '';
    if (pwErrorMsg) pwErrorMsg.classList.add('hidden');
    pwModal.classList.remove('hidden');
    setTimeout(() => joinRoomPwInput && joinRoomPwInput.focus(), 100);
    return;
  }
  joinRoom(rn);
}

function joinRoom(rn) {
  if (!rn) return;
  if (userRef) remove(userRef);
  if (unsubscribeUsers)    { unsubscribeUsers();    unsubscribeUsers    = null; }
  if (unsubscribeMsgs)     { unsubscribeMsgs();     unsubscribeMsgs     = null; }
  if (unsubscribeRoomMeta) { unsubscribeRoomMeta(); unsubscribeRoomMeta = null; }
  roomName = rn;
  if (roomInput) roomInput.value = rn;
  if (chatBox) chatBox.innerHTML = '';
  prevMemberCount = 0;
  if (chatSection) chatSection.style.display = 'flex';
  const hint = $('chat-placeholder-hint');
  if (hint) hint.style.display = 'none';
  if (membersWrap) membersWrap.style.display = 'block';
  if (roomStatus) roomStatus.textContent = `📍 Ruang: #${roomName}`;

  userRef = ref(db, `rooms/${roomName}/users/${userUid}`);
  set(userRef, { name: username, avatar: userAvatar, uid: userUid, status: currentUserStatus });
  onDisconnect(userRef).remove();

  get(ref(db, `rooms/${roomName}/meta`)).then(snap => {
    if (snap.exists()) {
      const meta = snap.val();
      roomOwnerUid  = meta.ownerUid  || '';
      roomOwnerName = meta.ownerName || '';
      const ownerInfo = $('room-owner-info');
      const ownerNameEl = $('room-owner-name');
      if (ownerInfo && ownerNameEl) {
        ownerNameEl.textContent = roomOwnerName || 'Tidak diketahui';
        ownerInfo.classList.remove('hidden');
      }
      if (meta.ownerUid === userUid) {
        if (deleteRoomBtn) deleteRoomBtn.classList.remove('hidden');
      } else {
        if (deleteRoomBtn) deleteRoomBtn.classList.add('hidden');
      }
    }
  });

  const capturedRoomName = rn;
  unsubscribeRoomMeta = onValue(ref(db, `rooms/${capturedRoomName}/meta`), metaSnap => {
    if (!metaSnap.exists() && roomName === capturedRoomName) {
      const deletedRoom = capturedRoomName;
      leaveRoom();
      showChatToast('FocusSpace', `Ruangan #${deletedRoom} telah dihapus oleh owner 🗑️`);
    }
  });

  const usersRef = ref(db, `rooms/${roomName}/users`);
  unsubscribeUsers = onValue(usersRef, snap => {
    const data    = snap.val() || {};
    const members = Object.values(data);
    const count   = members.length;
    currentRoomMembers = members.map(m => m.name);
    if (onlineCount) onlineCount.textContent = `${count} di #${roomName}`;
    if (prevMemberCount > 0 && count > prevMemberCount) playNotifSound('join');
    prevMemberCount = count;
    if (membersList) {
      membersList.innerHTML = '';
      members.forEach(m => {
        const chip = document.createElement('div');
        chip.className = 'member-chip';
        const av = document.createElement('div');
        av.className = 'member-avatar';
        av.textContent = m.avatar || m.name.charAt(0).toUpperCase();
        av.style.background = nameToColor(m.name);
        const nm = document.createElement('span');
        nm.className = 'member-name'; nm.textContent = m.name;
        chip.appendChild(av); chip.appendChild(nm);
        if (m.status && statusConfig[m.status]) {
          const sb = document.createElement('span');
          sb.className = 'member-status';
          sb.textContent = statusConfig[m.status].emoji;
          sb.title = statusConfig[m.status].label;
          chip.appendChild(sb);
        }
        membersList.appendChild(chip);
      });
    }
  });

  const msgsRef = ref(db, `rooms/${roomName}/messages`);
  unsubscribeMsgs = onChildAdded(msgsRef, snap => appendMessage(snap.val()));
}

if (joinBtn) {
  joinBtn.addEventListener('click', () => {
    const rn = roomInput ? roomInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') : '';
    if (rn) attemptJoinRoom(rn);
  });
}
if (roomInput) {
  roomInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      const rn = roomInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      if (rn) attemptJoinRoom(rn);
    }
  });
}

function listenToActiveRooms() {
  onValue(ref(db, 'rooms'), snap => {
    const roomsData       = snap.val() || {};
    const activeRoomsList = $('active-rooms-list');
    if (!activeRoomsList) return;
    activeRoomsList.innerHTML = '';
    let hasActiveRooms = false;
    for (const rKey in roomsData) {
      const room = roomsData[rKey];
      if (!room.meta) continue;
      if (room.users) {
        const userCount = Object.keys(room.users).length;
        if (userCount > 0) {
          hasActiveRooms = true;
          const chip = document.createElement('div');
          chip.className = 'room-click-chip';
          const hasLock = room.meta && room.meta.hasPassword;
          chip.innerHTML = `${hasLock ? '🔒' : '🔓'} #${rKey} <span style="color:var(--text-muted);font-size:11px;">(${userCount}👥)</span>`;
          if (room.meta && room.meta.ownerUid === userUid) {
            const crown = document.createElement('span');
            crown.className = 'owner-crown'; crown.textContent = ' 👑';
            chip.appendChild(crown);
          }
          chip.addEventListener('click', () => attemptJoinRoom(rKey));
          activeRoomsList.appendChild(chip);
        }
      }
    }
    if (!hasActiveRooms) {
      activeRoomsList.innerHTML = '<span class="no-rooms-hint">Tidak ada ruangan aktif, yuk buat dulu!</span>';
    }
  });
}

// ── CHAT IMAGE HANDLERS ──
const imgLightbox      = $('img-lightbox');
const imgLightboxImg   = $('img-lightbox-img');
const imgLightboxClose = $('img-lightbox-close');
const imgLightboxBg    = imgLightbox ? imgLightbox.querySelector('.img-lightbox-bg') : null;

function openLightbox(src) {
  if (!imgLightbox || !imgLightboxImg) return;
  imgLightboxImg.src = src;
  imgLightbox.classList.remove('hidden');
}
function closeLightbox() {
  if (imgLightbox) imgLightbox.classList.add('hidden');
}
if (imgLightboxClose) imgLightboxClose.addEventListener('click', closeLightbox);
if (imgLightboxBg)    imgLightboxBg.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

let pendingImageData = null;

const imgPreviewBar    = $('img-preview-bar');
const imgPreviewThumb  = $('img-preview-thumb');
const imgPreviewName   = $('img-preview-name');
const imgPreviewCancel = $('img-preview-cancel');

function showImagePreview(dataUrl, name) {
  pendingImageData = dataUrl;
  if (imgPreviewThumb) imgPreviewThumb.src = dataUrl;
  if (imgPreviewName)  imgPreviewName.textContent = name || 'gambar';
  if (imgPreviewBar)   imgPreviewBar.classList.remove('hidden');
}
function clearImagePreview() {
  pendingImageData = null;
  if (imgPreviewBar)  imgPreviewBar.classList.add('hidden');
  if (imgPreviewThumb) imgPreviewThumb.src = '';
  if (imgPreviewName) imgPreviewName.textContent = '';
  const inp = $('img-upload-input');
  if (inp) inp.value = '';
}
if (imgPreviewCancel) imgPreviewCancel.addEventListener('click', clearImagePreview);

const imgUploadBtn   = $('img-upload-btn');
const imgUploadInput = $('img-upload-input');
if (imgUploadBtn) imgUploadBtn.addEventListener('click', () => imgUploadInput && imgUploadInput.click());
if (imgUploadInput) {
  imgUploadInput.addEventListener('change', () => {
    const file = imgUploadInput.files[0];
    if (!file) return;
    if (!roomName) { showChatToast('FocusSpace', '⚠️ Masuk ke ruangan dulu!'); return; }
    if (file.size > 3 * 1024 * 1024) { showChatToast('FocusSpace', '❌ Gambar terlalu besar (maks 3MB)!'); return; }
    const reader = new FileReader();
    reader.onload = (e) => showImagePreview(e.target.result, file.name);
    reader.readAsDataURL(file);
  });
}

document.addEventListener('paste', (e) => {
  if (!roomName) return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => showImagePreview(ev.target.result, 'clipboard');
        reader.readAsDataURL(file);
      }
      break;
    }
  }
});

// ── REPLY STATE ──
let replyTo = null;

const replyBar       = $('reply-bar');
const replyBarName   = $('reply-bar-name');
const replyBarText   = $('reply-bar-text');
const replyBarCancel = $('reply-bar-cancel');

function setReply(msg) {
  replyTo = { sender: msg.sender, text: msg.text || '🖼️ Gambar', msgId: msg.msgId || '' };
  if (replyBarName) replyBarName.textContent = msg.sender;
  if (replyBarText) replyBarText.textContent = (msg.text || '🖼️ Gambar').slice(0, 60);
  if (replyBar) replyBar.classList.remove('hidden');
  if (chatInput) chatInput.focus();
}

function clearReply() {
  replyTo = null;
  if (replyBar) replyBar.classList.add('hidden');
}

if (replyBarCancel) replyBarCancel.addEventListener('click', clearReply);

// ── KAZU AI (GROQ) ──
const GROQ_API_KEY = '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';
const KAZU_NAME = 'Kazu';
const KAZU_AVATAR = '☕';
const KAZU_UID = '__kazu_ai__';

const kazuTyping = $('kazu-typing');

async function askKazu(userText, senderName, replyContext = null) {
  if (kazuTyping) kazuTyping.classList.remove('hidden');

  const cleanText = userText.replace(/@kazu/gi, '').trim();

  // Kalau ada konteks reply (user balas chat Kazu), sertakan chat sebelumnya
  const contextPart = replyContext
    ? `Sebelumnya kamu (Kazu) berkata: "${replyContext}"\n`
    : '';

  const fullPrompt = `Kamu adalah Kazu ☕, asisten AI yang ramah dan cozy di FocusSpace — sebuah virtual study café. Kamu membantu pengguna dengan pertanyaan apapun: belajar, motivasi, atau obrolan santai. Gaya bahasa kamu casual, hangat, dan menyenangkan seperti teman belajar. Gunakan bahasa Indonesia. Jawab singkat dan padat (maks 3 kalimat kecuali diminta panjang). Sertakan emoji yang sesuai.\n\n${contextPart}${senderName} berkata: "${cleanText}"`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 300,
        temperature: 0.8
      })
    });
    const data = await res.json();
    if (kazuTyping) kazuTyping.classList.add('hidden');
    const reply = data?.choices?.[0]?.message?.content;
    if (reply) {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      push(ref(db, `rooms/${roomName}/messages`), {
        sender: KAZU_NAME, senderUid: KAZU_UID, text: reply, time, type: 'text', isKazu: true
      });
    } else {
      const errMsg = data?.error?.message || 'Hmm, aku bingung nih 😅 Coba tanya lagi ya!';
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      push(ref(db, `rooms/${roomName}/messages`), {
        sender: KAZU_NAME, senderUid: KAZU_UID, text: `⚠️ ${errMsg}`, time, type: 'text', isKazu: true
      });
    }
  } catch (e) {
    if (kazuTyping) kazuTyping.classList.add('hidden');
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    push(ref(db, `rooms/${roomName}/messages`), {
      sender: KAZU_NAME, senderUid: KAZU_UID,
      text: '⚠️ Waduh, koneksiku bermasalah nih. Coba lagi ya! ☕', time, type: 'text', isKazu: true
    });
  }
}

function renderMentions(text) {
  return esc(text).replace(/@kazu/gi, '<span class="mention-kazu">@kazu</span>');
}

function appendMessage(msg) {
  const el = document.createElement('div');
  const isOwn = msg.sender === username;
  const isKazu = msg.isKazu || msg.senderUid === KAZU_UID;
  el.className = 'chat-msg' + (isOwn ? ' own' : '') + (isKazu ? ' kazu-msg' : '');
  el.dataset.msgId = msg.msgId || '';
  el.dataset.sender = msg.sender || '';
  el.dataset.text = msg.text || '';

  const headerRow = document.createElement('div');
  headerRow.className = 'chat-msg-header';

  if (isKazu) {
    const kazuAv = document.createElement('span');
    kazuAv.className = 'kazu-avatar-badge';
    kazuAv.textContent = KAZU_AVATAR;
    headerRow.appendChild(kazuAv);
  }

  const senderEl = document.createElement('strong');
  senderEl.textContent = isOwn ? 'Kamu' : msg.sender;
  headerRow.appendChild(senderEl);

  if (isKazu) {
    const ai = document.createElement('span');
    ai.className = 'kazu-ai-badge';
    ai.textContent = 'AI';
    headerRow.appendChild(ai);
  }

  const isOwner = roomOwnerUid
    ? (msg.senderUid && msg.senderUid === roomOwnerUid)
    : (roomOwnerName && msg.sender === roomOwnerName);
  if (isOwner && !isKazu) {
    const badge = document.createElement('span');
    badge.className = 'chat-owner-badge';
    badge.title = 'Pemilik Ruangan';
    badge.textContent = '👑 Owner';
    headerRow.appendChild(badge);
  }

  el.appendChild(headerRow);

  if (msg.replyTo) {
    const quote = document.createElement('div');
    quote.className = 'chat-reply-quote';
    quote.innerHTML = `<span class="reply-quote-name">${esc(msg.replyTo.sender)}</span><span class="reply-quote-text">${esc((msg.replyTo.text||'').slice(0,60))}</span>`;
    el.appendChild(quote);
  }

  if (msg.type === 'image' && msg.imageData) {
    const img = document.createElement('img');
    img.className = 'chat-img';
    img.src = msg.imageData;
    img.alt = 'Gambar';
    img.addEventListener('click', () => openLightbox(msg.imageData));
    el.appendChild(img);
  } else {
    const body = document.createElement('div');
    body.className = 'chat-msg-body';
    body.innerHTML = renderMentions(msg.text || '');
    el.appendChild(body);
  }

  const footer = document.createElement('div');
  footer.className = 'chat-msg-footer';
  const timeEl = document.createElement('span');
  timeEl.className = 't'; timeEl.textContent = msg.time;
  footer.appendChild(timeEl);

  const replyBtn = document.createElement('button');
  replyBtn.className = 'chat-reply-btn';
  replyBtn.title = 'Balas';
  replyBtn.innerHTML = '↩';
  replyBtn.addEventListener('click', () => setReply({
    sender: msg.sender,
    text: msg.text,
    msgId: msg.msgId || ''
  }));
  footer.appendChild(replyBtn);

  el.appendChild(footer);

  if (chatBox) { chatBox.appendChild(el); chatBox.scrollTop = chatBox.scrollHeight; }
  if (chatNotifEnabled && msg.sender !== username) {
    playNotifSound('chat');
    showChatToast(
      isKazu ? `☕ ${KAZU_NAME}` : msg.sender,
      msg.type === 'image' ? '🖼️ Mengirim gambar' : msg.text
    );
  }
}

function sendMsg(text) {
  if (!text || !roomName) return;
  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const msgData = {
    sender: username, senderUid: userUid, text, time, type: 'text'
  };

  // Simpan info reply sebelum clearReply()
  const currentReply = replyTo ? { ...replyTo } : null;

  if (replyTo) {
    msgData.replyTo = { sender: replyTo.sender, text: replyTo.text };
    clearReply();
  }
  push(ref(db, `rooms/${roomName}/messages`), msgData);

  // Trigger Kazu kalau: mention @kazu, ATAU reply ke chat Kazu
  const isReplyToKazu = currentReply && currentReply.sender === KAZU_NAME;
  if (/@kazu/i.test(text)) {
    askKazu(text, username);
  } else if (isReplyToKazu) {
    // Kirim konteks chat Kazu sebelumnya supaya balasannya nyambung
    askKazu(text, username, currentReply.text);
  }
}

function sendImageMsg(base64Data) {
  if (!base64Data || !roomName) return;
  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  push(ref(db, `rooms/${roomName}/messages`), { sender: username, senderUid: userUid, text: '🖼️ Gambar', imageData: base64Data, time, type: 'image' });
}

const sendBtn = $('send-btn');
if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (pendingImageData) {
      sendImageMsg(pendingImageData);
      clearImagePreview();
      return;
    }
    const t = chatInput ? chatInput.value.trim() : '';
    if (t) { sendMsg(t); chatInput.value = ''; }
  });
}
if (chatInput) {
  chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      if (pendingImageData) {
        sendImageMsg(pendingImageData);
        clearImagePreview();
        return;
      }
      const t = chatInput.value.trim();
      if (t) { sendMsg(t); chatInput.value = ''; }
    }
  });
}

// ── @MENTION AUTOCOMPLETE ──
(function() {
  const dropdown = document.createElement('div');
  dropdown.id = 'mention-dropdown';
  dropdown.className = 'mention-dropdown hidden';
  document.body.appendChild(dropdown);

  let mentionStart = -1;
  let selectedIndex = 0;

  function getMentionQuery() {
    if (!chatInput) return null;
    const val = chatInput.value;
    const cursor = chatInput.selectionStart;
    let i = cursor - 1;
    while (i >= 0 && val[i] !== ' ' && val[i] !== '\n') {
      if (val[i] === '@') { mentionStart = i; return val.slice(i + 1, cursor); }
      i--;
    }
    mentionStart = -1;
    return null;
  }

  function getSuggestions(query) {
    const q = (query || '').toLowerCase();
    const all = [
      { name: 'kazu', label: 'kazu', isKazu: true },
      ...currentRoomMembers
        .filter(n => n !== username)
        .map(n => ({ name: n, label: n, isKazu: false }))
    ];
    return all.filter(s => s.name.toLowerCase().startsWith(q)).slice(0, 6);
  }

  function positionDropdown() {
    if (!chatInput) return;
    const rect = chatInput.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    dropdown.style.width = Math.min(220, rect.width) + 'px';
  }

  function renderDropdown(suggestions) {
    if (!suggestions.length) { hideDropdown(); return; }
    dropdown.innerHTML = '';
    suggestions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'mention-item' + (i === selectedIndex ? ' active' : '');
      item.innerHTML = s.isKazu
        ? `<span class="mention-item-av kazu-av">☕</span><span class="mention-item-name">@kazu</span><span class="mention-item-badge">AI</span>`
        : `<span class="mention-item-av" style="background:${nameToColor(s.name)}">${s.name.charAt(0).toUpperCase()}</span><span class="mention-item-name">@${esc(s.name)}</span>`;
      item.addEventListener('mousedown', (e) => { e.preventDefault(); insertMention(s.name); });
      dropdown.appendChild(item);
    });
    dropdown.classList.remove('hidden');
    positionDropdown();
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
    selectedIndex = 0;
  }

  function insertMention(name) {
    if (!chatInput || mentionStart < 0) return;
    const val = chatInput.value;
    const cursor = chatInput.selectionStart;
    const before = val.slice(0, mentionStart);
    const after  = val.slice(cursor);
    const inserted = `@${name} `;
    chatInput.value = before + inserted + after;
    const newCursor = mentionStart + inserted.length;
    chatInput.setSelectionRange(newCursor, newCursor);
    hideDropdown();
    chatInput.focus();
  }

  if (chatInput) {
    chatInput.addEventListener('input', () => {
      const query = getMentionQuery();
      if (query !== null) {
        selectedIndex = 0;
        renderDropdown(getSuggestions(query));
      } else {
        hideDropdown();
      }
    });

    chatInput.addEventListener('keydown', (e) => {
      if (dropdown.classList.contains('hidden')) return;
      const items = dropdown.querySelectorAll('.mention-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const active = dropdown.querySelector('.mention-item.active');
        if (active) {
          e.preventDefault();
          active.dispatchEvent(new MouseEvent('mousedown'));
        } else {
          hideDropdown();
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    chatInput.addEventListener('blur', () => setTimeout(hideDropdown, 150));
  }
})();

document.querySelectorAll('.rbtn').forEach(btn => {
  if (btn.id !== 'notif-toggle-btn') btn.addEventListener('click', () => sendMsg(btn.dataset.msg));
});

const notifToggleBtn = $('notif-toggle-btn');
if (notifToggleBtn) {
  notifToggleBtn.addEventListener('click', () => {
    chatNotifEnabled = !chatNotifEnabled;
    notifToggleBtn.innerHTML = chatNotifEnabled ? '🔔' : '🔕';
    notifToggleBtn.title = chatNotifEnabled ? 'Matikan notifikasi' : 'Aktifkan notifikasi';
    notifToggleBtn.classList.toggle('notif-off', !chatNotifEnabled);
    showChatToast('FocusSpace', chatNotifEnabled ? 'Notifikasi dinyalakan 🔔' : 'Notifikasi dimatikan 🔕');
  });
}

// ── TOAST ──
let toastTimer = null;
function showChatToast(sender, text) {
  let toast = $('chat-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'chat-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-sender">💬 ${esc(sender)}</span><span class="toast-text">${esc(text)}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── HELPERS ──
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nameToColor(name) {
  const colors = ['#f4845f','#7ec8a0','#90c4e4','#f4a96a','#f9d878','#f4a7b9','#b5a4e0'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

// ── INIT ──
updateTimerDisplay();

// ── MOBILE TAB NAVIGATION ──
(function() {
  const tabs = {
    timer: document.querySelector('.card-pomo'),
    music: document.querySelector('.card-mixer'),
    todo:  document.querySelector('.card-todo'),
  };
  const sidebar = document.querySelector('.chat-room-sidebar');
  const chatContainer = document.querySelector('.card-chat-layout-container');
  const mbnBtns = document.querySelectorAll('.mbn-btn');

  function isMobile() { return window.innerWidth <= 640; }

  function activateTab(tabName) {
    if (!isMobile()) return;

    Object.values(tabs).forEach(el => { if (el) el.classList.remove('mobile-active'); });
    if (sidebar) sidebar.classList.remove('mobile-active');
    if (chatContainer) chatContainer.classList.remove('sidebar-open');

    mbnBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));

    const rightMain = document.querySelector('.dashboard-right-main');
    const isChatTab = (tabName === 'chat' || tabName === 'rooms');
    if (rightMain) rightMain.classList.toggle('tab-hidden', !isChatTab);

    const fab = document.getElementById('focus-fab');
    if (fab) fab.style.display = 'none';

    if (tabName === 'rooms') {
      if (sidebar) sidebar.classList.add('mobile-active');
      if (chatContainer) chatContainer.classList.add('sidebar-open');
    } else if (tabs[tabName]) {
      tabs[tabName].classList.add('mobile-active');
    }
  }

  mbnBtns.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  if (isMobile()) activateTab('chat');

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      Object.values(tabs).forEach(el => { if (el) el.classList.remove('mobile-active'); });
      if (sidebar) sidebar.classList.remove('mobile-active');
      if (chatContainer) chatContainer.classList.remove('sidebar-open');
      const rightMain = document.querySelector('.dashboard-right-main');
      if (rightMain) rightMain.classList.remove('tab-hidden');
    }
  });

  window.mobileActivateTab = activateTab;
})();
