const { getCosmos } = require("../_shared");

function cleanVideoId(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const idMatch = text.match(/[a-zA-Z0-9_-]{6,}/);
  return idMatch ? idMatch[0] : null;
}

function normalizeVideos(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const id = cleanVideoId(item && (item.id || item.url || item));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id });
  }
  return out;
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = async function (context, req) {
  try {
    const { container } = getCosmos();
    const { resource } = await container.item("config", "config").read();
    const existing = resource || { id: "config", pk: "config" };

    if (req.method && req.method.toLowerCase() === "post") {
      const body = readBody(req);
      const stocksKey = body.stocksKey ? String(body.stocksKey).trim() : "";
      const videos = normalizeVideos(body.videos);

      if (stocksKey) {
        existing.stocks = Object.assign({}, existing.stocks, { fmpKey: stocksKey });
      }
      if (videos.length) {
        existing.youtube = Object.assign({}, existing.youtube, { videos });
      }

      await container.items.upsert(existing);

      context.res = {
        status: 200,
        headers: { "content-type": "application/json" },
        body: {
          ok: true,
          hasStocksKey: !!(existing.stocks && existing.stocks.fmpKey),
          videoCount: (existing.youtube && existing.youtube.videos || []).length
        }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: true,
        hasStocksKey: !!(existing.stocks && existing.stocks.fmpKey),
        videos: (existing.youtube && existing.youtube.videos || []).map(v => v.id)
      }
    };
  } catch (e) {
    context.log("config error", e);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e) }
    };
  }
};
