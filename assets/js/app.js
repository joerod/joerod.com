// ===== app.js =====
// October theme toggle + favicon swap, December palette tweak,
// NYC time, Weather (OpenWeatherMap), Bitcoin (CoinGecko),
// Stocks (FMP + fallbacks), ESPN NY scores (with live refresh),
// and YouTube video picker.

// ---------- THEME & FAVICON ----------
document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();

  // 🎃 October: enable theme + swap favicon
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

  // 🎄 December quick palette tweak (kept from original behavior)
  if (now.getMonth() === 11) {
    document.documentElement.style.setProperty('--primary-color', '#dc2626');
    document.documentElement.style.setProperty('--secondary-color', '#166534');
    document.documentElement.style.setProperty('--accent-color', '#fbbf24');
  }
});

// ---------- HELPERS ----------
function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// NYC time (24h) — no seconds
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

// ---------- BITCOIN ----------
async function loadBitcoinPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
      cache: 'no-store',
      mode: 'cors'
    });
    const data = await response.json();
    const price = data?.bitcoin?.usd;
    const change24h = data?.bitcoin?.usd_24h_change;

    const priceElement = document.getElementById('bitcoin-price-value');
    const changeElement = document.getElementById('bitcoin-price-change');

    if (price) {
      if (priceElement) {
        priceElement.textContent = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(price);
        priceElement.classList.remove('up', 'down');
      }
      if (changeElement) changeElement.classList.remove('up', 'down');

      if (typeof change24h === 'number') {
        const isUp = change24h > 0;
        const pct = change24h.toFixed(2);
        if (changeElement) changeElement.textContent = `${isUp ? '+' : ''}${pct}%`;
        const cls = isUp ? 'up' : 'down';
        if (priceElement) priceElement.classList.add(cls);
        if (changeElement) changeElement.classList.add(cls);
      } else if (changeElement) {
        changeElement.textContent = '';
      }
    } else {
      if (priceElement) priceElement.textContent = 'Price unavailable';
      if (changeElement) changeElement.textContent = '';
    }
  } catch (error) {
    console.error('Bitcoin price loading error:', error);
    const priceElement = document.getElementById('bitcoin-price-value');
    const changeElement = document.getElementById('bitcoin-price-change');
    if (priceElement) priceElement.textContent = 'Price unavailable';
    if (changeElement) changeElement.textContent = 'Change unavailable';
  }
}

// ---------- STOCKS ----------
let stocksTimer = null;
const FMP_KEY = '7GnhMIdkPTdqlFXV4cUaKgUK8cPFNXXg';

