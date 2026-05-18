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
// =========================================================================
// ── INTEGRASI YOUTUBE PLAYER & LO-FI AUDIO MIXER ──
// =========================================================================

// 1. Suntik secara otomatis skrip YouTube Iframe API ke halaman web
var ytTag = document.createElement('script');
ytTag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(ytTag, firstScriptTag);

let ytPlayer = null;
let isYoutubeMode = false;

// Fungsi pembantu untuk mengambil ID Video dari berbagai format URL YouTube
function extractYouTubeID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Fungsi global yang otomatis dipanggil saat YouTube API selesai dimuat
window.onYouTubeIframeAPIReady = function() {
  // Kita siapkan objek player kosong terlebih dahulu pada container HTML
  ytPlayer = new YT.Player('lofi1-youtube-container', {
    height: '0',
    width: '0',
    playerVars: {
      'autoplay': 0,
      'loop': 1,
      'controls': 0
    },
    events: {
      'onReady': onYoutubePlayerReady,
      'onStateChange': onYoutubeStateChange
    }
  });
};

function onYoutubePlayerReady(event) {
  console.log("YouTube Player API siap digunakan di FocusSpace!");
}

// Berfungsi menjaga agar musik YouTube otomatis mengulang (looping) sempurna
function onYoutubeStateChange(event) {
  if (event.data === YT.PlayerState.ENDED && isYoutubeMode) {
    ytPlayer.playVideo();
  }
}

// Tambahkan Event Listener untuk mendeteksi input URL YouTube dari user
const ytUrlInput = $('lofi1-yt-url');
if (ytUrlInput) {
  ytUrlInput.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    const videoId = extractYouTubeID(url);

    if (videoId && ytPlayer && typeof ytPlayer.cueVideoById === 'function') {
      // Jika URL Valid, matikan audio lokal bawaan dan alihkan ke mode YouTube
      isYoutubeMode = true;
      const audioLokal = $('lofi1-audio');
      if (audioLokal) {
        audioLokal.pause();
        audioLokal.src = ""; // hapus track lokal agar tidak bentrok
      }
      
      // Muat video ke player tersembunyi
      ytPlayer.cueVideoById({ videoId: videoId });
      showChatToast('FocusSpace', 'Audio YouTube berhasil dimuat! Geser slider volume untuk memutar 🎵');
      
      // Trigger sinkronisasi ulang volume mixer
      triggerMixerSync(0); // lofi1 berada pada indeks ke-0
    } else if (url === "") {
      // Jika input dikosongkan, kembalikan ke setelan audio default (opsional)
      isYoutubeMode = false;
      if (ytPlayer) ytPlayer.pauseVideo();
      const audioLokal = $('lofi1-audio');
      if (audioLokal) audioLokal.src = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3";
      triggerMixerSync(0);
    }
  });
}

// Modifikasi sistem pengatur Slider Volume bawaan kamu agar mendukung percabangan YouTube
const audioSliders = [
  { slider: $('lofi1-vol'), audio: $('lofi1-audio'), pct: $('lofi1-pct') },
  { slider: $('lofi2-vol'), audio: $('lofi2-audio'), pct: $('lofi2-pct') },
  { slider: $('lofi3-vol'), audio: $('lofi3-audio'), pct: $('lofi3-pct') },
  { slider: $('lofi4-vol'), audio: $('lofi4-audio'), pct: $('lofi4-pct') },
];

function triggerMixerSync(index) {
  const { slider, audio, pct } = audioSliders[index];
  if (!slider) return;
  
  const v = parseFloat(slider.value);
  const p = Math.round(v * 100);
  if (pct) pct.textContent = `${p}%`;
  slider.style.setProperty('--fill', `${p}%`);

  // Logika Khusus untuk Lofi Jalur 1 (Mendukung YouTube & Lokal)
  if (index === 0 && isYoutubeMode && ytPlayer && typeof ytPlayer.setVolume === 'function') {
    if (v > 0) {
      ytPlayer.setVolume(v * 100); // API YouTube menggunakan skala volume 0-100
      if (ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
        ytPlayer.playVideo();
      }
    } else {
      ytPlayer.pauseVideo();
    }
  } else {
    // Logika untuk audio HTML5 lokal biasa (Lofi 2, 3, 4 atau Lofi 1 normal)
    audio.volume = v;
    if (v > 0 && audio.paused) audio.play().catch(() => {});
    else if (v === 0) audio.pause();
  }
}

audioSliders.forEach(({ slider }, index) => {
  if (!slider) return;
  slider.addEventListener('input', () => triggerMixerSync(index));
  triggerMixerSync(index); // Jalankan inisialisasi awal saat halaman dimuat
});
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

// Init theme
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
  "🔥 Passion tanpa disiplin itu mimpi. Disiplin tanpa passion itu penyiksaan. Cari keduanya!",
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

