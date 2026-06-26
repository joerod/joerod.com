// ===== app.js =====
// Theme + favicon, NYC time, Weather, Crypto (BTC + ETH),
// Stocks, NY Sports ticker with off-night message,
// YouTube video picker.

// ---------- THEME & FAVICON ----------
let featureOverrides = { fireworks: "auto", snow: "auto" };

document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();

  // 🎃 October: swap to orange/black theme JR
  if (now.getMonth() === 9) {
    document.documentElement.classList.add('theme-october');
    try {
      const orangeJR =
        "data:image/svg+xml," +
        encodeURIComponent(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
            <rect width='64' height='64' fill='black'/>
            <g fill='#ff7a00'>
              <path d='M18 10 q8 0 8 8 v13 q0 6 -4 9 t-9 2 q-3 0 -6 -1 l2 -6 q2 1 4 1 q3 0 4.5 -1.5 t1.5 -4.5 v-12 q0 -1.8 -1 -2.9 t-3 -1.1 h-2 v-4 h5z'/>
              <path d='M31 28 h8 q8 0 8 8 q0 5 -4 7 l6 9 h-8 l-5 -8 h-3 v8 h-6 v-24 z m6 5 v7 h3 q3 0 3 -3 q0 -4 -3 -4 h-3z'/>
            </g>
          </svg>
        `);
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = orangeJR;
      document.head.appendChild(link);
    } catch (_) {}
  } else {
    document.documentElement.classList.remove('theme-october');
  }

  // 🎆 New Year theme (banner + styling)
  const isNewYearWindow =
    (now.getMonth() === 11 && now.getDate() >= 30) ||
    (now.getMonth() === 0 && now.getDate() <= 3);
  applyNewYearTheme(now, isNewYearWindow);

  // 🎆 Fireworks window (New Year + July 4)
  const isFireworksWindow =
    isNewYearWindow ||
    (now.getMonth() === 6 && now.getDate() === 4);
  applyFireworksTheme(isFireworksWindow);

  // 🎄 December: activate plaid Christmas theme (through Dec 25)
  if (now.getMonth() === 11 && now.getDate() <= 25) {
    document.documentElement.classList.add('theme-christmas');

  // Randomized blinking bulbs around the video (not all in sync)
  try { ensureChristmasVideoLights(); } catch (_) {}
  try { window.addEventListener('resize', debounce(ensureChristmasVideoLights, 150)); } catch (_) {}

  // Christmas countdown (upper left)
  try { ensureChristmasCountdown(); } catch (_) {}

  // Christmas favicon (red/green, same JR shape)
  try {
    const xmasJR =
      "data:image/svg+xml," +
      encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
          <rect width='64' height='64' fill='none'/>
          <g fill='#dc2626'>
            <path d='M18 10 q8 0 8 8 v13 q0 6 -4 9 t-9 2 q-3 0 -6 -1 l2 -6 q2 1 4 1 q3 0 4.5 -1.5 t1.5 -4.5 v-12 q0 -1.8 -1 -2.9 t-3 -1.1 h-2 v-4 h5z'/>
          </g>
          <g fill='#166534'>
            <path d='M31 28 h8 q8 0 8 8 q0 5 -4 7 l6 9 h-8 l-5 -8 h-3 v8 h-6 v-24 z m6 5 v7 h3 q3 0 3 -3 q0 -4 -3 -4 h-3z'/>
          </g>
        </svg>
      `);
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = xmasJR;
    document.head.appendChild(link);
  } catch (_) {}
  } else {
    document.documentElement.classList.remove('theme-christmas');
    try { ensureChristmasCountdown(); } catch (_) {} // cleanup if present
  }
});

// ---------- NEW YEAR FIREWORKS (canvas) ----------
let newYearFireworks = null;
let newYearBanner = null;
let snowLayer = null;

function applyNewYearTheme(now, isNewYearWindow) {
  document.documentElement.classList.toggle('theme-newyear', !!isNewYearWindow);
  try { ensureNewYearBanner(now, !!isNewYearWindow); } catch (_) {}
}