function isMarketOpenNY() {
  // Approximation: Mon–Fri, 9:30–16:00 ET (+5m)
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
  el.innerHTML = '<div class="stock-row"><span class="stock-name">Loading...</span><span class="stock-value"></span><span class="stock-change"></span></div>';

  const render = (rows) => {
    el.innerHTML = '';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'stock-row';
      const chgClass = (r.changePercent ?? 0) >= 0 ? 'up' : 'down';
      const pct = (r.changePercent != null) ? `${(r.changePercent).toFixed(2)}%` : '';
      row.innerHTML = `
        <span class="stock-name">${r.name}</span>
        <span class="stock-value">$${r.price != null ? r.price.toFixed(2) : '—'}</span>
        <span class="stock-change ${chgClass}">${pct}</span>
      `;
      el.appendChild(row);
    });
  };

  const sources = [
    async () => {
      const symbols = 'AAPL,AMZN,TSLA,MSFT';
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${encodeURIComponent(FMP_KEY)}`;
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      if (!res.ok) throw new Error('FMP failed');
      const data = await res.json();
      const nameMap = { 'AAPL': 'Apple','AMZN': 'Amazon','TSLA': 'Tesla','MSFT': 'Microsoft' };
      return data
        .filter(x => nameMap[x.symbol])
        .map(x => ({
          name: nameMap[x.symbol],
          price: x.price ?? x.previousClose ?? x.prevClose ?? null,
          changePercent: x.changesPercentage != null ? parseFloat(x.changesPercentage) : null
        }))
        .sort((a, b) => {
          const order = ['Apple', 'Amazon', 'Tesla', 'Microsoft'];
          return order.indexOf(a.name) - order.indexOf(b.name);
        });
    },
    async () => {
      const symbols = ['AAPL', 'AMZN', 'TSLA', 'MSFT'];
      const results = [];
      for (const symbol of symbols) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
          const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
          if (!res.ok) continue;
          const data = await res.json();
          if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const current = meta.regularMarketPrice || meta.previousClose;
            const prev = meta.previousClose;
            const change = current && prev ? ((current - prev) / prev) * 100 : null;
            const nameMap = { 'AAPL': 'Apple','AMZN': 'Amazon','TSLA': 'Tesla','MSFT': 'Microsoft' };
            results.push({ name: nameMap[symbol] || symbol, price: current, changePercent: change });
          }
        } catch (e) { continue; }
      }
      if (results.length === 0) throw new Error('Yahoo Finance failed');
      const order = ['Apple', 'Amazon', 'Tesla', 'Microsoft'];
      results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
      return results;
    },
    async () => {
      const symbols = ['AAPL', 'AMZN', 'TSLA', 'MSFT'];
      const results = [];
      for (const symbol of symbols) {
        try {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`;
          const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
          if (!res.ok) continue;
          const data = await res.json();
          if (data['Global Quote']) {
            const quote = data['Global Quote'];
            const current = parseFloat(quote['05. price']);
            const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
            const nameMap = { 'AAPL': 'Apple','AMZN': 'Amazon','TSLA': 'Tesla','MSFT': 'Microsoft' };
            results.push({ name: nameMap[symbol] || symbol, price: current, changePercent });
          }
        } catch (e) { continue; }
      }
      if (results.length === 0) throw new Error('Alpha Vantage failed');
      const order = ['Apple', 'Amazon', 'Tesla', 'Microsoft'];
      results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
      return results;
    },
    async () => {
      const symbols = ['AAPL', 'AMZN', 'TSLA', 'MSFT'];
      const results = [];
      for (const symbol of symbols) {
        try {
          const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=demo`;
          const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
          if (!res.ok) continue;
          const data = await res.json();
          if (data.latestPrice) {
            const current = data.latestPrice;
            const change = data.changePercent ? data.changePercent * 100 : null;
            const nameMap = { 'AAPL': 'Apple','AMZN': 'Amazon','TSLA': 'Tesla','MSFT': 'Microsoft' };
            results.push({ name: nameMap[symbol] || symbol, price: current, changePercent: change });
          }
        } catch (e) { continue; }
      }
      if (results.length === 0) throw new Error('IEX Cloud failed');
      const order = ['Apple', 'Amazon', 'Tesla', 'Microsoft'];
      results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
      return results;
    }
  ];

  let success = false;
  for (const source of sources) {
    try {
      const rows = await source();
      if (rows && rows.length > 0) {
        render(rows);
        success = true;
        break;
      }
    } catch (err) { continue; }
  }

  if (!success) {
    el.innerHTML = '<div class="stock-row"><span class="stock-name">Stock data unavailable</span><span class="stock-value"></span><span class="stock-change"></span></div>';
  }

  if (isMarketOpenNY()) {
    if (!stocksTimer) stocksTimer = setInterval(loadStocks, 5 * 60 * 1000);
  } else if (stocksTimer) {
    clearInterval(stocksTimer);
    stocksTimer = null;
  }
}

// ---------- SPORTS (NY teams) ----------
const TEAM_ORDER_PRIORITY = [
  'Mets', 'Knicks', 'Rangers', 'Yankees', 'Giants', 'Nets', 'NYCFC', 'Red Bulls', 'Liberty', 'Gotham FC'
];

const ALLOW_BY_LEAGUE = {
  MLB: [
    { label: 'Mets', rx: [/\bnew york mets\b/i, /\bmets\b/i, /\bNYM\b/i] },
    { label: 'Yankees', rx: [/\bnew york yankees\b/i, /\byankees\b/i, /\bNYY\b/i] },
  ],
  NBA: [
    { label: 'Knicks', rx: [/\bnew york knicks\b/i, /\bknicks\b/i, /\bNYK\b/i] },
    { label: 'Nets',   rx: [/\bbrooklyn nets\b/i, /\bnets\b/i, /\bBKN\b/i] },
  ],
  NFL: [
    { label: 'Giants', rx: [/\bnew york giants\b/i, /\bgiants\b/i, /\bNYG\b/i] },
  ],
  NHL: [
    { label: 'Rangers', rx: [/\bnew york rangers\b/i, /\brangers\b/i, /\bNYR\b/i] },
  ],
  MLS: [
    { label: 'NYCFC',    rx: [/\bnycfc\b/i, /\bnew york city fc\b/i] },
    { label: 'Red Bulls', rx: [/\bnew york red bulls\b/i, /\bred bulls\b/i, /\bNYRB\b/i] },
  ],
  WNBA: [
    { label: 'Liberty', rx: [/\bnew york liberty\b/i, /\bliberty\b/i, /\bNYL\b/i] },
  ],
  NWSL: [
    { label: 'Gotham FC', rx: [/\bgotham fc\b/i, /\bgotham\b/i, /nj\/ny/i, /\bNJNY\b/i] },
  ],
};

const LEAGUES = [
  { key: 'MLB',  path: 'baseball/mlb' },
  { key: 'NBA',  path: 'basketball/nba' },
  { key: 'NFL',  path: 'football/nfl' },
  { key: 'NHL',  path: 'hockey/nhl' },
  { key: 'MLS',  path: 'soccer/usa.1' },
  { key: 'WNBA', path: 'basketball/wnba' },
  { key: 'NWSL', path: 'soccer/usa.nwsl' },
];

function teamString(t) {
  const parts = [
    t?.team?.displayName, t?.team?.shortDisplayName, t?.team?.name,
    t?.team?.abbreviation, t?.team?.location, t?.team?.nickname
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}
function matchLocalLabelForLeague(teamObj, leagueKey) {
  const s = teamString(teamObj);
  const allow = ALLOW_BY_LEAGUE[leagueKey] || [];
  for (const entry of allow) {
    if (entry.rx.some(r => r.test(s))) return entry.label;
  }
  return null;
}
function bestLocalLabelForEvent(ev, leagueKey) {
  const teams = ev.competitions?.[0]?.competitors || [];
  const labels = teams.map(t => matchLocalLabelForLeague(t, leagueKey)).filter(Boolean);
  if (!labels.length) return null;
  labels.sort((a, b) => {
    const ia = TEAM_ORDER_PRIORITY.indexOf(a);
    const ib = TEAM_ORDER_PRIORITY.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return labels[0];
}
function eventHasScore(ev) {
  const comps = ev.competitions?.[0]?.competitors || [];
  return comps.some(t => t && t.score !== undefined && t.score !== null && t.score !== '');
}
function getRecordSummary(competitor) {
  if (Array.isArray(competitor?.records) && competitor.records.length) {
    const overall = competitor.records.find(r => /overall/i.test(r.name)) || competitor.records[0];
    if (overall?.summary) return overall.summary;
  }
  if (competitor?.record && typeof competitor.record === 'string') return competitor.record;
  if (competitor?.team?.record && typeof competitor.team.record === 'string') return competitor.team.record;
  return '';
}
function formatStatus(ev) {
  const comp = ev.competitions?.[0];
  const st = comp?.status?.type;
  if (!st) return '—';
  if (st.state === 'pre') {
    const t = comp.date ? new Date(comp.date) : null;
    return t ? t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : (st.shortDetail || 'Scheduled');
  }
  if (st.state === 'in') return st.shortDetail || 'Live';
  if (st.state === 'post') return st.shortDetail || 'Final';
  return st.shortDetail || '—';
}
async function fetchLeague(leaguePath, dateStr) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${leaguePath}/scoreboard?dates=${dateStr}`;
  const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
  if (!res.ok) throw new Error(`ESPN ${leaguePath} failed`);
  return res.json();
}
function renderGamesInto(container, leagueLabel, events) {
  if (!events.length) return;
  const block = document.createElement('div');
  block.className = 'league-block';

  const title = document.createElement('div');
  title.className = 'league-name';
  title.textContent = leagueLabel;
  block.appendChild(title);

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    const teams = comp?.competitors || [];
    const theAway = teams.find(t => t.homeAway === 'away');
    const theHome = teams.find(t => t.homeAway === 'home');

    const away = theAway || {};
    const home = theHome || {};

    const awayName = away?.team?.shortDisplayName || away?.team?.displayName || 'Away';
    const homeName = home?.team?.shortDisplayName || home?.team?.displayName || 'Home';
    const awayScore = away?.score ?? '';
    const homeScore = home?.score ?? '';

    const awayRec = getRecordSummary(away);
    const homeRec = getRecordSummary(home);

    const statusText = formatStatus(ev);
    const isLive = (comp?.status?.type?.state === 'in');

    const line = document.createElement('div');
    line.className = 'game-line' + (isLive ? ' live' : '');
    line.setAttribute('data-event-id', ev.id);

    line.innerHTML = `
      <div class="game-left">
        <div class="team-col">
          <div class="team-main">${awayName} - <span class="score" id="score-${ev.id}-away" data-event-id="${ev.id}" data-side="away">${awayScore}</span></div>
          ${awayRec ? `<div class="team-sub">(${awayRec})</div>` : ''}
        </div>
        <span class="at">@</span>
        <div class="team-col">
          <div class="team-main">${homeName} - <span class="score" id="score-${ev.id}-home" data-event-id="${ev.id}" data-side="home">${homeScore}</span></div>
          ${homeRec ? `<div class="team-sub">(${homeRec})</div>` : ''}
        </div>
      </div>
      <div class="game-status" id="status-${ev.id}">${statusText}</div>
    `;
    block.appendChild(line);
  }

  container.appendChild(block);
}

let scoresRefreshTimer = null;
let refreshing = false;
function manageScoresInterval(hasLive) {
  if (hasLive && !scoresRefreshTimer) {
    scoresRefreshTimer = setInterval(refreshScoresOnly, 30000); // 30s
  } else if (!hasLive && scoresRefreshTimer) {
    clearInterval(scoresRefreshTimer);
    scoresRefreshTimer = null;
  }
}
async function buildSportsScores() {
  try {
    const scoresContainer = document.getElementById('sports-scores');
    if (!scoresContainer) return;

    scoresContainer.innerHTML = `
      <div class="sports-title">Today's NY Scores (${new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })})</div>
      <div class="scores-scroll" id="scores-scroll"></div>
    `;
    const scrollHost = document.getElementById('scores-scroll');
    const dateStr = yyyymmdd(new Date());
    let hasLiveOverall = false;

    for (const lg of LEAGUES) {
      try {
        const data = await fetchLeague(lg.path, dateStr);

        let nyEvents = (data.events || []).map(ev => {
          ev.__localLabel = bestLocalLabelForEvent(ev, lg.key);
          return ev;
        }).filter(ev => ev.__localLabel);

        nyEvents.sort((a, b) => {
          const as = eventHasScore(a), bs = eventHasScore(b);
          if (as !== bs) return bs - as;
          const ia = TEAM_ORDER_PRIORITY.indexOf(a.__localLabel);
          const ib = TEAM_ORDER_PRIORITY.indexOf(b.__localLabel);
          const pa = ia === -1 ? 999 : ia;
          const pb = ib === -1 ? 999 : ib;
          if (pa !== pb) return pa - pb;
          const ta = new Date(a.competitions?.[0]?.date || 0).getTime();
          const tb = new Date(b.competitions?.[0]?.date || 0).getTime();
          return ta - tb;
        });

        if (nyEvents.some(ev => ev.competitions?.[0]?.status?.type?.state === 'in')) {
          hasLiveOverall = true;
        }

        const temp = document.createElement('div');
        renderGamesInto(temp, lg.key, nyEvents);
        if (temp.firstChild) scrollHost.appendChild(temp.firstChild);

      } catch (err) {
        const block = document.createElement('div');
        block.className = 'league-block';
        block.innerHTML = `<div class="league-name">${lg.key}</div><div class="game-line"><span class="game-left">Scores unavailable</span></div>`;
        scrollHost.appendChild(block);
      }
    }

    manageScoresInterval(hasLiveOverall);
  } catch (e) {
    const scoresContainer = document.getElementById('sports-scores');
    if (scoresContainer) scoresContainer.innerHTML = '<div class="sports-title">Scores unavailable</div>';
  }
}
async function refreshScoresOnly() {
  if (refreshing) return;
  refreshing = true;

  try {
    const dateStr = yyyymmdd(new Date());
    let hasLiveOverall = false;

    for (const lg of LEAGUES) {
      try {
        const data = await fetchLeague(lg.path, dateStr);
        let nyEvents = (data.events || []).map(ev => {
          ev.__localLabel = bestLocalLabelForEvent(ev, lg.key);
          return ev;
        }).filter(ev => ev.__localLabel);

        if (nyEvents.some(ev => ev.competitions?.[0]?.status?.type?.state === 'in')) {
          hasLiveOverall = true;
        }

        nyEvents.forEach(ev => {
          const comp = ev.competitions?.[0];
          const teams = comp?.competitors || [];
          const away = teams.find(t => t.homeAway === 'away');
          const home = teams.find(t => t.homeAway === 'home');
          const awayScore = (away?.score ?? '').toString();
          const homeScore = (home?.score ?? '').toString();

          const awayEl = document.getElementById(`score-${ev.id}-away`);
          const homeEl = document.getElementById(`score-${ev.id}-home`);
          if (awayEl && awayEl.textContent !== awayScore) {
            awayEl.classList.add('score-updating'); void awayEl.offsetWidth;
            awayEl.textContent = awayScore; setTimeout(() => awayEl.classList.remove('score-updating'), 180);
          }
          if (homeEl && homeEl.textContent !== homeScore) {
            homeEl.classList.add('score-updating'); void homeEl.offsetWidth;
            homeEl.textContent = homeScore; setTimeout(() => homeEl.classList.remove('score-updating'), 180);
          }

          const line = document.querySelector(`.game-line[data-event-id="${ev.id}"]`);
          if (line) {
            const isLive = (comp?.status?.type?.state === 'in');
            line.classList.toggle('live', !!isLive);

            const statusEl = document.getElementById(`status-${ev.id}`);
            if (statusEl) {
              const st = comp?.status?.type;
              let statusText = '—';
              if (st) {
                if (st.state === 'pre') {
                  const t = comp.date ? new Date(comp.date) : null;
                  statusText = t ? t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : (st.shortDetail || 'Scheduled');
                } else if (st.state === 'in') statusText = st.shortDetail || 'Live';
                else if (st.state === 'post') statusText = st.shortDetail || 'Final';
                else statusText = st.shortDetail || '—';
              }
              if (statusEl.textContent !== statusText) statusEl.textContent = statusText;
            }
          }
        });

      } catch (e) { /* ignore league refresh errors */ }
    }

    manageScoresInterval(hasLiveOverall);
  } finally {
    refreshing = false;
  }
}

// ---------- VIDEOS ----------
var xmas_videos = [
  { id: 'rgEP1niScLc' }, { id: 'S7OWoc-j8qQ' }, { id: 'hZ9q3PtiYu8' }, { id: 'E3RQVcNUcTA' },
  { id: 'GPG3zSgm_Qo' }, { id: 'tR_Z1LUDQuQ' }, { id: 'kSkyv8EUEsU' }, { id: 'uIsgSQvsRj8' },
  { id: 'e-r8hvTFVb8' }, { id: 'myzC3f0j9kw' }, { id: 'LznVSn7Ud9o' }
];
var american_holiday_videos = [
  { id: '7NiGq6q3Z34' }, { id: 'TmoeZHnOJKA' }, { id: 'U1mlCPMYtPk' }, { id: 'N_lCmBvYMRs' }
];
var regular_videos = [
  { id: 'CMNry4PE93Y' }, { id: 'dQw4w9WgXcQ' }, { id: '6GsCmnZnllk' }, { id: 'kR2O_xuVvIU' },
  { id: '1VbZE6YhjKk' }, { id: 'ohz8_IafGwE' }, { id: 'S2XvxDaIwCw' }, { id: '7wrw19K_g_M' },
  { id: 'TkyLnWm1iCs' }, { id: '5ztwns5PkJY' }, { id: 'GV01B5kVsC0' }, { id: 'rzQAC8kPJxo' },
  { id: '7ujwjqIldwU' }, { id: '5UDoSc-fRpg' }, { id: 'pCTfxOrX4k8' }, { id: 'Dr0m5bWAgk0' },
  { id: 'lMDkxFnUTZs' }, { id: 'voDqfVthTpA' }, { id: 'y8p1iG-6d-w' }, { id: '-riX6Xbvb8w' },
  { id: 'Abr_LU822rQ' }, { id: '9m_12SGXNKw' }, { id: 'JJmqCKtJnxM' }, { id: 'NZJrGuC92U8' },
  { id: 'sZywE0AT1qY' }, { id: '3O0ptHIh6Yo' }, { id: 'KoPFkjF-Bdo' }, { id: 'c1EyN9xTK94' },
  { id: 'ODmhPsgqGgQ' }, { id: 'jsLUidiYm0w' }, { id: 'cgg9byUy-V4' }, { id: 'H_yAOI6FLqk' },
  { id: 'VFIzTzRuSL8' }, { id: 'DevuEUSZ6Xk' }, { id: 'KS6f1MKpLGM' }, { id: 'zE7PKRjrid4' },
  { id: '73ytL_HAwt8' }, { id: 'M4nFSdNNFQw' }, { id: 'EiTYwecY41c' }
];
/* 🎃 Halloween list */
var halloween_videos = [
  { id: 'Ht3gFCqpFkE' }, { id: 'aDm4L7gjYNs' }, { id: 'gVgsadEybgQ' },
  { id: 'HcrTqof683A' }, { id: 'cl3sud_uDhc' }, { id: 'E16S5BAkzQ8' }, { id: 'bSxuXQCEC7' }
];

function pickVideoList() {
  const now = new Date();
  const m = now.getMonth();  // 0=Jan, 9=Oct, 10=Nov, 11=Dec
  const d = now.getDate();

  if (m === 9) return halloween_videos;

  if (m === 11) {
    if (d === 25) return [{ id: 'DtrIWQ8J9jw' }];
    return xmas_videos;
  }

  if ((m === 6 && d === 4) || (m === 4 && d === 25) || (m === 1 && d === 12) || (m === 10 && d === 11)) {
    return american_holiday_videos;
  }

  if (m === 10 && d >= 17 && d <= 31) {
    return [{ id: 'AORGKS6y_qI' }];
  }

  if (m === 0 && d === 1) {
    return [{ id: 'vdLuk2Agamk' }];
  }

  return regular_videos;
}
function loadRandomVideo() {
  const list = pickVideoList();
  const index = Math.floor(Math.random() * list.length);
  const video = list[index];
  const html = '<iframe src="https://www.youtube.com/embed/' + video.id + '?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  const slot = document.querySelector('.video');
  if (slot) slot.innerHTML = html;
}

// ---------- BOOTSTRAP ----------
(function boot() {
  try { updateNYTime(); setInterval(updateNYTime, 1000 * 30); } catch (e) {}
  try { loadWeather(); } catch (e) {}
  try { loadBitcoinPrice(); } catch (e) {}
  try { loadStocks(); } catch (e) {}
  try { buildSportsScores(); } catch (e) {}
  try { loadRandomVideo(); } catch (e) {}
})();
