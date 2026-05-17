// =====================================================
//  FOCUSSPACE — script.js
//  Fitur: Google-only login, Create/Delete Room (owner),
//  Password Room (opsional), Notification Sound, Lo-Fi Mixer
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

// ── WEB AUDIO CONTEXT (untuk notification sound) ──
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * Memainkan suara notifikasi menggunakan Web Audio API.
 * type: 'chat' | 'timer' | 'join'
 */
function playNotifSound(type = 'chat') {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'chat') {
      // Dua nada naik — cozy notification
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(780, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);

    } else if (type === 'timer') {
      // Tiga nada — sesi selesai
      [0, 0.18, 0.36].forEach((delay, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.value = [660, 880, 1100][i];
        g.gain.setValueAtTime(0.22, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.35);
      });

    } else if (type === 'join') {
      // Satu nada lembut — seseorang masuk ruangan
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    // Audiocontext belum siap / browser tidak support — abaikan
  }
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

function formatTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function updateTimerDisplay() {
  const t = formatTime(timeLeft);
  timerDisplay.textContent = t;
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
  // Auto-update user status based on mode
  const modeToStatus = { focus: 'focus', break: 'break', long: 'break' };
  if (modeToStatus[mode]) updateUserStatus(modeToStatus[mode]);
}

function setPlayState(isPlaying) {
  running = isPlaying;
  playIcon.classList.toggle('hidden', isPlaying);
  pauseIcon.classList.toggle('hidden', !isPlaying);
  toggleBtn.classList.toggle('running', isPlaying);
}

modeTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => {
    if (running) return;
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    applyMode(['focus','break','long'][i]);
  });
});

toggleBtn.addEventListener('click', () => {
  if (!running) {
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
  } else {
    clearInterval(timerId); timerId = null;
    setPlayState(false);
  }
});

resetBtn.addEventListener('click', () => {
  clearInterval(timerId); timerId = null;
  setPlayState(false);
  timeLeft = totalSecs;
  updateTimerDisplay();
  document.title = 'FocusSpace ☕';
});

$('reset-sesh-btn').addEventListener('click', () => {
  if (confirm('Apakah kamu ingin mereset sesi kembali ke sesi 1?')) {
    sessionNum = 1;
    if (seshNum)      seshNum.textContent       = sessionNum;
    if (sessionBadge) sessionBadge.textContent  = `Sesi ke-${sessionNum}`;
    updateSessionDots();
    applyMode('focus');
    modeTabs.forEach(t => t.classList.remove('active'));
    modeTabs[0].classList.add('active');
  }
});

skipBtn.addEventListener('click', () => {
  clearInterval(timerId); timerId = null;
  setPlayState(false);
  onTimerEnd(true);
});

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
    if (seshNum)      seshNum.textContent      = sessionNum;
    if (sessionBadge) sessionBadge.textContent = `Sesi ke-${sessionNum}`;
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

// ── TODO LIST ──
const todoList  = $('todo-list');
const todoInput = $('todo-input');
const addTodo   = $('add-todo');
const todoStats = $('todo-stats');
const clearNotes = $('clear-notes');

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
    text.className = 'todo-text';
    text.textContent = todo.text;
    const del = document.createElement('button');
    del.className = 'todo-del';
    del.textContent = '×';
    del.addEventListener('click', () => { todos.splice(i, 1); saveTodos(); });
    item.appendChild(check); item.appendChild(text); item.appendChild(del);
    todoList.appendChild(item);
  });
  const done = todos.filter(t => t.done).length;
  if (todoStats) todoStats.textContent = todos.length > 0 ? `${done}/${todos.length} selesai` : '';
}

function addTodoItem() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  todoInput.value = '';
  saveTodos();
}

