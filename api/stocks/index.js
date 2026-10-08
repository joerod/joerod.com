const { readSiteConfig } = require("../_config-store");

const SYMBOLS = ["AAPL", "AMZN", "TSLA", "MSFT"];
const NAME_MAP = { AAPL: "Apple", AMZN: "Amazon", TSLA: "Tesla", MSFT: "Microsoft" };
const ORDER = ["Apple", "Amazon", "Tesla", "Microsoft"];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "joerod.com stock dashboard" },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return response.json();
}

async function fetchFmpRows(apiKey) {
  const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(SYMBOLS.join(","))}&apikey=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  const bySymbol = new Map((Array.isArray(data) ? data : []).map((quote) => [quote.symbol, quote]));
  return SYMBOLS.flatMap((symbol) => {
    const quote = bySymbol.get(symbol);
    const price = Number(quote && quote.price);
    if (!Number.isFinite(price)) return [];
    const changePercent = Number(quote.changePercentage);
    return [{ name: NAME_MAP[symbol], price, changePercent: Number.isFinite(changePercent) ? changePercent : null }];
  });
}

async function fetchYahooRow(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`;
  const data = await fetchJson(url);
  const result = data && data.chart && data.chart.result && data.chart.result[0];
  const price = Number(result && result.meta.regularMarketPrice);
  const previous = Number(result && (result.meta.chartPreviousClose || result.meta.previousClose));
  if (!Number.isFinite(price)) throw new Error(`No quote for ${symbol}`);
  return {
    name: NAME_MAP[symbol],
    price,
    changePercent: Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null
  };
}

module.exports = async function (context) {
  try {
    const loaded = await readSiteConfig();
    const apiKey = loaded && loaded.config && loaded.config.stocks && loaded.config.stocks.fmpKey;
    let rows = [];
    const failures = [];

    if (apiKey) {
      try { rows = await fetchFmpRows(apiKey); }
      catch (error) { failures.push(`FMP: ${error.message}`); }
    }

    if (rows.length < SYMBOLS.length) {
      const byName = new Map(rows.map((row) => [row.name, row]));
      for (const symbol of SYMBOLS) {
        if (byName.has(NAME_MAP[symbol])) continue;
        try { byName.set(NAME_MAP[symbol], await fetchYahooRow(symbol)); }
        catch (error) { failures.push(`${symbol}: ${error.message}`); }
      }
      rows = Array.from(byName.values());
    }

    if (rows.length !== SYMBOLS.length) throw new Error(failures.join("; ") || "No quote data returned");
    rows.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
    context.res = {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: { ok: true, rows }
    };
  } catch (error) {
    context.log("stocks error", error);
    context.res = {
      status: 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: { ok: false, error: String(error.message || error) }
    };
  }
};
