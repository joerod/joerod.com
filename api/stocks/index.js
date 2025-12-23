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
    const req = https.get(url, (res) => {
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
    req.on("error", reject);
  });
}

module.exports = async function (context, req) {
  try {
    const symbols = SYMBOLS.map((s) => `${s}.US`).join(",");
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbols)}&f=sd2t2ohlc&h&e=csv`;
    const csv = await fetchText(url);
    const lines = csv.trim().split("\n");
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length < 7) continue;
      const symbol = (parts[0] || "").replace(".US", "").toUpperCase();
      if (!NAME_MAP[symbol]) continue;
      const open = parseFloat(parts[4]);
      const close = parseFloat(parts[6]);
      const price = Number.isFinite(close) ? close : null;
      const changePercent = Number.isFinite(open) && open
        ? ((close - open) / open) * 100
        : null;
      rows.push({
        name: NAME_MAP[symbol],
        price,
        changePercent: Number.isFinite(changePercent) ? changePercent : null
      });
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
      status: 500,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e) }
    };
  }
};
