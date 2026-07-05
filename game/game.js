// --- NIGHT CITY RACING GAME LOGIC ---

// --- GLOBALS & STATE ---
let canvas = null;
let ctx = null;
let player = null;
let player2 = null;
let aiCars = [];
let camera = { x: 0, y: 0 };
let camera2 = { x: 0, y: 0 };
let renderView = { camera: { x: 0, y: 0 }, offsetX: 0, offsetY: 0, width: 0, height: 0 };
let raceWinner = null;
let countdownTime = 3.5;
let raceStartTime = 0;
let currentLapStartTime = 0;
let bestLapTime = Infinity;
let isGameRunning = false;
let isPaused = false;
let isFinished = false;
let animationId = null;
let totalNitroVolumeUsed = 0;
let lastTime = 0;

// Setup global keys for keyboard & mobile touch mapping
window.keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  nitro: false
};

window.keys2 = {
  left: false,
  right: false,
  up: false,
  down: false,
  nitro: false
};

// --- SETTINGS DEFAULT & LOCAL STORAGE ---
const STARTING_COINS = 3000000;

const CAR_CATALOG = [
  { id: 'yellow', name: 'Swift GT', price: 0, primary: '#f5d300', accent: '#1a1a1a', highlight: '#fff', stats: { top: 62, accel: 68, handling: 65, brake: 70 } },
  { id: 'green', name: 'Aero RS', price: 85000, primary: '#1a8c4a', accent: '#e8e8e8', highlight: '#39ff14', stats: { top: 72, accel: 70, handling: 74, brake: 71 } },
  { id: 'red', name: 'Thunder V8', price: 120000, primary: '#cc1122', accent: '#111', highlight: '#ff3355', stats: { top: 78, accel: 82, handling: 68, brake: 65 } },
  { id: 'gold', name: 'McLaren X', price: 250000, primary: '#d4af37', accent: '#222', highlight: '#ffe566', stats: { top: 88, accel: 85, handling: 80, brake: 72 } },
  { id: 'ferrari', name: 'Rossa F1', price: 320000, primary: '#e8001c', accent: '#ffd700', highlight: '#ff4444', stats: { top: 90, accel: 88, handling: 76, brake: 70 } },
  { id: 'white', name: 'Classic F40', price: 450000, primary: '#f0f0f0', accent: '#cc0000', highlight: '#fff', stats: { top: 92, accel: 86, handling: 78, brake: 74 } },
  { id: 'purple', name: 'Hyper Violet', price: 111000, primary: '#5b2fd4', accent: '#ffd700', highlight: '#9b6bff', stats: { top: 95, accel: 90, handling: 82, brake: 76 } },
  { id: 'silver', name: 'Veyron SS', price: 580000, primary: '#c0c5ce', accent: '#333', highlight: '#00f5ff', stats: { top: 98, accel: 94, handling: 75, brake: 78 } }
];

let profile = {
  coins: STARTING_COINS,
  ownedCars: ['yellow'],
  carP1: 'yellow',
  carP2: 'red',
  garagePlayer: 1,
  selectedCarId: 'yellow',
  selectedTrackId: 'nightcity',
  raceMode: 'championship',
  bestLaps: {},
  trackReturnScreen: 'menuScreen'
};

let pendingRaceMode = 'championship';
let raceLapTarget = 3;
const SPEEDO_ARC_LEN = 236;
const SPEEDO_NITRO_ARC = 188;

let settings = {
  sfx: true,
  music: true,
  difficulty: 'normal',
  carColor: 'orange'
};

function formatCoins(n) {
  return Number(n).toLocaleString('en-US');
}

function getCarById(id) {
  return CAR_CATALOG.find(c => c.id === id) || CAR_CATALOG[0];
}

function loadProfile() {
  let saved = localStorage.getItem('nightCityRacingProfile');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      profile = { ...profile, ...data };
      if (!Array.isArray(profile.ownedCars)) profile.ownedCars = ['yellow'];
    } catch (e) {}
  }
  if (!localStorage.getItem('nightCityRacing_v2')) {
    profile.coins = STARTING_COINS;
    localStorage.setItem('nightCityRacing_v2', '1');
  }
  if (profile.coins == null || profile.coins === 0) profile.coins = STARTING_COINS;
  if (!profile.ownedCars.includes('yellow')) profile.ownedCars.unshift('yellow');
  if (!profile.carP1) profile.carP1 = 'yellow';
  if (!profile.carP2) profile.carP2 = 'red';
  if (!profile.selectedTrackId) profile.selectedTrackId = 'nightcity';
  if (!profile.bestLaps) profile.bestLaps = {};
  saveProfile();
  updateCoinDisplays();
}

function saveProfile() {
  localStorage.setItem('nightCityRacingProfile', JSON.stringify(profile));
  updateCoinDisplays();
}