function applyFireworksTheme(isFireworksWindow) {
  const mode = featureOverrides.fireworks || "auto";
  const enabled = mode === "on" ? true : mode === "off" ? false : !!isFireworksWindow;
  document.documentElement.classList.toggle('theme-fireworks', enabled);
  try { ensureNewYearFireworks(); } catch (_) {}
}

function ensureNewYearBanner(now, active) {
  if (!active) {
    if (newYearBanner && newYearBanner.parentNode) newYearBanner.parentNode.removeChild(newYearBanner);
    newYearBanner = null;
    return;
  }
  if (!newYearBanner) {
    const banner = document.createElement('div');
    banner.className = 'newyear-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    const header = document.querySelector('.fixed-header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
      document.body.appendChild(banner);
    }
    newYearBanner = banner;
  }
  const displayYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  newYearBanner.textContent = `Happy New Year ${displayYear}`;
}

function ensureNewYearFireworks() {
  const active = document.documentElement.classList.contains('theme-fireworks');
  if (!active) {
    stopNewYearFireworks();
    return;
  }
  if (newYearFireworks) return;
  startNewYearFireworks();
}

function startNewYearFireworks() {
  const canvas = document.createElement('canvas');
  canvas.className = 'newyear-fireworks';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colors = ['#ff3b3b', '#ffd93d', '#4adeff', '#7c3aed', '#34d399', '#ff7b00'];

  const state = {
    canvas,
    ctx,
    width: 0,
    height: 0,
    fireworks: [],
    particles: [],
    lastTime: 0,
    nextBurst: 0,
    raf: null,
    onResize: null
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width * dpr;
    canvas.height = state.height * dpr;
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const createFirework = () => {
    const sx = rand(state.width * 0.2, state.width * 0.8);
    const sy = state.height + 20;
    const tx = rand(state.width * 0.15, state.width * 0.85);
    const ty = rand(state.height * 0.15, state.height * 0.5);
    const color = pick(colors);
    state.fireworks.push({
      x: sx,
      y: sy,
      sx,
      sy,
      tx,
      ty,
      speed: rand(4.5, 7.5),
      color
    });
  };

  const explode = (x, y, color) => {
    const count = Math.floor(rand(70, 120));
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(1.8, 5.8);
      state.particles.push({
        x,
        y,
        lastX: x,
        lastY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        friction: rand(0.97, 0.985),
        gravity: rand(0.03, 0.06),
        alpha: 1,
        decay: rand(0.008, 0.016),
        width: rand(1.1, 2.2),
        color
      });
    }
  };

  const loop = (ts) => {
    if (!newYearFireworks) return;
    if (!state.lastTime) state.lastTime = ts;
    const delta = ts - state.lastTime;
    state.lastTime = ts;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.globalCompositeOperation = 'lighter';

    if (ts > state.nextBurst) {
      createFirework();
      if (Math.random() > 0.6) createFirework();
      state.nextBurst = ts + rand(420, 900);
    }

    for (let i = state.fireworks.length - 1; i >= 0; i--) {
      const fw = state.fireworks[i];
      const dx = fw.tx - fw.x;
      const dy = fw.ty - fw.y;
      const dist = Math.hypot(dx, dy);
      const step = fw.speed * (delta / 16.7);
      if (dist <= step) {
        explode(fw.tx, fw.ty, fw.color);
        state.fireworks.splice(i, 1);
        continue;
      }
      fw.x += (dx / dist) * step;
      fw.y += (dy / dist) * step;

      ctx.beginPath();
      ctx.fillStyle = fw.color;
      ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.lastX = p.x;
      p.lastY = p.y;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx * (delta / 16.7);
      p.y += p.vy * (delta / 16.7);
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.lastX, p.lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    state.raf = requestAnimationFrame(loop);
  };

  resize();
  state.onResize = resize;
  window.addEventListener('resize', state.onResize);
  state.raf = requestAnimationFrame(loop);
  newYearFireworks = state;
}

function stopNewYearFireworks() {
  if (!newYearFireworks) return;
  const { canvas, raf, onResize } = newYearFireworks;
  if (raf) cancelAnimationFrame(raf);
  if (onResize) window.removeEventListener('resize', onResize);
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  newYearFireworks = null;
}

// ---------- SNOWFALL (weather-triggered) ----------
function applySnowTheme(isSnowing) {
  const mode = featureOverrides.snow || "auto";
  const enabled = mode === "on" ? true : mode === "off" ? false : !!isSnowing;
  document.documentElement.classList.toggle('theme-snow', enabled);
  try { ensureSnowfall(enabled); } catch (_) {}
}

function ensureSnowfall(active) {
  if (!active) {
    if (snowLayer && snowLayer.parentNode) snowLayer.parentNode.removeChild(snowLayer);
    snowLayer = null;
    return;
  }
  if (snowLayer) return;

  const layer = document.createElement('div');
  layer.className = 'snowfall';
  layer.setAttribute('aria-hidden', 'true');

  const flakeCount = 50;
  for (let i = 0; i < flakeCount; i++) {
    const flake = document.createElement('span');
    flake.className = 'snowflake';
    const size = (Math.random() * 6 + 2).toFixed(1);
    const left = (Math.random() * 100).toFixed(2);
    const fall = (Math.random() * 8 + 6).toFixed(2);
    const sway = (Math.random() * 4 + 3).toFixed(2);
    const delay = (Math.random() * -10).toFixed(2);
    const opacity = (Math.random() * 0.6 + 0.3).toFixed(2);
    flake.style.setProperty('--size', `${size}px`);
    flake.style.setProperty('--left', `${left}%`);
    flake.style.setProperty('--fall', `${fall}s`);
    flake.style.setProperty('--sway', `${sway}s`);
    flake.style.setProperty('--delay', `${delay}s`);
    flake.style.setProperty('--opacity', opacity);
    layer.appendChild(flake);
  }

  document.body.appendChild(layer);
  snowLayer = layer;
}

// ---------- CHRISTMAS VIDEO LIGHTS (randomized bulbs) ----------
function debounce(fn, wait = 150) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function ensureChristmasVideoLights() {
  if (!document.documentElement.classList.contains('theme-christmas')) return;

  const container = document.querySelector('.video-container');
  if (!container) return;

  // Remove any existing light layer
  const existing = container.querySelector('.xmas-lights');
  if (existing) existing.remove();

  const layer = document.createElement('div');
  layer.className = 'xmas-lights';
  container.appendChild(layer);

  // Force layout so we can measure the light layer
  const totalW = layer.clientWidth;
  const totalH = layer.clientHeight;
  if (!totalW || !totalH) {
    // Layout might not be ready yet (rare). Try again on the next frame.
    requestAnimationFrame(() => {
      try { ensureChristmasVideoLights(); } catch (_) {}
    });
    return;
  }

  const colors = ['#ff2b2b', '#1aff4a', '#2b7bff', '#ffd82b'];
  const spacing = 28; // bulb spacing (slightly looser than the old SVG border)

  const makeBulb = (side, x, y) => {
    const b = document.createElement('span');
    b.className = `xmas-bulb ${side}`;
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;

    const c = colors[Math.floor(Math.random() * colors.length)];
    b.style.setProperty('--bulbColor', c);
    b.style.setProperty('--blinkDelay', `${(Math.random() * 1.8).toFixed(2)}s`);
    b.style.setProperty('--blinkDur', `${(0.9 + Math.random() * 1.6).toFixed(2)}s`);
    return b;
  };

  // Top + bottom
  const countTop = Math.max(8, Math.floor(totalW / spacing));
  for (let i = 0; i < countTop; i++) {
    const x = (i + 0.5) * (totalW / countTop);
    layer.appendChild(makeBulb('side-top', x, 0));
    layer.appendChild(makeBulb('side-bottom', x, totalH));
  }

  // Left + right
  const countSide = Math.max(5, Math.floor(totalH / spacing));
  for (let i = 0; i < countSide; i++) {
    const y = (i + 0.5) * (totalH / countSide);
    layer.appendChild(makeBulb('side-left', 0, y));
    layer.appendChild(makeBulb('side-right', totalW, y));
  }
}

// ---------- CHRISTMAS COUNTDOWN ----------
let xmasCountdownTimer = null;

function ensureChristmasCountdown() {
  const isXmas = document.documentElement.classList.contains('theme-christmas');

  if (!isXmas) {
    if (xmasCountdownTimer) {
      clearInterval(xmasCountdownTimer);
      xmasCountdownTimer = null;
    }
    const existing = document.getElementById('xmas-countdown');
    if (existing) existing.remove();
    return;
  }

  let panel = document.getElementById('xmas-countdown');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'xmas-countdown';
    panel.className = 'xmas-countdown';
    const label = document.createElement('div');
    label.className = 'countdown-label';
    label.textContent = 'Christmas Countdown';
    const value = document.createElement('div');
    value.id = 'xmas-countdown-value';
    value.className = 'countdown-value';
    panel.appendChild(label);
    panel.appendChild(value);
    document.body.appendChild(panel);
  }

  const valueEl = document.getElementById('xmas-countdown-value');
  if (!valueEl) return;

  if (xmasCountdownTimer) {
    clearInterval(xmasCountdownTimer);
    xmasCountdownTimer = null;
  }

  const computeTarget = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const target = new Date(currentYear, 11, 25, 0, 0, 0, 0);
    if (now > target) {
      return new Date(currentYear + 1, 11, 25, 0, 0, 0, 0);
    }
    return target;
  };

  const targetDate = computeTarget();

  const update = () => {
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() >= 25) {
      valueEl.textContent = `🎄 Christmas ${now.getFullYear()} is here!`;
      return;
    }
    let diff = targetDate - now;
    if (diff < 0) diff = 0;

    const seconds = Math.floor(diff / 1000);
    const days = Math.floor(seconds / (60 * 60 * 24));
    const hours = Math.floor((seconds - days * 24 * 3600) / 3600);
    const mins = Math.floor((seconds - days * 24 * 3600 - hours * 3600) / 60);
    const secs = seconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    valueEl.textContent = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  };

  update();
  xmasCountdownTimer = setInterval(update, 1000);
}

