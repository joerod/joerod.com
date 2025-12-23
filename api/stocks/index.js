const https = require("https");

const SYMBOLS = ["AAPL", "AMZN", "TSLA", "MSFT"];
const NAME_MAP = {
  AAPL: "Apple",
  AMZN: "Amazon",
  TSLA: "Tesla",
  MSFT: "Microsoft"
};
const ORDER = ["Apple", "Amazon", "Tesla", "Microsoft"];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "user-agent": "Mozilla/5.0" } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
  });
}

module.exports = async function (context, req) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      SYMBOLS.join(",")
    )}`;
    const data = await fetchJson(url);
    const results =
      data && data.quoteResponse && Array.isArray(data.quoteResponse.result)
        ? data.quoteResponse.result
        : [];

    const rows = results
      .filter((x) => NAME_MAP[x.symbol])
      .map((x) => ({
        name: NAME_MAP[x.symbol],
        price: x.regularMarketPrice ?? x.postMarketPrice ?? x.preMarketPrice ?? null,
        changePercent:
          x.regularMarketChangePercent != null
            ? parseFloat(x.regularMarketChangePercent)
            : null
      }))
      .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));

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