if (addTodo) {
  addTodo.addEventListener('click', addTodoItem);
  todoInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTodoItem(); });
  clearNotes.addEventListener('click', () => {
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
  exitFocus.addEventListener('click', () => {
    focusModeActive = false;
    focusOverlay.classList.add('hidden');
  });
}

// ── USER STATUS ──
const statusConfig = {
  focus:    { emoji: '🧠', label: 'Fokus',      color: '#f4845f' },
  break:    { emoji: '☕', label: 'Istirahat',  color: '#7ec8a0' },
  studying: { emoji: '📚', label: 'Belajar',    color: '#90c4e4' },
  idle:     { emoji: '💤', label: 'Santai',     color: '#c8c8c8' },
  away:     { emoji: '🚶', label: 'Away',       color: '#f9d878' },
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
  
  // Update active in dropdown
  document.querySelectorAll('.status-opt').forEach(opt => {
    opt.classList.toggle('active-opt', opt.dataset.status === status);
  });
  // Update focus mode buttons
  document.querySelectorAll('.fstatus-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  // Push to Firebase if in a room (userRef is set globally after Firebase init)
  if (typeof userRef !== 'undefined' && userRef && typeof set !== 'undefined') {
    set(userRef, { name: username, avatar: userAvatar, uid: userUid, status });
  }
}

// Status dropdown toggle
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

// Focus mode status buttons
document.querySelectorAll('.fstatus-btn').forEach(btn => {
  btn.addEventListener('click', () => updateUserStatus(btn.dataset.status));
});

// ── SCREEN TEMPERATURE (WARM FILTER) ──
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

  // val 0-100: opacity goes from 0 to 0.55
  const opacity = (val / 100) * 0.55;

  // Amber-sepia color that deepens with temperature
  const r = Math.round(230 - (val / 100) * 30);
  const g = Math.round(160 - (val / 100) * 80);
  const b = Math.round(80  - (val / 100) * 60);

  filter.style.background = opacity > 0.005
    ? `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`
    : 'transparent';

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

  screenTempSlider.addEventListener('input', () => {
    applyScreenTemp(parseInt(screenTempSlider.value));
  });
}

document.querySelectorAll('.temp-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.val);
    if (screenTempSlider) screenTempSlider.value = val;
    applyScreenTemp(val);
  });
});

// ── FIREBASE ──
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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

const app           = initializeApp(firebaseConfig);
const auth          = getAuth(app);
const db            = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

let username    = '';
let userAvatar  = '👤';
let userUid     = '';
let userRef     = null;
let roomName    = '';

// Unsubscribers
let unsubscribeUsers = null;
let unsubscribeMsgs  = null;

// Room tracking — untuk keperluan owner check
let prevMemberCount = 0;

// ── LOGIN ──
const loginOverlay   = $('login-overlay');
const mainContent    = $('main-content');
const googleLoginBtn = $('google-login-btn');

function handleLoginSuccess(uid, displayName, avatar) {
  userUid    = uid;
  username   = displayName;
  userAvatar = avatar;

  $('widget-name').textContent   = username;
  $('widget-avatar').textContent = userAvatar;

  loginOverlay.style.opacity       = '0';
  loginOverlay.style.pointerEvents = 'none';
  setTimeout(() => loginOverlay.style.display = 'none', 500);

  mainContent.classList.remove('hidden');
  listenToActiveRooms();
}

googleLoginBtn.addEventListener('click', () => {
  signInWithPopup(auth, googleProvider).then(result => {
    const u = result.user;
    // Gunakan foto profil Google jika tersedia, kalau tidak pakai emoji
    handleLoginSuccess(u.uid, u.displayName || 'Google User', '🐱');
  }).catch(err => {
    console.error(err);
    alert('Gagal masuk Google. Pastikan jendela Pop-up diizinkan browser!');
  });
});

// ── PROFILE MODAL ──
const profileTrigger       = $('profile-trigger');
const profileModal         = $('profile-modal');
const closeProfileBtn      = $('close-profile-btn');
const saveProfileBtn       = $('save-profile-btn');
const editNameInput        = $('edit-name-input');
const profileAvatarDisplay = $('profile-avatar-display');
let selectedEmoji = '🐱';

profileTrigger.addEventListener('click', () => {
  editNameInput.value  = username;
  selectedEmoji        = userAvatar;
  profileAvatarDisplay.textContent = selectedEmoji;
  document.querySelectorAll('.emoji-opt').forEach(opt => {
    opt.classList.toggle('selected', opt.textContent === selectedEmoji);
  });
  profileModal.classList.remove('hidden');
});

document.querySelectorAll('.emoji-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedEmoji = opt.textContent;
    profileAvatarDisplay.textContent = selectedEmoji;
  });
});

closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
saveProfileBtn.addEventListener('click', () => {
  const newName = editNameInput.value.trim();
  if (!newName) return;
  username   = newName;
  userAvatar = selectedEmoji;
  $('widget-name').textContent   = username;
  $('widget-avatar').textContent = userAvatar;
  if (userRef) set(userRef, { name: username, avatar: userAvatar, uid: userUid, status: currentUserStatus });
  profileModal.classList.add('hidden');
});

