const crypto = require("crypto");
const { getCosmos, getClientIp } = require("../_shared");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const sessionId = (body.sessionId || "").toString();
    if (!sessionId) {
      context.res = { status: 400, body: { error: "sessionId is required" } };
      return;
    }

    const ip = getClientIp(req);
    const ua = (req.headers["user-agent"] || "").toString();
    const referer = (req.headers["referer"] || "").toString();
    const path = (body.path || "").toString();

    const { container } = getCosmos();

    const now = new Date();
    const doc = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      type: "visit",
      sessionId,
      ip: ip || null,
      userAgent: ua || null,
      referer: referer || null,
      path: path || null,
      ts: now.toISOString()
    };

    await container.items.create(doc);
    context.res = { status: 204 };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: { error: "track_failed", message: e.message } };
  }
};
