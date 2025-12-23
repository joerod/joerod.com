const { getCosmos } = require("../_shared");

module.exports = async function (context, req) {
  try {
    const { container } = getCosmos();
    const { resource } = await container.item("config", "config").read();
    const videos = (resource && resource.youtube && resource.youtube.videos) || [];

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, youtube: { videos } }
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