// ── FIREBASE ──
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, onValue, onDisconnect, set, push, onChildAdded, remove, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTo8H7OV0XZtcAdJrk2fnXXsLiMDXlTmw",
  authDomain: "focus-space-f158e.firebaseapp.com",
  databaseURL: "https://focus-space-f158e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "focus-space-f158e",
  storageBucket: "focus-space-f158e.firebasestorage.app",
  messagingSenderId: "947141512235",
  appId: "1:947141512235:web:fbca8bcb5c3b98906e2e6e"
};

const app            = initializeApp(firebaseConfig);
const auth           = getAuth(app);
const db             = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

let username    = '';
let userAvatar  = '👤';
let userUid     = '';
let userRef     = null;
let roomName    = '';
let unsubscribeUsers = null;
let unsubscribeMsgs  = null;
let prevMemberCount  = 0;
let isGuest = false;

// ── LOGIN ELEMENTS ──
const loginOverlay = $('login-overlay');
const mainContent  = $('main-content');

// ── handleLoginSuccess ──
function handleLoginSuccess(uid, displayName, avatar, guest = false) {
  userUid    = uid;
  username   = displayName;
  userAvatar = avatar;
  isGuest    = guest;

  $('widget-name').textContent   = username;
  $('widget-avatar').textContent = userAvatar;

  loginOverlay.style.opacity       = '0';
  loginOverlay.style.pointerEvents = 'none';
  setTimeout(() => loginOverlay.style.display = 'none', 500);

  mainContent.classList.remove('hidden');
  initQuote();
  if (!guest) listenToActiveRooms();
  else listenToActiveRooms(); // guests can also join rooms
}

// ── GOOGLE LOGIN ──
const googleLoginBtn = $('google-login-btn');
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider).then(result => {
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
  guestLoginBtn.addEventListener('click', () => {
    const name = guestNameInput ? guestNameInput.value.trim() : '';
    if (!name) { guestNameInput && (guestNameInput.style.borderColor = 'var(--red)'); return; }
    // Generate fake uid for guest
    const uid = 'guest_' + Math.random().toString(36).slice(2, 10);
    handleLoginSuccess(uid, name, '🐣', true);
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
    // Leave room first
    if (roomName) leaveRoom();
    if (!isGuest) {
      try { await signOut(auth); } catch(e) {}
    }
    // Reset UI
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
    $('widget-name').textContent   = username;
    $('widget-avatar').textContent = userAvatar;
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

function leaveRoom() {
  if (userRef) { remove(userRef); userRef = null; }
  if (unsubscribeUsers)    { unsubscribeUsers();    unsubscribeUsers    = null; }
  if (unsubscribeMsgs)     { unsubscribeMsgs();     unsubscribeMsgs     = null; }
  if (unsubscribeRoomMeta) { unsubscribeRoomMeta(); unsubscribeRoomMeta = null; }
  roomName = '';
  if (roomInput) roomInput.value = '';
  if (chatBox) chatBox.innerHTML = '';
  if (chatSection) chatSection.style.display = 'none';
  const hint = $('chat-placeholder-hint');
  if (hint) hint.style.display = 'flex';
  if (membersWrap) membersWrap.style.display = 'none';
  if (roomStatus) roomStatus.textContent = 'Belum bergabung ke ruangan';
  if (onlineCount) onlineCount.textContent = 'Pilih ruangan dulu';
  if (deleteRoomBtn) deleteRoomBtn.classList.add('hidden');
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
    if (snap.exists() && snap.val().ownerUid === userUid) {
      if (deleteRoomBtn) deleteRoomBtn.classList.remove('hidden');
    } else {
      if (deleteRoomBtn) deleteRoomBtn.classList.add('hidden');
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

// ── CHAT ──
function appendMessage(msg) {
  const el = document.createElement('div');
  el.className = 'chat-msg' + (msg.sender === username ? ' own' : '');
  const senderEl = document.createElement('strong');
  senderEl.textContent = msg.sender === username ? 'Kamu' : msg.sender;
  const timeEl = document.createElement('span');
  timeEl.className = 't'; timeEl.textContent = msg.time;
  el.appendChild(senderEl);
  el.append(' ' + esc(msg.text) + ' ');
  el.appendChild(timeEl);
  if (chatBox) { chatBox.appendChild(el); chatBox.scrollTop = chatBox.scrollHeight; }
  if (chatNotifEnabled && msg.sender !== username) {
    playNotifSound('chat');
    showChatToast(msg.sender, msg.text);
  }
}

function sendMsg(text) {
  if (!text || !roomName) return;
  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  push(ref(db, `rooms/${roomName}/messages`), { sender: username, text, time });
}

const sendBtn = $('send-btn');
if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const t = chatInput ? chatInput.value.trim() : '';
    if (t) { sendMsg(t); chatInput.value = ''; }
  });
}
if (chatInput) {
  chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      const t = chatInput.value.trim();
      if (t) { sendMsg(t); chatInput.value = ''; }
    }
  });
}

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
