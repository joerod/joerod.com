const https = require("https");
const { getCosmos } = require("../_shared");

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
    https
      .get(url, (res) => {
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
      })
      .on("error", reject);
  });
}

module.exports = async function (context, req) {
  try {
    const { container } = getCosmos();
    const { resource } = await container.item("config", "config").read();
    const fmpKey =
      process.env.FMP_KEY ||
      (resource && resource.stocks && resource.stocks.fmpKey) ||
      (resource && resource.fmpKey) ||
      "demo";

    const url = `https://financialmodelingprep.com/api/v3/quote/${SYMBOLS.join(
      ","
    )}?apikey=${encodeURIComponent(fmpKey)}`;
    const data = await fetchJson(url);

    const rows = (Array.isArray(data) ? data : [])
      .filter((x) => NAME_MAP[x.symbol])
      .map((x) => ({
        name: NAME_MAP[x.symbol],
        price: x.price ?? x.previousClose ?? x.prevClose ?? null,
        changePercent:
          x.changesPercentage != null ? parseFloat(x.changesPercentage) : null
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
