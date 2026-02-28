const { getCosmos } = require("../_shared");
const { DEFAULT_BY_CATEGORY, flattenDefaultVideos } = require("../_video-defaults");

function cleanVideoId(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  // Already an 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  // Common YouTube URL formats:
  // - youtube.com/watch?v=VIDEO_ID
  // - youtu.be/VIDEO_ID
  // - youtube.com/shorts/VIDEO_ID
  // - youtube.com/embed/VIDEO_ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  for (const rx of patterns) {
    const m = text.match(rx);
    if (m && m[1]) return m[1];
  }
  return null;
}

function normalizeCategory(raw) {
  const val = String(raw || "").toLowerCase().trim();
  if (val === "halloween" || val === "xmas" || val === "holiday" || val === "regular") {
    return val;
  }
  return "regular";
}

function normalizeVideos(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const id = cleanVideoId(item && (item.id || item.url || item));
    const category = normalizeCategory(item && item.category);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, category });
  }
  return out;
}

function normalizeOverride(raw) {
  const val = String(raw || "").toLowerCase().trim();
  if (val === "on" || val === "off" || val === "auto") return val;
  return "auto";
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
    let resource = null;
    try {
      const res = await container.item("config", "config").read();
      resource = res && res.resource;
    } catch (e) {
      resource = null;
    }
    const existing = resource || { id: "config", pk: "config" };

    if (req.method && req.method.toLowerCase() === "post") {
      const body = readBody(req);
      const stocksKey = body.stocksKey ? String(body.stocksKey).trim() : "";
      const hasVideos = Object.prototype.hasOwnProperty.call(body, "videos");
      const videos = normalizeVideos(body.videos);
      const overrides = body.overrides || {};
      const normalizedOverrides = {
        fireworks: normalizeOverride(overrides.fireworks),
        snow: normalizeOverride(overrides.snow)
      };

      if (stocksKey) {
        existing.stocks = Object.assign({}, existing.stocks, { fmpKey: stocksKey });
      }
      if (hasVideos) {
        existing.youtube = Object.assign({}, existing.youtube, { videos });
      }
      existing.overrides = Object.assign({}, existing.overrides, normalizedOverrides);

      await container.items.upsert(existing);

      context.res = {
        status: 200,
        headers: { "content-type": "application/json" },
      body: {
        ok: true,
        hasStocksKey: !!(existing.stocks && existing.stocks.fmpKey),
        stocksKeyLast4: (existing.stocks && existing.stocks.fmpKey)
          ? String(existing.stocks.fmpKey).slice(-4)
          : null,
        videoCount: (existing.youtube && existing.youtube.videos || []).length,
        overrides: existing.overrides || { fireworks: "auto", snow: "auto" }
      }
      };
      return;
    }

    const customVideos = (existing.youtube && existing.youtube.videos) || [];
    const usingDefaults = !customVideos.length;
    const videos = usingDefaults ? flattenDefaultVideos() : customVideos;

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: true,
        hasStocksKey: !!(existing.stocks && existing.stocks.fmpKey),
        stocksKeyLast4: (existing.stocks && existing.stocks.fmpKey)
          ? String(existing.stocks.fmpKey).slice(-4)
          : null,
        usingDefaults,
        videos,
        defaultVideos: flattenDefaultVideos(),
        overrides: existing.overrides || { fireworks: "auto", snow: "auto" }
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
