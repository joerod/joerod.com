const https = require("https");

const SYMBOLS = ["AMD", "AMZN", "GOOGL", "MSFT", "NVDA", "SMCI", "TSLA"];
const NAME_MAP = {
  AMD: "AMD",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  NVDA: "NVIDIA",
  SMCI: "Super Micro",
  TSLA: "Tesla",
  MSFT: "Microsoft"
};
const ORDER = ["AMD", "Amazon", "Alphabet", "Microsoft", "NVIDIA", "Super Micro", "Tesla"];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "user-agent": "Mozilla/5.0" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        resolve(body);
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[%(),\s]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchFMPRows() {
  const apiKey = (process.env.FMP_KEY || "").trim();
  if (!apiKey) throw new Error("Missing FMP_KEY");
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(SYMBOLS.join(","))}?apikey=${encodeURIComponent(apiKey)}`;
  const text = await fetchText(url);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected FMP response");
  }
  const bySymbol = new Map(parsed.map((q) => [q.symbol, q]));
  const rows = [];
  for (const symbol of SYMBOLS) {
    const q = bySymbol.get(symbol);
    if (!q) continue;
    const price = toNumber(q.price);
    const changePercent = toNumber(q.changesPercentage);
    rows.push({
      name: NAME_MAP[symbol],
      price,
      changePercent
    });
  }
  return rows;
}

async function fetchYahooRows() {
  const rows = await Promise.all(SYMBOLS.map(async (symbol) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const text = await fetchText(url);
    const parsed = JSON.parse(text);
    const result = parsed && parsed.chart && parsed.chart.result && parsed.chart.result[0];
    const meta = result && result.meta;
    if (!meta || !result) return null;

    const price = toNumber(meta.regularMarketPrice);
    const closes = (((result.indicators || {}).quote || [])[0] || {}).close || [];
    const validCloses = closes.map(toNumber).filter((v) => v != null);
    const prevClose = validCloses.length >= 2 ? validCloses[validCloses.length - 2] : null;
    const changePercent = (price != null && prevClose != null && prevClose !== 0)
      ? ((price - prevClose) / prevClose) * 100
      : null;

    return {
      name: NAME_MAP[symbol],
      price,
      changePercent
    };
  }));
  return rows.filter(Boolean);
}

function parseStooqRow(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return null;
  const parts = lines[1].split(",");
  if (parts.length < 7) return null;
  const open = parts[4] === "N/D" ? null : parseFloat(parts[4]);
  const close = parts[6] === "N/D" ? null : parseFloat(parts[6]);
  const price = Number.isFinite(close) ? close : null;
  const changePercent = Number.isFinite(open) && open
    ? ((close - open) / open) * 100
    : null;
  return {
    price,
    changePercent: Number.isFinite(changePercent) ? changePercent : null
  };
}

module.exports = async function (context, req) {
  const emptyRows = ORDER.map((name) => ({ name, price: null, changePercent: null }));
  try {
    // Primary: Financial Modeling Prep with the site API key for actual quote/change data.
    let rows = [];
    try {
      rows = await fetchFMPRows();
    } catch (e) {
      context.log("stocks fmp fallback", e);
    }

    // Secondary: Yahoo bulk quote endpoint.
    if (rows.length < SYMBOLS.length) {
      try {
        rows = await fetchYahooRows();
      } catch (e) {
        context.log("stocks yahoo fallback", e);
      }
    }

    // Fallback: Stooq per-symbol if FMP/Yahoo failed or returned partial.
    if (rows.length < SYMBOLS.length) {
      const byName = new Map(rows.map((r) => [r.name, r]));
      for (const symbol of SYMBOLS) {
        const name = NAME_MAP[symbol];
        if (byName.has(name)) continue;
        try {
          const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}.US&f=sd2t2ohlc&h&e=csv`;
          const csv = await fetchText(url);
          const data = parseStooqRow(csv) || { price: null, changePercent: null };
          byName.set(name, { name, price: data.price, changePercent: data.changePercent });
        } catch (e) {
          byName.set(name, { name, price: null, changePercent: null });
        }
      }
      rows = Array.from(byName.values());
    }

    rows.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, rows }
    };
  } catch (e) {
    context.log("stocks error", e);
    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e), rows: emptyRows }
    };
  }
};