// ---------- HELPERS ----------
function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// NYC time (24h, no seconds)
function updateNYTime() {
  try {
    const opts = {
      timeZone: 'America/New_York',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const nowStr = new Intl.DateTimeFormat('en-US', opts).format(new Date());
    const el = document.getElementById('ny-time');
    if (el) el.textContent = `NYC • ${nowStr}`;
  } catch (e) {
    const el = document.getElementById('ny-time');
    if (el) el.textContent = 'NYC • Time unavailable';
  }
}

// ---------- WEATHER ----------
async function loadWeather() {
  try {
    const API_KEY = 'ea033866cb220b2bb944e00b54306c14';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=New York,NY,US&appid=${API_KEY}&units=imperial`;
    const response = await fetch(url, { cache: 'no-store', mode: 'cors' });
    const data = await response.json();

    if (data.cod === 200) {
      const iconCode = data.weather[0].icon;
      const iconMap = {
        '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️'
      };
      const iconEl = document.getElementById('weather-icon');
      const tempEl = document.getElementById('weather-temp');
      const descEl = document.getElementById('weather-desc');
      if (iconEl) iconEl.textContent = iconMap[iconCode] || '🌤️';
      if (tempEl) tempEl.textContent = `${Math.round(data.main.temp)}°F`;
      if (descEl) descEl.textContent = data.weather[0].description;
    } else {
      throw new Error('Weather API returned error');
    }
  } catch (error) {
    console.error('Weather loading error:', error);
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    if (iconEl) iconEl.textContent = '🌤️';
    if (tempEl) tempEl.textContent = 'Weather unavailable';
    if (descEl) descEl.textContent = 'Unable to load weather';
  }
}
// ---------- CRYPTO (BTC + ETH) ----------

document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  if (now.getMonth() === 9) document.documentElement.classList.add('theme-october');
  if (now.getMonth() === 11) {
    document.documentElement.style.setProperty('--primary-color', '#dc2626');
    document.documentElement.style.setProperty('--secondary-color', '#166534');
    document.documentElement.style.setProperty('--accent-color', '#fbbf24');
  }
});

function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ---------- TIME ----------
function updateNYTime() {
  const opts = { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  const nowStr = new Intl.DateTimeFormat('en-US', opts).format(new Date());
  const el = document.getElementById('ny-time');
  if (el) el.textContent = `NYC • ${nowStr}`;
}
setInterval(updateNYTime, 30000);
updateNYTime();

// ---------- WEATHER ----------
async function loadWeather() {
  try {
    const API_KEY = 'ea033866cb220b2bb944e00b54306c14';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=New York,NY,US&appid=${API_KEY}&units=imperial`;
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    const data = await res.json();

    const iconMap = {
      '01d': '☀️',  '01n': '🌙',
      '02d': '🌤️', '02n': '☁️🌙',
      '03d': '☁️',  '03n': '☁️',
      '04d': '☁️',  '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };

    const wx = data.weather?.[0] || {};
    const iconCode = wx.icon;
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');

    if (iconEl) iconEl.textContent = iconMap[iconCode] || '🌡️';
    if (tempEl) tempEl.textContent = `${Math.round(data.main.temp)}°`;
    if (descEl) descEl.textContent = wx.description || '';

    const isSnow =
      wx.main === 'Snow' ||
      (typeof wx.id === 'number' && wx.id >= 600 && wx.id < 700) ||
      /snow/i.test(wx.description || '');
    applySnowTheme(isSnow);
  } catch (e) {
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    if (iconEl) iconEl.textContent = '⚠️';
    if (tempEl) tempEl.textContent = 'N/A';
    if (descEl) descEl.textContent = 'Weather unavailable';
    applySnowTheme(false);
  }
}
loadWeather();
// ---------- CRYPTO ----------
async function loadBitcoinPrice() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { cache: 'no-store', mode: 'cors' }
    );
    const data = await res.json();
    const btc = data.bitcoin;
    const eth = data.ethereum;

    function render(coin, valEl, chgEl) {
      if (!coin) return;
      valEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(coin.usd);
      const pct = coin.usd_24hr_change?.toFixed ? coin.usd_24hr_change.toFixed(2) : coin.usd_24h_change.toFixed(2);
      const change = coin.usd_24hr_change ?? coin.usd_24h_change;
      const up = change > 0;
      chgEl.textContent = `${up ? '+' : ''}${pct}%`;
      valEl.className = `crypto-value ${up ? 'up' : 'down'}`;
      chgEl.className = `crypto-change ${up ? 'up' : 'down'}`;
    }

    render(btc, document.getElementById('bitcoin-price-value'), document.getElementById('bitcoin-price-change'));
    render(eth, document.getElementById('ethereum-price-value'), document.getElementById('ethereum-price-change'));
  } catch (e) {
    console.error('Crypto error', e);
  }
}
loadBitcoinPrice();

