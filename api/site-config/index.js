const { getCosmos } = require("../_shared");
const { DEFAULT_BY_CATEGORY } = require("../_video-defaults");

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
    const videos = (resource && resource.youtube && resource.youtube.videos) || [];
    const byCategory = { halloween: [], xmas: [], holiday: [], regular: [] };

    for (const v of videos) {
      if (!v || !v.id) continue;
      const cat = (v.category && byCategory[v.category]) ? v.category : "regular";
      byCategory[cat].push({ id: v.id });
    }

    const finalByCategory = {};
    Object.keys(DEFAULT_BY_CATEGORY).forEach((cat) => {
      finalByCategory[cat] = byCategory[cat].length ? byCategory[cat] : DEFAULT_BY_CATEGORY[cat];
    });

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: true,
        youtube: { byCategory: finalByCategory },
        overrides: (resource && resource.overrides) || { fireworks: "auto", snow: "auto" }
      }
    };
  } catch (e) {
    context.log("site-config error", e);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e) }
    };
  }
};
