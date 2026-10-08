const { fetchStocks } = require("../_stock-quotes");

module.exports = async function (context) {
  try {
    context.res = {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: await fetchStocks()
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
