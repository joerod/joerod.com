const { readSiteConfig, DEFAULT_CONFIG } = require("../_config-store");
const { DEFAULT_BY_CATEGORY, mergeVideosByCategory } = require("../_video-defaults");

module.exports = async function (context, req) {
  const fallbackBody = {
    ok: true,
    degraded: true,
    youtube: { byCategory: DEFAULT_BY_CATEGORY },
    overrides: { fireworks: "auto", snow: "auto" }
  };
  try {
    const loaded = await readSiteConfig();
    const resource = loaded && loaded.config ? loaded.config : DEFAULT_CONFIG;
    const videos = (resource && resource.youtube && resource.youtube.videos) || [];
    const finalByCategory = mergeVideosByCategory(videos);

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: true,
        degraded: false,
        youtube: { byCategory: finalByCategory },
        overrides: (resource && resource.overrides) || { fireworks: "auto", snow: "auto" }
      }
    };
  } catch (e) {
    context.log("site-config error", e);
    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ...fallbackBody,
        error: String((e && e.message) || e)
      }
    };
  }
};