// ── CREATE ROOM MODAL ──
const createRoomModal   = $('create-room-modal');
const openCreateRoomBtn = $('open-create-room-btn');
const newRoomNameInput  = $('new-room-name');
const newRoomPwInput    = $('new-room-pw');
const confirmCreateRoom = $('confirm-create-room');
const cancelCreateRoom  = $('cancel-create-room');
const togglePwVis       = $('toggle-pw-vis');

openCreateRoomBtn.addEventListener('click', () => {
  newRoomNameInput.value = '';
  newRoomPwInput.value   = '';
  createRoomModal.classList.remove('hidden');
  setTimeout(() => newRoomNameInput.focus(), 100);
});

cancelCreateRoom.addEventListener('click', () => createRoomModal.classList.add('hidden'));

togglePwVis.addEventListener('click', () => {
  newRoomPwInput.type = newRoomPwInput.type === 'password' ? 'text' : 'password';
});

confirmCreateRoom.addEventListener('click', async () => {
  const rn = newRoomNameInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  if (!rn) { newRoomNameInput.focus(); return; }

  const pw = newRoomPwInput.value.trim();

  // Cek apakah ruangan sudah ada
  const roomSnap = await get(ref(db, `rooms/${rn}/meta`));
  if (roomSnap.exists()) {
    alert(`Ruangan #${rn} sudah ada! Pilih nama lain atau langsung bergabung.`);
    return;
  }

  // Simpan metadata ruangan: owner UID, nama, password (bila ada)
  const roomMeta = {
    ownerUid:  userUid,
    ownerName: username,
    hasPassword: pw.length > 0,
    password:  pw.length > 0 ? pw : null,
    createdAt: Date.now()
  };

  await set(ref(db, `rooms/${rn}/meta`), roomMeta);
  createRoomModal.classList.add('hidden');

  // Langsung masuk ke ruangan yang baru dibuat
  joinRoom(rn);
});

// ── PASSWORD MODAL (saat join ruangan berpassword) ──
const pwModal         = $('pw-modal');
const pwModalRoomName = $('pw-modal-room-name');
const joinRoomPwInput = $('join-room-pw');
const pwErrorMsg      = $('pw-error-msg');
const confirmJoinPw   = $('confirm-join-pw');
const cancelJoinPw    = $('cancel-join-pw');
const toggleJoinPwVis = $('toggle-join-pw-vis');

let pendingJoinRoom = '';

cancelJoinPw.addEventListener('click', () => {
  pwModal.classList.add('hidden');
  pendingJoinRoom = '';
});

toggleJoinPwVis.addEventListener('click', () => {
  joinRoomPwInput.type = joinRoomPwInput.type === 'password' ? 'text' : 'password';
});

confirmJoinPw.addEventListener('click', async () => {
  const enteredPw = joinRoomPwInput.value.trim();
  const snap = await get(ref(db, `rooms/${pendingJoinRoom}/meta`));
  if (!snap.exists()) { pwModal.classList.add('hidden'); return; }
  const meta = snap.val();
  if (enteredPw === meta.password) {
    pwModal.classList.add('hidden');
    pwErrorMsg.classList.add('hidden');
    joinRoom(pendingJoinRoom);
    pendingJoinRoom = '';
  } else {
    pwErrorMsg.classList.remove('hidden');
    joinRoomPwInput.value = '';
    joinRoomPwInput.focus();
  }
});

joinRoomPwInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') confirmJoinPw.click();
});

// ── DELETE ROOM MODAL ──
const deleteRoomModal   = $('delete-room-modal');
const deleteRoomBtn     = $('delete-room-btn');
const confirmDeleteRoom = $('confirm-delete-room');
const cancelDeleteRoom  = $('cancel-delete-room');

deleteRoomBtn.addEventListener('click', () => {
  deleteRoomModal.classList.remove('hidden');
});

cancelDeleteRoom.addEventListener('click', () => deleteRoomModal.classList.add('hidden'));

