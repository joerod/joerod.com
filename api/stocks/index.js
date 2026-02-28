const https = require("https");

const SYMBOLS = ["AAPL", "AMZN", "TSLA", "MSFT"];
const NAME_MAP = {
  AAPL: "Apple",
  AMZN: "Amazon",
  TSLA: "Tesla",
  MSFT: "Microsoft"
};
const ORDER = ["Apple", "Amazon", "Tesla", "Microsoft"];

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

async function fetchYahooRows() {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(SYMBOLS.join(","))}`;
  const text = await fetchText(url);
  const parsed = JSON.parse(text);
  const result = (parsed && parsed.quoteResponse && parsed.quoteResponse.result) || [];
  const bySymbol = new Map(result.map((q) => [q.symbol, q]));
  const rows = [];
  for (const symbol of SYMBOLS) {
    const q = bySymbol.get(symbol);
    if (!q) continue;
    const price = Number.isFinite(q.regularMarketPrice) ? q.regularMarketPrice : null;
    const changePercent = Number.isFinite(q.regularMarketChangePercent) ? q.regularMarketChangePercent : null;
    rows.push({
      name: NAME_MAP[symbol],
      price,
      changePercent
    });
  }
  return rows;
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
    // Primary: Yahoo bulk quote endpoint (more reliable than per-symbol CSV scraping).
    let rows = [];
    try {
      rows = await fetchYahooRows();
    } catch (e) {
      context.log("stocks yahoo fallback", e);
    }

    // Fallback: Stooq per-symbol if Yahoo failed or returned partial.
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
