const fs = require("node:fs/promises");
const path = require("node:path");
const { fetchStocks } = require("../api/_stock-quotes");

async function main() {
  const snapshot = await fetchStocks();
  const destination = path.join(__dirname, "..", "stocks.json");
  await fs.writeFile(destination, `${JSON.stringify(snapshot, null, 2)}\n`);
  process.stdout.write(`Wrote ${snapshot.rows.length} stock quotes to stocks.json\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