confirmDeleteRoom.addEventListener('click', async () => {
  if (!roomName) return;
  const deletedRoom = roomName; // simpan sebelum leaveRoom() clear-kan
  // Hapus seluruh data ruangan termasuk messages & users
  await remove(ref(db, `rooms/${deletedRoom}`));
  deleteRoomModal.classList.add('hidden');
  // leaveRoom() akan dipanggil otomatis oleh onValue meta listener
  // tapi kita panggil manual juga untuk owner (karena listener sudah unsubscribe saat hapus)
  if (roomName === deletedRoom) leaveRoom();
  showChatToast('FocusSpace', `Ruangan #${deletedRoom} berhasil dihapus 🗑️`);
});

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

function leaveRoom() {
  if (userRef) { remove(userRef); userRef = null; }
  if (unsubscribeUsers)    { unsubscribeUsers();    unsubscribeUsers    = null; }
  if (unsubscribeMsgs)     { unsubscribeMsgs();     unsubscribeMsgs     = null; }
  if (unsubscribeRoomMeta) { unsubscribeRoomMeta(); unsubscribeRoomMeta = null; }

  roomName = '';
  roomInput.value = '';
  chatBox.innerHTML = '';
  chatSection.style.display = 'none';
  if ($('chat-placeholder-hint')) $('chat-placeholder-hint').style.display = 'flex';
  membersWrap.style.display = 'none';
  roomStatus.textContent = 'Belum bergabung ke ruangan';
  onlineCount.textContent = 'Pilih ruangan dulu';
  deleteRoomBtn.classList.add('hidden');
  prevMemberCount = 0;
}

async function attemptJoinRoom(rn) {
  if (!rn) return;
  // Ambil metadata ruangan
  const snap = await get(ref(db, `rooms/${rn}/meta`));

  // ── FIX: Jika ruangan tidak ada, tampilkan error — jangan buat otomatis ──
  if (!snap.exists()) {
    showChatToast('FocusSpace', `Ruangan #${rn} tidak ditemukan. Buat dulu ya! 🚪`);
    return;
  }

  const meta = snap.val();
  if (meta.hasPassword && meta.ownerUid !== userUid) {
    // Tampilkan modal password
    pendingJoinRoom = rn;
    pwModalRoomName.textContent = `Ruangan: #${rn}`;
    joinRoomPwInput.value = '';
    pwErrorMsg.classList.add('hidden');
    pwModal.classList.remove('hidden');
    setTimeout(() => joinRoomPwInput.focus(), 100);
    return;
  }

  // Tanpa password / owner langsung masuk
  joinRoom(rn);
}

// ── Listener untuk deteksi room dihapus (paksa keluar semua user) ──
let unsubscribeRoomMeta = null;

function joinRoom(rn) {
  if (!rn) return;

  // Matikan sesi kamar sebelumnya
  if (userRef) remove(userRef);
  if (unsubscribeUsers)    { unsubscribeUsers();    unsubscribeUsers    = null; }
  if (unsubscribeMsgs)     { unsubscribeMsgs();     unsubscribeMsgs     = null; }
  if (unsubscribeRoomMeta) { unsubscribeRoomMeta(); unsubscribeRoomMeta = null; }

  roomName = rn;
  roomInput.value = rn;
  chatBox.innerHTML = '';
  prevMemberCount = 0;

  chatSection.style.display = 'flex';
  if ($('chat-placeholder-hint')) $('chat-placeholder-hint').style.display = 'none';
  membersWrap.style.display = 'block';
  roomStatus.textContent = `📍 Ruang: #${roomName}`;

  userRef = ref(db, `rooms/${roomName}/users/${userUid}`);
  set(userRef, { name: username, avatar: userAvatar, uid: userUid, status: currentUserStatus });
  onDisconnect(userRef).remove();

  // Cek apakah user adalah owner — tampilkan tombol hapus
  get(ref(db, `rooms/${roomName}/meta`)).then(snap => {
    if (snap.exists() && snap.val().ownerUid === userUid) {
      deleteRoomBtn.classList.remove('hidden');
    } else {
      deleteRoomBtn.classList.add('hidden');
    }
  });

  // ── FIX: Watch room meta — kalau room dihapus, paksa semua user keluar ──
  const capturedRoomName = rn;
  unsubscribeRoomMeta = onValue(ref(db, `rooms/${capturedRoomName}/meta`), metaSnap => {
    if (!metaSnap.exists() && roomName === capturedRoomName) {
      // Room dihapus oleh owner — paksa keluar & bersihkan chat
      const deletedRoom = capturedRoomName;
      leaveRoom();
      showChatToast('FocusSpace', `Ruangan #${deletedRoom} telah dihapus oleh owner 🗑️`);
    }
  });

  // Dengarkan daftar user
  const usersRef = ref(db, `rooms/${roomName}/users`);
  unsubscribeUsers = onValue(usersRef, snap => {
    const data    = snap.val() || {};
    const members = Object.values(data);
    const count   = members.length;
    onlineCount.textContent = `${count} di #${roomName}`;

    // Suara saat ada yang bergabung (bukan diri sendiri masuk pertama)
    if (prevMemberCount > 0 && count > prevMemberCount) {
      playNotifSound('join');
    }
    prevMemberCount = count;

    membersList.innerHTML = '';
    members.forEach(m => {
      const chip = document.createElement('div');
      chip.className = 'member-chip';
      const av = document.createElement('div');
      av.className = 'member-avatar';
      av.textContent = m.avatar || m.name.charAt(0).toUpperCase();
      av.style.background = nameToColor(m.name);
      const nm = document.createElement('span');
      nm.className = 'member-name';
      nm.textContent = m.name;
      chip.appendChild(av);
      chip.appendChild(nm);
      // Status badge
      if (m.status && statusConfig[m.status]) {
        const sb = document.createElement('span');
        sb.className = 'member-status';
        sb.textContent = statusConfig[m.status].emoji;
        sb.title = statusConfig[m.status].label;
        chip.appendChild(sb);
      }
      membersList.appendChild(chip);
    });
  });

  // Dengarkan pesan masuk
  const msgsRef = ref(db, `rooms/${roomName}/messages`);
  unsubscribeMsgs = onChildAdded(msgsRef, snap => appendMessage(snap.val()));
}