// ---------- STOCKS ----------
let stocksTimer = null;
function isMarketOpenNY() {
  // rough check: Mon–Fri, 9:30–16:05 ET
  const now = new Date();
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = ny.getDay(); // 0 Sun ... 6 Sat
  const hours = ny.getHours();
  const minutes = ny.getMinutes();
  const afterOpen = (hours > 9 || (hours === 9 && minutes >= 30));
  const beforeClose = (hours < 16 || (hours === 16 && minutes <= 5));
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday && afterOpen && beforeClose;
}

async function loadStocks() {
  const el = document.getElementById('stocks-body');
  if (!el) return;
  el.innerHTML = `
    <div class="stock-row">
      <span class="stock-name">Loading...</span>
      <span class="stock-value"></span>
      <span class="stock-change"></span>
    </div>`;

  const render = (rows) => {
    el.innerHTML = '';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'stock-row';
      const chgClass = (r.changePercent ?? 0) >= 0 ? 'up' : 'down';
      const pct = (r.changePercent != null)
        ? `${(r.changePercent).toFixed(2)}%`
        : '';
      row.innerHTML = `
        <span class="stock-name">${r.name}</span>
        <span class="stock-value">$${r.price != null ? r.price.toFixed(2) : '—'}</span>
        <span class="stock-change ${chgClass}">${pct}</span>
      `;
      el.appendChild(row);
    });
  };

  // ... keep rest of file unchanged ...