function updateCoinDisplays() {
  const txt = formatCoins(profile.coins);
  ['coinDisplay', 'garageCoinDisplay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  });
}

function isCarOwned(id) {
  return profile.ownedCars.includes(id);
}

function buildCarSvg(car, large = false) {
  const p = car.primary;
  const a = car.accent;
  const h = car.highlight;
  const id = car.id;
  const vb = large ? '0 0 320 130' : '0 0 220 88';
  const wr = large ? 22 : 14;
  const wh = large ? 10 : 6;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="b-${id}" x1="0%" y1="15%" x2="100%" y2="85%">
        <stop offset="0%" stop-color="${h}"/>
        <stop offset="40%" stop-color="${p}"/>
        <stop offset="100%" stop-color="${a}"/>
      </linearGradient>
      <linearGradient id="g-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(215,235,255,0.95)"/>
        <stop offset="100%" stop-color="rgba(28,42,68,0.92)"/>
      </linearGradient>
    </defs>
    <ellipse cx="${large ? 160 : 110}" cy="${large ? 118 : 80}" rx="${large ? 105 : 72}" ry="${large ? 8 : 5}" fill="rgba(0,0,0,0.45)"/>
    <ellipse cx="${large ? 248 : 170}" cy="${large ? 96 : 66}" rx="${wr}" ry="${wr}" fill="#0a0a0a" stroke="#444" stroke-width="2"/>
    <ellipse cx="${large ? 248 : 170}" cy="${large ? 96 : 66}" rx="${wh}" ry="${wh}" fill="#555"/>
    <rect x="${large ? 242 : 165}" y="${large ? 90 : 62}" width="${large ? 8 : 5}" height="${large ? 14 : 9}" fill="${a}" rx="1"/>
    <ellipse cx="${large ? 72 : 50}" cy="${large ? 98 : 68}" rx="${wr - 2}" ry="${wr - 2}" fill="#0a0a0a" stroke="#444" stroke-width="2"/>
    <ellipse cx="${large ? 72 : 50}" cy="${large ? 98 : 68}" rx="${wh - 1}" ry="${wh - 1}" fill="#555"/>
    <path d="${large
      ? 'M28 92 L52 58 L98 48 L248 44 L288 58 L298 82 L282 96 L108 100 L36 94 Z'
      : 'M20 64 L38 42 L68 36 L168 34 L196 44 L204 62 L192 72 L76 74 L26 70 Z'}" fill="url(#b-${id})" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
    <path d="${large ? 'M28 92 L42 72 L54 80 Z' : 'M20 64 L30 52 L38 58 Z'}" fill="${a}"/>
    <rect x="${large ? 108 : 74}" y="${large ? 52 : 38}" width="${large ? 22 : 14}" height="${large ? 6 : 4}" rx="1" fill="rgba(0,0,0,0.35)"/>
    <rect x="${large ? 136 : 92}" y="${large ? 50 : 36}" width="${large ? 22 : 14}" height="${large ? 6 : 4}" rx="1" fill="rgba(0,0,0,0.35)"/>
    <path d="${large
      ? 'M136 50 L158 32 L228 28 L262 42 L248 68 L168 72 L140 62 Z'
      : 'M94 38 L108 26 L152 24 L178 34 L168 52 L118 54 L96 48 Z'}" fill="url(#g-${id})" stroke="${h}" stroke-width="0.6"/>
    <rect x="${large ? 272 : 188}" y="${large ? 26 : 20}" width="${large ? 36 : 24}" height="${large ? 5 : 3}" rx="1" fill="#111" stroke="${a}" stroke-width="0.5"/>
    <ellipse cx="${large ? 278 : 194}" cy="${large ? 68 : 48}" rx="${large ? 9 : 6}" ry="${large ? 5 : 3}" fill="#fff" opacity="0.95"/>
    <ellipse cx="${large ? 278 : 194}" cy="${large ? 68 : 48}" rx="${large ? 4 : 3}" ry="${large ? 2 : 1.5}" fill="${h}"/>
  </svg>`;
}

let garageSelectedId = 'yellow';

function renderGarageCarousel() {
  const wrap = document.getElementById('garageCarousel');
  if (!wrap) return;
  wrap.innerHTML = '';
  CAR_CATALOG.forEach(car => {
    const owned = isCarOwned(car.id);
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'garage-car-slot' + (car.id === garageSelectedId ? ' selected' : '') + (owned ? '' : ' locked');
    slot.innerHTML = buildCarSvg(car) +
      `<span class="garage-slot-name">${car.name}</span>` +
      (owned ? '' : '<span class="garage-slot-lock">🔒 LOCKED</span>');
    slot.onclick = () => selectGarageCar(car.id);
    wrap.appendChild(slot);
  });
}

function updateGaragePreview() {
  const car = getCarById(garageSelectedId);
  const preview = document.getElementById('garageCarPreview');
  const nameEl = document.getElementById('garageCarName');
  const buyBtn = document.getElementById('garageBuyBtn');
  const equipBtn = document.getElementById('garageEquipBtn');
  const buyPrice = document.getElementById('garageBuyPrice');
  const buyLabel = document.getElementById('garageBuyLabel');

  if (preview) preview.innerHTML = buildCarSvg(car, true);
  if (nameEl) nameEl.textContent = car.name;

  document.getElementById('statTop').style.width = car.stats.top + '%';
  document.getElementById('statAccel').style.width = car.stats.accel + '%';
  document.getElementById('statHandle').style.width = car.stats.handling + '%';
  document.getElementById('statBrake').style.width = car.stats.brake + '%';

  const owned = isCarOwned(car.id);
  const equipped = profile.garagePlayer === 1
    ? profile.carP1 === car.id
    : profile.carP2 === car.id;

  if (owned) {
    buyBtn.classList.add('hidden');
    equipBtn.classList.remove('hidden');
    equipBtn.textContent = equipped ? 'EQUIPPED ✓' : 'EQUIP';
    equipBtn.disabled = equipped;
  } else {
    buyBtn.classList.remove('hidden');
    equipBtn.classList.add('hidden');
    buyLabel.textContent = 'BUY';
    buyPrice.textContent = '🪙 ' + formatCoins(car.price);
    buyBtn.classList.toggle('disabled', profile.coins < car.price);
  }
}

window.setGaragePlayer = function(num) {
  profile.garagePlayer = num;
  document.getElementById('tabP1').classList.toggle('active', num === 1);
  document.getElementById('tabP2').classList.toggle('active', num === 2);
  garageSelectedId = num === 1 ? profile.carP1 : profile.carP2;
  renderGarageCarousel();
  updateGaragePreview();
};

window.selectGarageCar = function(id) {
  garageSelectedId = id;
  renderGarageCarousel();
  updateGaragePreview();
};

window.buySelectedCar = function() {
  const car = getCarById(garageSelectedId);
  if (isCarOwned(car.id)) return;
  if (profile.coins < car.price) return;
  profile.coins -= car.price;
  profile.ownedCars.push(car.id);
  saveProfile();
  renderGarageCarousel();
  updateGaragePreview();
};

window.equipSelectedCar = function() {
  if (!isCarOwned(garageSelectedId)) return;
  if (profile.garagePlayer === 1) profile.carP1 = garageSelectedId;
  else profile.carP2 = garageSelectedId;
  saveProfile();
  updateGaragePreview();
};

window.showGarage = function() {
  loadProfile();
  profile.garagePlayer = 1;
  garageSelectedId = profile.carP1;
  document.getElementById('tabP1').classList.add('active');
  document.getElementById('tabP2').classList.remove('active');
  showScreen('garageScreen');
  renderGarageCarousel();
  updateGaragePreview();
};

window.closeGarage = function() {
  saveProfile();
  showScreen('menuScreen');
};

window.openTrackSelectFromGarage = function() {
  saveProfile();
  profile.trackReturnScreen = 'garageScreen';
  openTrackSelect('championship');
};

window.openTrackSelect = function(mode) {
  loadProfile();
  loadSettings();
  pendingRaceMode = mode || 'championship';
  profile.raceMode = pendingRaceMode;
  if (!profile.selectedTrackId) profile.selectedTrackId = 'nightcity';
  if (profile.trackReturnScreen !== 'garageScreen') profile.trackReturnScreen = 'menuScreen';

  const titles = { championship: 'CHAMPIONSHIP', challenge: 'CHALLENGE', practice: 'PRACTICE' };
  const titleEl = document.getElementById('trackScreenTitle');
  if (titleEl) titleEl.textContent = titles[pendingRaceMode] || 'SELECT TRACK';

  showScreen('trackScreen');
  renderTrackSelect();
};

window.closeTrackSelect = function() {
  showScreen(profile.trackReturnScreen || 'menuScreen');
};

window.cycleTrack = function(dir) {
  const idx = TRACK_CATALOG.findIndex(t => t.id === profile.selectedTrackId);
  let next = (idx + dir + TRACK_CATALOG.length) % TRACK_CATALOG.length;
  selectTrack(TRACK_CATALOG[next].id);
};

window.launchRace = function() {
  setActiveTrack(profile.selectedTrackId);
  saveProfile();
  startGame();
};

function selectTrack(id) {
  profile.selectedTrackId = id;
  renderTrackSelect();
}

function renderTrackSelect() {
  const track = getTrackById(profile.selectedTrackId);
  const list = document.getElementById('trackList');
  if (list) {
    list.innerHTML = '';
    TRACK_CATALOG.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t.location;
      if (t.id === profile.selectedTrackId) li.classList.add('active');
      li.onclick = () => selectTrack(t.id);
      list.appendChild(li);
    });
  }

  const svg = document.getElementById('trackMapPreview');
  if (svg) {
    svg.innerHTML = buildTrackMapSvg(track.points, track.id);
    svg.classList.add('track-map-animated');
  }

  const laps = getRaceLapsForMode();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('infoRaceNum', '1');
  set('infoLaps', String(laps));
  set('infoType', track.raceType);
  set('infoReward', '🪙 ' + formatCoins(track.reward));
  set('trackCoinDisplay', formatCoins(profile.coins));

  const c1 = getCarById(profile.carP1);
  const c2 = getCarById(profile.carP2);
  const aiN = getAICountForDifficulty();
  set('infoCars', c1.name + ' · ' + c2.name + ' vs ' + aiN + ' AI');
  set('infoAICount', aiN + ' AI');

  const best = profile.bestLaps[track.id];
  set('trackBestLap', best ? formatTime(best) : '--:--');
}

function getRaceLapsForMode() {
  return 3;
}

function getAICountForDifficulty() {
  if (settings.difficulty === 'easy') return 3;
  if (settings.difficulty === 'hard') return 6;
  return 5;
}

function loadLandingStats() {
  let saved = localStorage.getItem('nightCityRacingStats');
  let stats = { gold: 0, silver: 0, bronze: 0, wins: 0 };
  if (saved) {
    try { stats = { ...stats, ...JSON.parse(saved) }; } catch (e) {}
  }
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('medalGold', stats.gold);
  set('medalSilver', stats.silver);
  set('medalBronze', stats.bronze);
  set('statWins', stats.wins);
  loadProfile();
}

function saveRaceResult(rank) {
  let saved = localStorage.getItem('nightCityRacingStats');
  let stats = { gold: 0, silver: 0, bronze: 0, wins: 0 };
  if (saved) {
    try { stats = { ...stats, ...JSON.parse(saved) }; } catch (e) {}
  }
  if (rank === '1st') { stats.gold++; stats.wins++; }
  else if (rank === '2nd') stats.silver++;
  else if (rank === '3rd') stats.bronze++;
  localStorage.setItem('nightCityRacingStats', JSON.stringify(stats));
  loadLandingStats();
}

function loadSettings() {
  let saved = localStorage.getItem('nightCityRacingSettings');
  if (saved) {
    try {
      settings = JSON.parse(saved);
    } catch(e) {}
  }
  
  // Sync checkbox and select elements with HTML
  const sfxEl = document.getElementById('sfxToggle');
  const musicEl = document.getElementById('musicToggle');
  const diffEl = document.getElementById('difficultySelect');
  
  if (sfxEl) sfxEl.checked = settings.sfx;
  if (musicEl) musicEl.checked = settings.music;
  if (diffEl) diffEl.value = settings.difficulty;
  
  // Highlight active color pick in the Settings menu
  document.querySelectorAll('.color-pick').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('data-color') === settings.carColor) {
      el.classList.add('active');
    }
  });
}

function saveSettings() {
  const sfxEl = document.getElementById('sfxToggle');
  const musicEl = document.getElementById('musicToggle');
  const diffEl = document.getElementById('difficultySelect');
  
  if (sfxEl) settings.sfx = sfxEl.checked;
  if (musicEl) settings.music = musicEl.checked;
  if (diffEl) settings.difficulty = diffEl.value;
  
  localStorage.setItem('nightCityRacingSettings', JSON.stringify(settings));
}

// Bind UI actions to window object for HTML inline onclick attributes
window.selectColor = function(element, color) {
  document.querySelectorAll('.color-pick').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  settings.carColor = color;
};

window.showSettings = function() {
  document.getElementById('settingsModal').classList.remove('hidden');
};

window.closeSettings = function() {
  saveSettings();
  document.getElementById('settingsModal').classList.add('hidden');
  if (player) player.color = settings.carColor;
  if (player2) player2.color = 'red';
  
  // Update music playback based on new settings
  if (settings.music) {
    if (!musicInterval) startMusic();
  } else {
    stopMusic();
  }
};

window.showHowTo = function() {
  document.getElementById('howToModal').classList.remove('hidden');
};

window.closeHowTo = function() {
  document.getElementById('howToModal').classList.add('hidden');
};

// --- PROCEDURAL AUDIO ENGINE (Web Audio API) ---
let audioCtx = null;
let engineOsc = null;
let engineOsc2 = null;
let engineGain = null;
let musicInterval = null;

function initAudio() {
  if (audioCtx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioCtx = new AudioContextClass();
}

function startEngineSound() {
  if (!settings.sfx) return;
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  engineOsc = audioCtx.createOscillator();
  engineOsc2 = audioCtx.createOscillator();
  engineGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  engineOsc.type = 'sawtooth';
  engineOsc2.type = 'triangle';
  
  engineOsc.frequency.value = 60;
  engineOsc2.frequency.value = 30;
  
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  
  engineGain.gain.value = 0.04;
  
  engineOsc.connect(filter);
  engineOsc2.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(audioCtx.destination);
  
  engineOsc.start(0);
  engineOsc2.start(0);
}

function updateEngineSound(speedRatio) {
  if (!settings.sfx || !engineOsc || !audioCtx) return;
  const baseFreq = 55 + speedRatio * 140;
  engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.05);
  engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, audioCtx.currentTime, 0.05);
  engineGain.gain.setTargetAtTime(0.03 + speedRatio * 0.05, audioCtx.currentTime, 0.05);
}

function stopEngineSound() {
  if (engineOsc) {
    try { engineOsc.stop(); } catch(e){}
    engineOsc = null;
  }
  if (engineOsc2) {
    try { engineOsc2.stop(); } catch(e){}
    engineOsc2 = null;
  }
  engineGain = null;
}

function playCrashSound() {
  if (!settings.sfx || !audioCtx) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(15, audioCtx.currentTime + 0.25);
  
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(350, audioCtx.currentTime);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(0);
  osc.stop(audioCtx.currentTime + 0.25);
}

function playNitroSound() {
  if (!settings.sfx || !audioCtx) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(250, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.4);
  
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(600, audioCtx.currentTime);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(0);
  osc.stop(audioCtx.currentTime + 0.4);
}

function playPickupSound() {
  if (!settings.sfx || !audioCtx) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, audioCtx.currentTime);
  osc.frequency.setValueAtTime(780, audioCtx.currentTime + 0.08);
  
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(0);
  osc.stop(audioCtx.currentTime + 0.2);
}

function playFanfareSound() {
  if (!settings.sfx || !audioCtx) return;
  initAudio();
  
  const notes = [293.66, 369.99, 440.00, 587.33]; // D major chord arpeggio
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
    gain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + idx * 0.1 + 0.02);
    gain.gain.linearRampToValueAtTime(0.005, audioCtx.currentTime + idx * 0.1 + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(idx * 0.1);
    osc.stop(idx * 0.1 + 0.45);
  });
}

function startMusic() {
  if (!settings.music) return;
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  let step = 0;
  const tempo = 120; // 120 BPM
  const stepDuration = 60 / tempo / 2; // 8th notes
  const notes = [36, 36, 43, 43, 41, 41, 39, 38]; // C, G, F, Eb, D Midi numbers
  
  musicInterval = setInterval(() => {
    if (!settings.music || !audioCtx) return;
    
    // Play bassline
    let midi = notes[Math.floor(step / 2) % notes.length];
    if (step % 2 === 1) {
      midi += 12; // Octave skip
    }
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + stepDuration - 0.01);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(0);
    osc.stop(audioCtx.currentTime + stepDuration);
    
    // Lead pad synth
    if (step % 4 === 0) {
      let leadMidi = notes[Math.floor(step / 2) % notes.length] + 24;
      if (step % 8 === 0) leadMidi += 7; // add fifth
      const leadFreq = 440 * Math.pow(2, (leadMidi - 69) / 12);
      
      const leadOsc = audioCtx.createOscillator();
      const leadGain = audioCtx.createGain();
      leadOsc.type = 'triangle';
      leadOsc.frequency.value = leadFreq;
      leadGain.gain.setValueAtTime(0.012, audioCtx.currentTime);
      leadGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + stepDuration * 2);
      
      leadOsc.connect(leadGain);
      leadGain.connect(audioCtx.destination);
      
      leadOsc.start(0);
      leadOsc.stop(audioCtx.currentTime + stepDuration * 2);
    }
    
    step++;
  }, stepDuration * 1000);
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

// --- TRACK & GEOMETRY ---
const TRACK_CATALOG = [
  {
    id: 'nightcity',
    location: 'NIGHT CITY — USA',
    raceType: 'Circuit',
    laps: 3,
    reward: 3500,
    points: [
      { x: 400, y: 400 }, { x: 1600, y: 400 }, { x: 2400, y: 700 },
      { x: 3400, y: 400 }, { x: 3700, y: 1200 }, { x: 3100, y: 1750 },
      { x: 3400, y: 2300 }, { x: 2000, y: 2450 }, { x: 1300, y: 1900 },
      { x: 650, y: 2300 }, { x: 250, y: 1350 }
    ]
  },
  {
    id: 'melbourne',
    location: 'MELBOURNE — AUSTRALIA',
    raceType: 'Circuit',
    laps: 3,
    reward: 4200,
    points: [
      { x: 500, y: 500 }, { x: 2000, y: 450 }, { x: 3200, y: 600 },
      { x: 3600, y: 1100 }, { x: 3000, y: 1700 }, { x: 3500, y: 2200 },
      { x: 2200, y: 2400 }, { x: 1200, y: 2000 }, { x: 400, y: 2200 },
      { x: 300, y: 1400 }
    ]
  },
  {
    id: 'aintree',
    location: 'AINTREE — UNITED KINGDOM',
    raceType: 'Circuit',
    laps: 3,
    reward: 5000,
    points: [
      { x: 350, y: 800 }, { x: 1800, y: 750 }, { x: 3500, y: 800 },
      { x: 3800, y: 1400 }, { x: 3800, y: 2000 }, { x: 2500, y: 2200 },
      { x: 1200, y: 2100 }, { x: 350, y: 1900 }, { x: 300, y: 1300 }
    ]
  },
  {
    id: 'mexico',
    location: 'MEXICO CITY — MEXICO',
    raceType: 'Circuit',
    laps: 3,
    reward: 4800,
    points: [
      { x: 600, y: 600 }, { x: 1400, y: 400 }, { x: 2200, y: 550 },
      { x: 2800, y: 900 }, { x: 3400, y: 700 }, { x: 3600, y: 1300 },
      { x: 3200, y: 1900 }, { x: 2400, y: 2300 }, { x: 1500, y: 2100 },
      { x: 800, y: 2400 }, { x: 400, y: 1700 }, { x: 500, y: 1100 }
    ]
  },
  {
    id: 'monaco',
    location: 'MONACO — EUROPE',
    raceType: 'Street Circuit',
    laps: 3,
    reward: 6500,
    points: [
      { x: 800, y: 500 }, { x: 1200, y: 450 }, { x: 1600, y: 520 },
      { x: 1900, y: 700 }, { x: 2100, y: 950 }, { x: 2000, y: 1200 },
      { x: 1700, y: 1350 }, { x: 1300, y: 1280 }, { x: 1000, y: 1100 },
      { x: 750, y: 900 }, { x: 700, y: 650 }
    ]
  }
];

let trackPoints = [];
let activeTrackId = 'nightcity';

const ROAD_WIDTH = 320;
const WALL_DISTANCE = ROAD_WIDTH / 2 + 18;
let segments = [];
let totalTrackLength = 0;

function getTrackById(id) {
  return TRACK_CATALOG.find(t => t.id === id) || TRACK_CATALOG[0];
}

function setActiveTrack(id) {
  const track = getTrackById(id);
  activeTrackId = track.id;
  profile.selectedTrackId = id;
  trackPoints = track.points.map(p => ({ x: p.x, y: p.y }));
  raceLapTarget = 3;
  buildTrackData();
}

function buildTrackMapSvg(points, trackId) {
  if (!points.length) return '';
  const themes = {
    nightcity: { road: '#ff6a00', glow: '#00f5ff', fill: 'rgba(255,106,0,0.12)' },
    melbourne: { road: '#39ff14', glow: '#00f5ff', fill: 'rgba(57,255,20,0.1)' },
    aintree: { road: '#ff3355', glow: '#bf00ff', fill: 'rgba(255,51,85,0.1)' },
    mexico: { road: '#ffd700', glow: '#ff6a00', fill: 'rgba(255,215,0,0.1)' },
    monaco: { road: '#00f5ff', glow: '#ff0099', fill: 'rgba(0,245,255,0.1)' }
  };
  const theme = themes[trackId] || themes.nightcity;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  });
  const pad = 24;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = (172 - pad * 2) / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const mapped = points.map(p => ({
    x: 110 + (p.x - cx) * scale,
    y: 110 + (p.y - cy) * scale
  }));
  const pts = mapped.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1));
  const pathD = 'M ' + pts.join(' L ') + ' Z';
  const start = mapped[0];

  let grid = '';
  for (let i = 0; i <= 220; i += 22) {
    grid += `<line x1="${i}" y1="0" x2="${i}" y2="220" stroke="rgba(255,255,255,0.03)"/>`;
    grid += `<line x1="0" y1="${i}" x2="220" y2="${i}" stroke="rgba(255,255,255,0.03)"/>`;
  }

  return `
    <defs>
      <linearGradient id="mapRoadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${theme.road}" stop-opacity="0.2"/>
      </linearGradient>
      <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect class="track-map-bg" x="4" y="4" width="212" height="212" rx="12"/>
    ${grid}
    <circle cx="110" cy="110" r="98" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="6 8"/>
    <path class="track-road-fill" d="${pathD}" fill="url(#mapRoadGrad)"/>
    <path class="track-outline-glow" d="${pathD}" fill="none" stroke="${theme.glow}" stroke-width="14" opacity="0.25" filter="url(#mapGlow)"/>
    <path class="track-outline" d="${pathD}" fill="none" stroke="${theme.road}" stroke-width="4" stroke-linejoin="round"/>
    <path class="track-center-line" d="${pathD}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-dasharray="5 7"/>
    <circle class="track-start" cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="7" fill="${theme.road}" stroke="#fff" stroke-width="2"/>
    <text x="${start.x.toFixed(1)}" y="${(start.y - 12).toFixed(1)}" text-anchor="middle" class="track-start-label">START</text>
  `;
}

function buildTrackData() {
  segments = [];
  totalTrackLength = 0;
  if (!trackPoints.length) setActiveTrack('nightcity');
  for (let i = 0; i < trackPoints.length; i++) {
    let p1 = trackPoints[i];
    let p2 = trackPoints[(i + 1) % trackPoints.length];
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let len = Math.hypot(dx, dy);
    
    segments.push({
      p1: p1,
      p2: p2,
      dx: dx,
      dy: dy,
      length: len,
      cumulative: totalTrackLength
    });
    
    totalTrackLength += len;
  }
}

function getDistanceToSegment(p, a, b) {
  let ab = { x: b.x - a.x, y: b.y - a.y };
  let ap = { x: p.x - a.x, y: p.y - a.y };
  let abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq === 0) return { distance: Math.hypot(ap.x, ap.y), closestPoint: a, t: 0 };
  
  let t = (ap.x * ab.x + ap.y * ab.y) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  
  let closest = { x: a.x + t * ab.x, y: a.y + t * ab.y };
  let dx = p.x - closest.x;
  let dy = p.y - closest.y;
  
  return {
    distance: Math.hypot(dx, dy),
    closestPoint: closest,
    t: t
  };
}

function getTrackProgress(pos) {
  let minDistance = Infinity;
  let bestProgress = 0;
  let closestPoint = { x: 0, y: 0 };
  let activeSegmentIndex = 0;
  
  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i];
    let res = getDistanceToSegment(pos, seg.p1, seg.p2);
    if (res.distance < minDistance) {
      minDistance = res.distance;
      activeSegmentIndex = i;
      bestProgress = seg.cumulative + res.t * seg.length;
      closestPoint = res.closestPoint;
    }
  }
  
  return {
    distance: minDistance,
    progress: bestProgress,
    closestPoint: closestPoint,
    segmentIndex: activeSegmentIndex
  };
}

function getPointAtProgress(prog) {
  prog = (prog % totalTrackLength + totalTrackLength) % totalTrackLength;
  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i];
    let nextCum = seg.cumulative + seg.length;
    if (prog >= seg.cumulative && prog <= nextCum) {
      let t = (prog - seg.cumulative) / seg.length;
      return {
        x: seg.p1.x + t * seg.dx,
        y: seg.p1.y + t * seg.dy
      };
    }
  }
  return { x: trackPoints[0].x, y: trackPoints[0].y };
}

// --- LAP COUNTING & PROGRESS GATES ---
function updateCarLap(car) {
  let trackData = getTrackProgress(car);
  let progRatio = trackData.progress / totalTrackLength;
  
  car.progress = trackData.progress;
  car.distToCenter = trackData.distance;
  
  if (progRatio > 0.22 && progRatio < 0.38 && car.checkpoint === 0) {
    car.checkpoint = 1;
  } else if (progRatio > 0.45 && progRatio < 0.60 && car.checkpoint === 1) {
    car.checkpoint = 2;
  } else if (progRatio > 0.70 && progRatio < 0.85 && car.checkpoint === 2) {
    car.checkpoint = 3;
  } else if (progRatio > 0.90 && car.checkpoint === 3) {
    car.checkpoint = 4;
  } else if (progRatio < 0.10 && car.checkpoint === 4) {
    car.lap++;
    car.checkpoint = 0;
    if (car.isPlayer || car.isPlayer2) {
      playPickupSound();
      onLapComplete(car);
    }
  }
}

// --- CUSTOM DECORATIVE BUILDINGS ---
const buildings = [
  { x: 1050, y: 950, w: 280, h: 340, color: 'rgba(0, 245, 255, 0.09)', glow: 'rgba(0, 245, 255, 0.38)' },
  { x: 1900, y: 1200, w: 330, h: 400, color: 'rgba(255, 0, 153, 0.09)', glow: 'rgba(255, 0, 153, 0.38)' },
  { x: 2700, y: 1050, w: 250, h: 300, color: 'rgba(191, 0, 255, 0.09)', glow: 'rgba(191, 0, 255, 0.38)' },
  { x: 650, y: 1600, w: 300, h: 370, color: 'rgba(0, 245, 255, 0.09)', glow: 'rgba(0, 245, 255, 0.38)' },
  { x: 1350, y: 1500, w: 200, h: 270, color: 'rgba(255, 106, 0, 0.09)', glow: 'rgba(255, 106, 0, 0.38)' },
  { x: 2150, y: 250, w: 400, h: 460, color: 'rgba(57, 255, 20, 0.08)', glow: 'rgba(57, 255, 20, 0.32)' }
];

function setup3DCanvas() {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function drawSky() {
  const rv = renderView;
  const sky = ctx.createLinearGradient(0, rv.offsetY, 0, rv.offsetY + rv.height * 0.65);
  sky.addColorStop(0, '#8ed4ff');
  sky.addColorStop(0.35, '#5a9fd4');
  sky.addColorStop(0.7, '#3d6a8a');
  sky.addColorStop(1, 'rgba(25, 45, 65, 0.3)');
  ctx.fillStyle = sky;
  ctx.fillRect(rv.offsetX, rv.offsetY, rv.width, rv.height);

  const sunX = rv.offsetX + rv.width * 0.75;
  const sunY = rv.offsetY + rv.height * 0.12;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  sun.addColorStop(0, 'rgba(255, 240, 200, 0.35)');
  sun.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(rv.offsetX, rv.offsetY, rv.width, rv.height);
}

function drawGroundPlane() {
  const rv = renderView;
  const ground = ctx.createLinearGradient(0, rv.offsetY + rv.height * 0.25, 0, rv.offsetY + rv.height);
  ground.addColorStop(0, 'rgba(40, 65, 48, 0)');
  ground.addColorStop(0.5, 'rgba(28, 48, 36, 0.6)');
  ground.addColorStop(1, 'rgba(18, 32, 26, 0.95)');
  ctx.fillStyle = ground;
  ctx.fillRect(rv.offsetX, rv.offsetY, rv.width, rv.height);
}

function drawBuildings(ctx) {
  ctx.save();
  ctx.translate(-renderView.camera.x + renderView.offsetX, -renderView.camera.y + renderView.offsetY);
  const depth = 22;
  buildings.forEach(b => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(b.x + depth, b.y + depth * 0.3, b.w, b.h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.moveTo(b.x + b.w, b.y);
    ctx.lineTo(b.x + b.w + depth, b.y + depth * 0.3);
    ctx.lineTo(b.x + b.w + depth, b.y + b.h + depth * 0.3);
    ctx.lineTo(b.x + b.w, b.y + b.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + b.w, b.y);
    ctx.lineTo(b.x + b.w + depth, b.y + depth * 0.3);
    ctx.lineTo(b.x + depth, b.y + depth * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = b.color;
    ctx.strokeStyle = b.glow;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = b.glow;
    ctx.shadowBlur = 8;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = b.glow;
    const winCols = 4;
    const winRows = 6;
    const winW = b.w / (winCols * 2);
    const winH = b.h / (winRows * 2);
    for (let r = 0; r < winRows; r++) {
      for (let c = 0; c < winCols; c++) {
        if ((r + c + Math.floor(b.x)) % 3 === 0) {
          ctx.fillRect(b.x + winW * (c * 2 + 0.5), b.y + winH * (r * 2 + 0.5), winW, winH);
        }
      }
    }
  });
  ctx.restore();
}

// --- NITRO PICKUPS ---
let pickups = [];

function initPickups() {
  const pickupProgresses = [0.12, 0.28, 0.44, 0.60, 0.74, 0.89];
  pickups = pickupProgresses.map(p => {
    let pt = getPointAtProgress(p * totalTrackLength);
    return {
      x: pt.x,
      y: pt.y,
      active: true,
      cooldown: 0
    };
  });
}

function updatePickups() {
  pickups.forEach(p => {
    if (!p.active) {
      p.cooldown--;
      if (p.cooldown <= 0) {
        p.active = true;
      }
    } else {
      for (const racer of [player, player2]) {
        if (!racer) continue;
        if (Math.hypot(racer.x - p.x, racer.y - p.y) < 50) {
          p.active = false;
          p.cooldown = 400;
          racer.nitro = Math.min(100, racer.nitro + 35);
          playPickupSound();
          triggerNitroCollectGlow(p.x, p.y);
          break;
        }
      }
    }
  });
}

// --- PARTICLE SYSTEM ---
let particles = [];
let tireMarks = [];

function triggerSparks(x, y, dx, dy) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (dx + (Math.random() - 0.5) * 0.8) * (3 + Math.random() * 5),
      vy: (dy + (Math.random() - 0.5) * 0.8) * (3 + Math.random() * 5),
      life: 1.0,
      decay: 0.03 + Math.random() * 0.03,
      color: Math.random() > 0.5 ? '#ff6a00' : '#00f5ff',
      size: 2.5 + Math.random() * 2.5,
      type: 'spark'
    });
  }
}

function triggerNitroCollectGlow(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.02,
      color: '#ff6a00',
      size: 4 + Math.random() * 4,
      type: 'glowing-ring'
    });
  }
}

function emitNitroFlame(x, y, angle) {
  let backAngle = angle + Math.PI;
  particles.push({
    x: x - Math.cos(angle) * 32,
    y: y - Math.sin(angle) * 32,
    vx: Math.cos(backAngle) * (5 + Math.random() * 5) + (Math.random() - 0.5) * 2,
    vy: Math.sin(backAngle) * (5 + Math.random() * 5) + (Math.random() - 0.5) * 2,
    life: 1.0,
    decay: 0.06 + Math.random() * 0.06,
    color: Math.random() > 0.4 ? '#ff6a00' : '#ff0099',
    size: 10 + Math.random() * 7,
    type: 'flame'
  });
}

function emitExhaustSmoke(x, y, angle) {
  let backAngle = angle + Math.PI;
  particles.push({
    x: x - Math.cos(angle) * 29,
    y: y - Math.sin(angle) * 29,
    vx: Math.cos(backAngle) * 1.5 + (Math.random() - 0.5) * 0.5,
    vy: Math.sin(backAngle) * 1.5 + (Math.random() - 0.5) * 0.5,
    life: 0.8,
    decay: 0.03,
    color: 'rgba(100, 100, 120, 0.15)',
    size: 7 + Math.random() * 8,
    type: 'smoke'
  });
}

function addTireMark(car) {
  let cos = Math.cos(car.angle);
  let sin = Math.sin(car.angle);
  
  let lrX = car.x - cos * 18 - sin * 11;
  let lrY = car.y - sin * 18 + cos * 11;
  let rrX = car.x - cos * 18 + sin * 11;
  let rrY = car.y - sin * 18 - cos * 11;
  
  tireMarks.push({ x: lrX, y: lrY, life: 250 });
  tireMarks.push({ x: rrX, y: rrY, life: 250 });
  
  if (tireMarks.length > 1000) {
    tireMarks.shift();
    tireMarks.shift();
  }
}

function updateParticles() {
  for (let i = tireMarks.length - 1; i >= 0; i--) {
    tireMarks[i].life--;
    if (tireMarks[i].life <= 0) {
      tireMarks.splice(i, 1);
    }
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// --- DRIVING PHYSICS VALUES ---
const maxSpeed = 12.0;
const accel = 0.15;
const drag = 0.985;
const steerSpeed = 0.045;
const driftFactor = 0.93; // slide physics ratio

// --- PHYSICS & AI LOOPS ---
function updateAICars() {
  aiCars.forEach((ai) => {
    let trackData = getTrackProgress(ai);
    ai.progress = trackData.progress;
    ai.distToCenter = trackData.distance;
    updateCarLap(ai);
    
    // AI navigation lookahead
    let lookAheadProgress = (ai.progress + ai.lookAheadDistance) % totalTrackLength;
    let targetPoint = getPointAtProgress(lookAheadProgress);
    
    // Apply lane offset for AI cars spacing
    let targetSegInfo = getTrackProgress(targetPoint);
    let seg = segments[targetSegInfo.segmentIndex];
    let dx = seg.dx / seg.length;
    let dy = seg.dy / seg.length;
    let nx = -dy;
    let ny = dx;
    targetPoint.x += nx * ai.laneOffset;
    targetPoint.y += ny * ai.laneOffset;
    
    let targetAngle = Math.atan2(targetPoint.y - ai.y, targetPoint.x - ai.x);
    let angleDiff = targetAngle - ai.angle;
    
    // Normalize to -PI to PI
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    
    ai.angle += angleDiff * ai.steerSpeed;
    
    // AI speeds customized by difficulty settings
    let isOffRoad = ai.distToCenter > ROAD_WIDTH / 2;
    let currentMaxSpeed = ai.maxSpeed;
    if (isOffRoad) currentMaxSpeed = 4.0;
    
    let diffModifier = 1.0;
    if (settings.difficulty === 'easy') diffModifier = 0.75;
    else if (settings.difficulty === 'hard') diffModifier = 1.15;
    
    let targetSpeed = currentMaxSpeed * diffModifier;
    
    if (ai.speed < targetSpeed) {
      ai.speed += ai.accel;
    } else {
      ai.speed -= ai.decel;
    }
    
    ai.vx = Math.cos(ai.angle) * ai.speed;
    ai.vy = Math.sin(ai.angle) * ai.speed;
    
    ai.x += ai.vx;
    ai.y += ai.vy;
    
    // Check wall bounds for AI
    if (ai.distToCenter > WALL_DISTANCE) {
      let dx = ai.x - trackData.closestPoint.x;
      let dy = ai.y - trackData.closestPoint.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 0) {
        let nx = dx / dist;
        let ny = dy / dist;
        ai.x = trackData.closestPoint.x + nx * WALL_DISTANCE;
        ai.y = trackData.closestPoint.y + ny * WALL_DISTANCE;
        ai.speed *= 0.5;
      }
    }
  });
}

function checkCarCollisions() {
  let allCars = [player, player2, ...aiCars].filter(Boolean);
  let r = 27; // collision box radius
  let minDist = 54;
  
  for (let i = 0; i < allCars.length; i++) {
    for (let j = i + 1; j < allCars.length; j++) {
      let c1 = allCars[i];
      let c2 = allCars[j];
      
      let dx = c2.x - c1.x;
      let dy = c2.y - c1.y;
      let dist = Math.hypot(dx, dy);
      
      if (dist < minDist) {
        let overlap = minDist - dist;
        let nx = dx / dist;
        let ny = dy / dist;
        
        // Push apart
        c1.x -= nx * overlap * 0.5;
        c1.y -= ny * overlap * 0.5;
        c2.x += nx * overlap * 0.5;
        c2.y += ny * overlap * 0.5;
        
        // Elastic collision response
        let kx = c1.vx - c2.vx;
        let ky = c1.vy - c2.vy;
        let p = 2 * (nx * kx + ny * ky) / 2;
        
        c1.vx -= nx * p;
        c1.vy -= ny * p;
        c2.vx += nx * p;
        c2.vy += ny * p;
        
        c1.speed = Math.hypot(c1.vx, c1.vy) * (c1.speed < 0 ? -1 : 1);
        c2.speed = Math.hypot(c2.vx, c2.vy) * (c2.speed < 0 ? -1 : 1);
        
        triggerSparks((c1.x + c2.x)/2, (c1.y + c2.y)/2, nx, ny);
        playCrashSound();
      }
    }
  }
}

// --- HUD RENDERING & RANKING ---
function getRankLabel(targetCar) {
  let racers = [player, player2, ...aiCars].filter(Boolean);
  racers.forEach(c => { c._tp = c.lap * totalTrackLength + c.progress; });
  racers.sort((a, b) => b._tp - a._tp);
  let idx = racers.indexOf(targetCar) + 1;
  return idx + '/' + racers.length;
}

function getRankOrdinal(targetCar) {
  let racers = [player, player2, ...aiCars].filter(Boolean);
  racers.forEach(c => { c._tp = c.lap * totalTrackLength + c.progress; });
  racers.sort((a, b) => b._tp - a._tp);
  let idx = racers.indexOf(targetCar) + 1;
  if (idx === 1) return '1st';
  if (idx === 2) return '2nd';
  if (idx === 3) return '3rd';
  return idx + 'th';
}

function formatTime(ms) {
  if (ms === Infinity || ms < 0) return '--:--';
  let totalSecs = Math.floor(ms / 1000);
  let mins = Math.floor(totalSecs / 60);
  let secs = totalSecs % 60;
  let millis = Math.floor(ms % 1000);
  return (
    String(mins).padStart(2, '0') + ':' +
    String(secs).padStart(2, '0') + '.' +
    String(millis).padStart(3, '0')
  );
}

function initSpeedometers() {
  ['P1', 'P2'].forEach(suffix => {
    const arc = document.getElementById('speedoArc' + suffix);
    const nitro = document.getElementById('speedoNitro' + suffix);
    if (arc) {
      arc.style.strokeDasharray = SPEEDO_ARC_LEN + ' ' + SPEEDO_ARC_LEN;
      arc.style.strokeDashoffset = SPEEDO_ARC_LEN;
    }
    if (nitro) {
      nitro.style.strokeDasharray = SPEEDO_NITRO_ARC + ' ' + SPEEDO_NITRO_ARC;
      nitro.style.strokeDashoffset = SPEEDO_NITRO_ARC;
    }
  });
}

function updatePlayerSpeedHud(car, suffix) {
  let kmh = Math.round(Math.abs(car.speed) * 20);
  const speedRatio = Math.min(1, Math.abs(car.speed) / maxSpeed);
  const gear = Math.max(1, Math.min(6, Math.floor(speedRatio * 5) + 1));
  const rpm = Math.round(800 + speedRatio * 7200);

  const speedEl = document.getElementById('speedDisplay' + suffix);
  const gearEl = document.getElementById('gear' + suffix);
  const rpmEl = document.getElementById('rpm' + suffix);
  const arcEl = document.getElementById('speedoArc' + suffix);
  const nitroArc = document.getElementById('speedoNitro' + suffix);
  const wrap = document.getElementById('speedHud' + suffix);

  if (speedEl) speedEl.textContent = kmh;
  if (gearEl) gearEl.textContent = gear;
  if (rpmEl) rpmEl.textContent = rpm + ' RPM';
  if (arcEl) arcEl.style.strokeDashoffset = String(SPEEDO_ARC_LEN * (1 - speedRatio));
  if (nitroArc) nitroArc.style.strokeDashoffset = String(SPEEDO_NITRO_ARC * (1 - car.nitro / 100));
  if (wrap) wrap.classList.toggle('speed-high', speedRatio > 0.75);

  if (kmh > car.topSpeedKmh) car.topSpeedKmh = kmh;
}

function updateHUD() {
  if (!player || !player2) return;

  updatePlayerSpeedHud(player, 'P1');
  updatePlayerSpeedHud(player2, 'P2');

  const lapTxt = (lap) => Math.min(raceLapTarget, lap) + '/' + raceLapTarget;
  document.getElementById('lapDisplayP1').textContent = lapTxt(player.lap);
  document.getElementById('lapDisplayP2').textContent = lapTxt(player2.lap);
  document.getElementById('posDisplayP1').textContent = getRankLabel(player);
  document.getElementById('posDisplayP2').textContent = getRankLabel(player2);

  if (countdownTime > 0) {
    document.getElementById('lapTimer').textContent = '00:00.000';
  } else {
    document.getElementById('lapTimer').textContent = formatTime(Date.now() - currentLapStartTime);
  }
}

function onLapComplete(car) {
  let now = Date.now();
  let lapTime = now - currentLapStartTime;
  currentLapStartTime = now;

  if (lapTime < bestLapTime) {
    bestLapTime = lapTime;
    document.getElementById('bestLap').textContent = 'Best: ' + formatTime(bestLapTime);
  }
  const tid = activeTrackId || profile.selectedTrackId;
  if (!profile.bestLaps[tid] || lapTime < profile.bestLaps[tid]) {
    profile.bestLaps[tid] = lapTime;
    saveProfile();
  }

  if (car.lap > raceLapTarget && !isFinished) {
    if (car.isPlayer) endRace('p1');
    else if (car.isPlayer2) endRace('p2');
    else endRace('ai');
  }
}

function getCarPhysics(car) {
  const s = car.carStats || getCarById(car.carId).stats;
  return {
    maxSpd: maxSpeed * (0.88 + s.top / 220),
    accelMod: accel * (0.88 + s.accel / 220),
    steerMod: steerSpeed * (0.92 + s.handling / 280)
  };
}

function updateHumanCar(car, inputKeys) {
  const phys = getCarPhysics(car);
  let isOffRoad = car.distToCenter > ROAD_WIDTH / 2;
  let currentMaxSpeed = phys.maxSpd;
  let currentAccel = phys.accelMod;
  const carSteer = phys.steerMod;

  if (isOffRoad) {
    currentMaxSpeed = 3.8;
    currentAccel = 0.04;
  }

  if (inputKeys.nitro && car.nitro > 0 && inputKeys.up) {
    currentMaxSpeed *= 1.45;
    currentAccel *= 2.2;
    car.nitro -= 0.65;
    totalNitroVolumeUsed += 0.65;
    if (car.nitro < 0) car.nitro = 0;
    car.isBoosting = true;
    emitNitroFlame(car.x, car.y, car.angle);
    if (Math.random() > 0.65) playNitroSound();
  } else {
    car.isBoosting = false;
  }

  if (inputKeys.left) {
    car.angle -= carSteer * (Math.abs(car.speed) / maxSpeed + 0.15);
    if (car.speed > 2.0 && !isOffRoad) addTireMark(car);
  }
  if (inputKeys.right) {
    car.angle += carSteer * (Math.abs(car.speed) / maxSpeed + 0.15);
    if (car.speed > 2.0 && !isOffRoad) addTireMark(car);
  }

  if (inputKeys.up) {
    car.speed += currentAccel;
    if (car.speed > currentMaxSpeed) car.speed = currentMaxSpeed;
    if (Math.random() > 0.8) emitExhaustSmoke(car.x, car.y, car.angle);
  } else if (inputKeys.down) {
    car.speed -= currentAccel;
    if (car.speed < -currentMaxSpeed * 0.4) car.speed = -currentMaxSpeed * 0.4;
    if (car.speed > 1.5) addTireMark(car);
  } else {
    car.speed *= drag;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }

  let targetVx = Math.cos(car.angle) * car.speed;
  let targetVy = Math.sin(car.angle) * car.speed;
  car.vx += (targetVx - car.vx) * (1 - driftFactor);
  car.vy += (targetVy - car.vy) * (1 - driftFactor);
  car.x += car.vx;
  car.y += car.vy;

  let trackData = getTrackProgress(car);
  car.progress = trackData.progress;
  car.distToCenter = trackData.distance;

  if (car.distToCenter > WALL_DISTANCE) {
    let dx = car.x - trackData.closestPoint.x;
    let dy = car.y - trackData.closestPoint.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      let nx = dx / dist;
      let ny = dy / dist;
      car.x = trackData.closestPoint.x + nx * WALL_DISTANCE;
      car.y = trackData.closestPoint.y + ny * WALL_DISTANCE;
      let dot = car.vx * nx + car.vy * ny;
      car.vx = (car.vx - 2 * dot * nx) * 0.3;
      car.vy = (car.vy - 2 * dot * ny) * 0.3;
      car.speed *= -0.35;
      triggerSparks(car.x, car.y, -nx, -ny);
      playCrashSound();
    }
  }

  updateCarLap(car);
}

// --- GAME RESIZING & CAMERA ---
function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// --- CANVAS GRAPHICS RENDERING ---
function drawGrid() {
  const gridWidth = 80;
  const rv = renderView;
  let startX = Math.floor(rv.camera.x / gridWidth) * gridWidth;
  let startY = Math.floor(rv.camera.y / gridWidth) * gridWidth;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX; x < startX + rv.width + gridWidth; x += gridWidth) {
    ctx.moveTo(x - rv.camera.x + rv.offsetX, rv.offsetY);
    ctx.lineTo(x - rv.camera.x + rv.offsetX, rv.offsetY + rv.height);
  }
  for (let y = startY; y < startY + rv.height + gridWidth; y += gridWidth) {
    ctx.moveTo(rv.offsetX, y - rv.camera.y + rv.offsetY);
    ctx.lineTo(rv.offsetX + rv.width, y - rv.camera.y + rv.offsetY);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTireMarks() {
  ctx.save();
  ctx.translate(-renderView.camera.x + renderView.offsetX, -renderView.camera.y + renderView.offsetY);
  ctx.fillStyle = '#010207';
  ctx.globalAlpha = 0.35;
  tireMarks.forEach(m => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawRoad() {
  ctx.save();
  ctx.translate(-renderView.camera.x + renderView.offsetX, -renderView.camera.y + renderView.offsetY);

  ctx.beginPath();
  ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
  for (let i = 1; i < trackPoints.length; i++) {
    ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
  }
  ctx.closePath();
  ctx.lineWidth = ROAD_WIDTH + 14;
  ctx.strokeStyle = 'rgba(200, 210, 220, 0.35)';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.25)';
  ctx.shadowBlur = 14;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.lineWidth = ROAD_WIDTH + 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.stroke();

  ctx.lineWidth = ROAD_WIDTH;
  const roadGrad = ctx.createLinearGradient(0, 0, 0, ROAD_WIDTH);
  roadGrad.addColorStop(0, '#4a5568');
  roadGrad.addColorStop(0.5, '#353f4d');
  roadGrad.addColorStop(1, '#2a323c');
  ctx.strokeStyle = roadGrad;
  ctx.stroke();

  ctx.lineWidth = ROAD_WIDTH + 8;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(180, 40, 40, 0.85)';
  ctx.setLineDash([]);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 220, 0, 0.75)';
  ctx.setLineDash([22, 22]);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw Start/Finish grid
  let startNode = trackPoints[0];
  let nextNode = trackPoints[1];
  let angle = Math.atan2(nextNode.y - startNode.y, nextNode.x - startNode.x);
  
  ctx.save();
  ctx.translate(startNode.x, startNode.y);
  ctx.rotate(angle + Math.PI/2);
  
  let w = ROAD_WIDTH;
  let h = 18;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w/2, -h/2, w, h);
  ctx.fillStyle = '#000000';
  let boxSize = 9;
  for (let x = -w/2; x < w/2; x += boxSize * 2) {
    ctx.fillRect(x, -h/2, boxSize, boxSize);
    ctx.fillRect(x + boxSize, 0, boxSize, boxSize);
  }
  ctx.restore();
  ctx.restore();
}

function drawPickups() {
  let time = Date.now() * 0.005;
  ctx.save();
  ctx.translate(-renderView.camera.x + renderView.offsetX, -renderView.camera.y + renderView.offsetY);

  pickups.forEach(p => {
    if (!p.active) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(time);

    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ff6a00';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      let angle = (i * Math.PI) / 2;
      let rx = Math.cos(angle) * 14;
      let ry = Math.sin(angle) * 14;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(-5, 1);
    ctx.lineTo(-1, 1);
    ctx.lineTo(-2, 8);
    ctx.lineTo(5, -1);
    ctx.lineTo(1, -1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
}

function drawCar(car) {
  const paint = getCarById(car.carId || car.color);
  const primary = paint.primary;
  const accent = paint.accent;
  const highlight = paint.highlight;

  const sx = car.x - renderView.camera.x + renderView.offsetX;
  const sy = car.y - renderView.camera.y + renderView.offsetY;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 36, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);

  function drawWheel(wx, wy) {
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(wx, wy, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#252525';
    ctx.beginPath();
    ctx.ellipse(wx, wy, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(wx - 2, wy - 8, 4, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(wx - 2, wy - 3, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawWheel(-26, -17);
  drawWheel(-26, 17);
  drawWheel(22, -17);
  drawWheel(22, 17);

  const bodyGrad = ctx.createLinearGradient(-30, -20, 40, 20);
  bodyGrad.addColorStop(0, highlight);
  bodyGrad.addColorStop(0.45, primary);
  bodyGrad.addColorStop(1, accent);

  ctx.shadowColor = highlight;
  ctx.shadowBlur = 18;
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(28, -12);
  ctx.lineTo(10, -16);
  ctx.lineTo(-6, -18);
  ctx.lineTo(-22, -17);
  ctx.lineTo(-34, -12);
  ctx.lineTo(-38, -4);
  ctx.lineTo(-40, 0);
  ctx.lineTo(-38, 4);
  ctx.lineTo(-34, 12);
  ctx.lineTo(-22, 17);
  ctx.lineTo(-6, 18);
  ctx.lineTo(10, 16);
  ctx.lineTo(28, 12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(32, -6);
  ctx.lineTo(32, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(-8, 3);
  ctx.lineTo(24, 3);
  ctx.lineTo(20, 14);
  ctx.lineTo(-18, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.moveTo(2, -14);
  ctx.lineTo(22, -12);
  ctx.lineTo(28, -6);
  ctx.lineTo(22, -8);
  ctx.lineTo(4, -10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(30,45,70,0.9)';
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.lineTo(14, -8);
  ctx.lineTo(20, 0);
  ctx.lineTo(14, 8);
  ctx.lineTo(-2, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(200, 230, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(16, -4);
  ctx.lineTo(18, 0);
  ctx.lineTo(16, 4);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-4, -14, 18, 2.5);
  ctx.fillRect(-4, 11.5, 18, 2.5);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#111';
  ctx.fillRect(-38, -20, 6, 40);
  ctx.fillStyle = primary;
  ctx.fillRect(-38, -22, 6, 5);
  ctx.fillRect(-38, 17, 6, 5);

  ctx.fillStyle = '#fff';
  ctx.shadowColor = highlight;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(36, -6, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(36, 6, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  let braking = car.speed < 0 || (car.isPlayer && window.keys.down) || (car.isPlayer2 && window.keys2.down);
  ctx.fillStyle = braking ? '#ff0022' : 'rgba(255,0,60,0.7)';
  if (braking) { ctx.shadowColor = 'red'; ctx.shadowBlur = 14; }
  ctx.fillRect(-36, -10, 3, 5);
  ctx.fillRect(-36, 5, 3, 5);
  ctx.shadowBlur = 0;

  if (car.isBoosting) {
    ctx.shadowBlur = 22;
    ctx.shadowColor = highlight;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(-38, -5);
    ctx.lineTo(-62 - Math.random() * 20, 0);
    ctx.lineTo(-38, 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (car.isPlayer) {
    ctx.fillStyle = 'rgba(0, 245, 255, 0.9)';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (car.isPlayer2) {
    ctx.fillStyle = 'rgba(255, 106, 0, 0.95)';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.translate(
      p.x - renderView.camera.x + renderView.offsetX,
      p.y - renderView.camera.y + renderView.offsetY
    );
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    if (p.type === 'spark') {
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-p.vx * 1.3, -p.vy * 1.3);
      ctx.stroke();
    } else if (p.type === 'smoke') {
      ctx.globalAlpha = p.life * 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (2 - p.life), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'flame') {
      ctx.globalAlpha = p.life;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'glowing-ring') {
      ctx.globalAlpha = p.life;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (2 - p.life), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawCountdownInView() {
  if (countdownTime <= 0) return;

  const rv = renderView;
  ctx.save();
  ctx.font = '900 ' + Math.min(90, rv.width * 0.22) + 'px Orbitron';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let val = Math.ceil(countdownTime - 0.5);
  let text = val.toString();
  let color = '#ff6a00';
  if (countdownTime <= 0.5) {
    text = 'GO!';
    color = '#39ff14';
  }

  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;

  const cx = rv.offsetX + rv.width / 2;
  const cy = rv.offsetY + rv.height / 2;
  ctx.fillText(text, cx, cy);
  ctx.strokeText(text, cx, cy);
  ctx.restore();
}

function renderSplitViewport(cam, ox, oy, w, h) {
  renderView = { camera: cam, offsetX: ox, offsetY: oy, width: w, height: h };
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, w, h);
  ctx.clip();

  drawSky();
  drawGroundPlane();

  drawGrid();
  drawBuildings(ctx);
  drawTireMarks();
  drawRoad();
  drawPickups();

  let allCars = [...aiCars, player, player2].filter(Boolean);
  allCars.forEach(car => drawCar(car));
  drawParticles();
  drawCountdownInView();

  ctx.restore();
}

function renderGame() {
  const halfW = Math.floor(canvas.width / 2);
  const h = canvas.height;

  ctx.fillStyle = '#5a9fd4';
  ctx.fillRect(0, 0, canvas.width, h);

  if (player && player2) {
    renderSplitViewport(camera, 0, 0, halfW, h);
    renderSplitViewport(camera2, halfW, 0, halfW, h);
  }
}

// --- STATE SCREEN UTILITIES ---
function showScreen(screenId) {
  const screens = ['menuScreen', 'garageScreen', 'trackScreen', 'gameScreen', 'pauseScreen', 'finishScreen'];
  screens.forEach(id => {
    let el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      el.classList.remove('hidden');
      el.classList.add('active');
    } else {
      if (screenId === 'pauseScreen' && id === 'gameScreen') {
        return; // Overlay pause above the game screen
      }
      el.classList.remove('active');
      el.classList.add('hidden');
    }
  });
}

// --- MAIN ENGINE CONTROLS ---
function createRacer(x, y, angle, carId, isP1, isP2) {
  const car = getCarById(carId);
  return {
    x, y, vx: 0, vy: 0, speed: 0, angle,
    nitro: 100, lap: 1, checkpoint: 0, progress: 0, distToCenter: 0,
    topSpeedKmh: 0, isBoosting: false,
    isPlayer: isP1, isPlayer2: isP2, isAI: false,
    carId: car.id, color: car.id,
    carStats: { ...car.stats }
  };
}

function createAIRacer(x, y, angle, carId, laneOffset, skill) {
  const car = getCarById(carId);
  const s = car.stats;
  return {
    x, y, vx: 0, vy: 0, speed: 0, angle,
    nitro: 100, lap: 1, checkpoint: 0, progress: 0, distToCenter: 0,
    topSpeedKmh: 0, isBoosting: false,
    isPlayer: false, isPlayer2: false, isAI: true,
    carId: car.id, color: car.id,
    carStats: { ...s },
    lookAheadDistance: 100 + Math.random() * 50,
    laneOffset,
    maxSpeed: maxSpeed * (0.86 + s.top / 240) * skill,
    accel: 0.11 + s.accel / 700,
    decel: 0.09,
    steerSpeed: 0.05 + s.handling / 1800
  };
}

function spawnAICars() {
  const pool = CAR_CATALOG.map(c => c.id).filter(
    id => id !== profile.carP1 && id !== profile.carP2
  );
  const count = getAICountForDifficulty();
  const picks = [];
  for (let i = 0; i < count; i++) {
    picks.push(pool[i % pool.length]);
  }

  const startNode = trackPoints[0];
  const nextNode = trackPoints[1];
  const dirAngle = Math.atan2(nextNode.y - startNode.y, nextNode.x - startNode.x);
  const nx = -Math.sin(dirAngle);
  const ny = Math.cos(dirAngle);
  const tx = Math.cos(dirAngle);
  const ty = Math.sin(dirAngle);
  const lanes = [-110, -75, -40, 40, 75, 110, 145, -145];

  aiCars = picks.map((carId, i) => {
    const row = Math.floor(i / 2) + 2;
    const lane = lanes[i % lanes.length];
    const skill = 0.9 + (i % 4) * 0.03;
    const x = startNode.x + nx * lane - tx * row * 42;
    const y = startNode.y + ny * lane - ty * row * 42;
    return createAIRacer(x, y, dirAngle, carId, lane * 0.35, skill);
  });
}

window.startGame = function() {
  initAudio();
  showScreen('gameScreen');
  loadSettings();
  loadProfile();
  setActiveTrack(profile.selectedTrackId || 'nightcity');
  initSpeedometers();

  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  setup3DCanvas();
  resizeCanvas();

  raceWinner = null;
  let startNode = trackPoints[0];
  let nextNode = trackPoints[1];
  let dirAngle = Math.atan2(nextNode.y - startNode.y, nextNode.x - startNode.x);
  let nx = -Math.sin(dirAngle);
  let ny = Math.cos(dirAngle);
  let tx = Math.cos(dirAngle);
  let ty = Math.sin(dirAngle);

  player = createRacer(
    startNode.x + nx * 35 - tx * 25,
    startNode.y + ny * 35 - ty * 25,
    dirAngle, profile.carP1, true, false
  );

  player2 = createRacer(
    startNode.x - nx * 35 - tx * 25,
    startNode.y - ny * 35 - ty * 25,
    dirAngle, profile.carP2, false, true
  );

  camera = { x: player.x, y: player.y };
  camera2 = { x: player2.x, y: player.y };
  spawnAICars();
  
  initPickups();
  particles = [];
  tireMarks = [];
  countdownTime = 3.5;
  totalNitroVolumeUsed = 0;
  bestLapTime = Infinity;
  document.getElementById('bestLap').innerText = 'Best: --:--';
  
  if (settings.sfx) startEngineSound();
  if (settings.music) {
    stopMusic();
    startMusic();
  }
  
  isGameRunning = true;
  isPaused = false;
  isFinished = false;
  
  if (animationId) cancelAnimationFrame(animationId);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
};

function updateGame(dt) {
  if (countdownTime > 0) {
    countdownTime -= dt;
    if (countdownTime <= 0.5 && countdownTime + dt > 0.5) {
      raceStartTime = Date.now();
      currentLapStartTime = raceStartTime;
    }
    updateEngineSound(0.0);
    updateParticles();
    return;
  }
  
  updateHumanCar(player, window.keys);
  updateHumanCar(player2, window.keys2);

  let maxSpdRatio = Math.max(
    Math.abs(player.speed) / maxSpeed,
    Math.abs(player2.speed) / maxSpeed
  );
  updateEngineSound(maxSpdRatio);

  updateAICars();
  checkCarCollisions();
  updatePickups();
  updateParticles();
  updateHUD();
}

function gameLoop(time) {
  if (!isGameRunning) return;
  animationId = requestAnimationFrame(gameLoop);
  
  let dt = (time - lastTime) / 1000;
  if (!dt || dt > 0.1) dt = 0.016;
  lastTime = time;
  
  if (!isPaused) {
    updateGame(dt);
  }
  
  const halfW = canvas.width / 2;
  const h = canvas.height;

  let t1x = player.x - halfW / 2;
  let t1y = player.y - h / 2;
  camera.x += (t1x - camera.x) * 0.08;
  camera.y += (t1y - camera.y) * 0.08;

  let t2x = player2.x - halfW / 2;
  let t2y = player2.y - h / 2;
  camera2.x += (t2x - camera2.x) * 0.08;
  camera2.y += (t2y - camera2.y) * 0.08;

  renderGame();
}

window.togglePause = function() {
  if (!isGameRunning || isFinished) return;
  
  isPaused = !isPaused;
  if (isPaused) {
    document.getElementById('pauseScreen').classList.remove('hidden');
    document.getElementById('pauseScreen').classList.add('active');
    stopEngineSound();
    stopMusic();
  } else {
    document.getElementById('pauseScreen').classList.remove('active');
    document.getElementById('pauseScreen').classList.add('hidden');
    if (settings.sfx) startEngineSound();
    if (settings.music) startMusic();
  }
};

window.restartRace = function() {
  document.getElementById('pauseScreen').classList.remove('active');
  document.getElementById('pauseScreen').classList.add('hidden');
  document.getElementById('finishScreen').classList.remove('active');
  document.getElementById('finishScreen').classList.add('hidden');
  document.getElementById('menuScreen').classList.remove('active');
  document.getElementById('menuScreen').classList.add('hidden');
  
  startGame();
};

window.goToMenu = function() {
  isGameRunning = false;
  isPaused = false;
  isFinished = false;
  
  stopEngineSound();
  stopMusic();
  
  document.getElementById('pauseScreen').classList.remove('active');
  document.getElementById('pauseScreen').classList.add('hidden');
  document.getElementById('finishScreen').classList.remove('active');
  document.getElementById('finishScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('active');
  document.getElementById('gameScreen').classList.add('hidden');
  
  let menu = document.getElementById('menuScreen');
  menu.classList.remove('hidden');
  menu.classList.add('active');
  loadLandingStats();
};

function endRace(winnerKey) {
  if (isFinished) return;
  isGameRunning = false;
  isFinished = true;
  raceWinner = winnerKey;
  stopEngineSound();
  stopMusic();

  let totalTimeMs = Date.now() - raceStartTime;
  let winner = winnerKey === 'p1' ? player : player2;
  let rank = getRankOrdinal(winner);

  document.getElementById('finishRank').innerText = rank;
  const titleEl = document.getElementById('finishTitle');
  const rankEl = document.getElementById('finishRank');
  if (winnerKey === 'p1') {
    titleEl.innerText = 'PLAYER 1 WINS!';
    rankEl.style.color = 'var(--neon-orange)';
  } else if (winnerKey === 'p2') {
    titleEl.innerText = 'PLAYER 2 WINS!';
    rankEl.style.color = 'var(--neon-pink)';
  } else {
    titleEl.innerText = 'AI WINS — TRY AGAIN!';
    rankEl.style.color = 'var(--neon-cyan)';
    rank = getRankOrdinal(player);
    document.getElementById('finishRank').innerText = 'Your rank: ' + rank;
  }

  document.getElementById('finishTime').innerText = formatTime(totalTimeMs);
  document.getElementById('finishBestLap').innerText = formatTime(bestLapTime);
  document.getElementById('finishTopSpeed').innerText =
    'P1: ' + player.topSpeedKmh + ' · P2: ' + player2.topSpeedKmh + ' km/h';

  let nitroUsedPercent = Math.min(100, Math.round(totalNitroVolumeUsed));
  document.getElementById('finishNitro').innerText = nitroUsedPercent + '%';

  showScreen('finishScreen');
  saveRaceResult(rank);
  const track = getTrackById(activeTrackId);
  profile.coins += track.reward || 50000;
  saveProfile();

  if (settings.sfx) playFanfareSound();
}

// --- EVENT KEYBOARD BINDINGS ---
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (isGameRunning) window.togglePause();
    return;
  }
  if (!isGameRunning || isPaused) return;

  if (e.key === 'w' || e.key === 'W') { window.keys.up = true; e.preventDefault(); }
  if (e.key === 's' || e.key === 'S') { window.keys.down = true; e.preventDefault(); }
  if (e.key === 'a' || e.key === 'A') { window.keys.left = true; e.preventDefault(); }
  if (e.key === 'd' || e.key === 'D') { window.keys.right = true; e.preventDefault(); }
  if (e.key === ' ') { window.keys.nitro = true; e.preventDefault(); }

  if (e.key === 'ArrowUp') { window.keys2.up = true; e.preventDefault(); }
  if (e.key === 'ArrowDown') { window.keys2.down = true; e.preventDefault(); }
  if (e.key === 'ArrowLeft') { window.keys2.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { window.keys2.right = true; e.preventDefault(); }
  if (e.key === 'Shift') { window.keys2.nitro = true; e.preventDefault(); }
});

window.addEventListener('keyup', e => {
  if (e.key === 'w' || e.key === 'W') window.keys.up = false;
  if (e.key === 's' || e.key === 'S') window.keys.down = false;
  if (e.key === 'a' || e.key === 'A') window.keys.left = false;
  if (e.key === 'd' || e.key === 'D') window.keys.right = false;
  if (e.key === ' ') window.keys.nitro = false;

  if (e.key === 'ArrowUp') window.keys2.up = false;
  if (e.key === 'ArrowDown') window.keys2.down = false;
  if (e.key === 'ArrowLeft') window.keys2.left = false;
  if (e.key === 'ArrowRight') window.keys2.right = false;
  if (e.key === 'Shift') window.keys2.nitro = false;
});

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadProfile();
  loadLandingStats();
  initSpeedometers();
  setActiveTrack(profile.selectedTrackId || 'nightcity');
});