// Tombol Masuk
joinBtn.addEventListener('click', () => {
  const rn = roomInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  if (rn) attemptJoinRoom(rn);
});
roomInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    const rn = roomInput.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    if (rn) attemptJoinRoom(rn);
  }
});

// ── DAFTAR RUANGAN AKTIF ──
function listenToActiveRooms() {
  onValue(ref(db, 'rooms'), snap => {
    const roomsData      = snap.val() || {};
    const activeRoomsList = $('active-rooms-list');
    activeRoomsList.innerHTML = '';
    let hasActiveRooms = false;

    for (const rKey in roomsData) {
      const room = roomsData[rKey];

      // ── FIX: Jika room tidak punya meta (sudah dihapus / invalid), skip ──
      if (!room.meta) continue;

      if (room.users) {
        const userEntries = Object.entries(room.users);
        const userCount = userEntries.length;
        if (userCount > 0) {
          hasActiveRooms = true;
          const chip = document.createElement('div');
          chip.className = 'room-click-chip';

          const hasLock = room.meta && room.meta.hasPassword;
          chip.innerHTML = `${hasLock ? '🔒' : '🔓'} #${rKey} <span style="color:var(--brown-light);font-size:11px;">(${userCount}👥)</span>`;

          // Tampilkan crown jika user adalah owner
          if (room.meta && room.meta.ownerUid === userUid) {
            const crown = document.createElement('span');
            crown.className = 'owner-crown';
            crown.textContent = ' 👑';
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
  timeEl.className = 't';
  timeEl.textContent = msg.time;
  el.appendChild(senderEl);
  el.append(' ' + esc(msg.text) + ' ');
  el.appendChild(timeEl);
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;

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

$('send-btn').addEventListener('click', () => {
  const t = chatInput.value.trim();
  if (t) { sendMsg(t); chatInput.value = ''; }
});
chatInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    const t = chatInput.value.trim();
    if (t) { sendMsg(t); chatInput.value = ''; }
  }
});

document.querySelectorAll('.rbtn').forEach(btn => {
  if (btn.id !== 'notif-toggle-btn') btn.addEventListener('click', () => sendMsg(btn.dataset.msg));
});

// Notifikasi toggle
const notifToggleBtn = $('notif-toggle-btn');
if (notifToggleBtn) {
  notifToggleBtn.addEventListener('click', () => {
    chatNotifEnabled = !chatNotifEnabled;
    notifToggleBtn.innerHTML = chatNotifEnabled ? '🔔' : '🔕';
    notifToggleBtn.title = chatNotifEnabled ? 'Matikan notifikasi chat' : 'Aktifkan notifikasi chat';
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

// Init timer display
updateTimerDisplay();
