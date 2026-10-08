const SYMBOLS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "MSFT", name: "Microsoft" }
];

function parseQuoteValue(value) {
  const parsed = Number(String(value || "").replace(/[,$%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchQuote({ symbol, name }) {
  const url = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "user-agent": "Mozilla/5.0 (compatible; joerod.com/1.0)"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`${symbol} quote returned HTTP ${response.status}`);

  const result = await response.json();
  const primary = result && result.data && result.data.primaryData;
  const price = primary && parseQuoteValue(primary.lastSalePrice);
  const changePercent = primary && parseQuoteValue(primary.percentageChange);
  if (price === null || changePercent === null) throw new Error(`${symbol} quote is incomplete`);
  return { name, symbol, price, changePercent };
}

async function fetchStocks() {
  const settled = await Promise.allSettled(SYMBOLS.map(fetchQuote));
  const rows = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (rows.length !== SYMBOLS.length) {
    const failures = settled
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason.message);
    throw new Error(failures.join("; ") || "One or more quotes were unavailable");
  }
  return { ok: true, updatedAt: new Date().toISOString(), rows };
}

module.exports = { fetchStocks };
