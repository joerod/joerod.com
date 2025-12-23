const { getCosmos } = require("../_shared");

async function queryAll(container, query, parameters = []) {
  const it = container.items.query({ query, parameters });
  const out = [];
  while (true) {
    const { resources } = await it.fetchNext();
    if (!resources || !resources.length) break;
    out.push(...resources);
  }
  return out;
}

module.exports = async function (context, req) {
  try {
    const { container } = getCosmos();

    // Total visits
    const totalRes = await container.items.query({
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.type = @t",
      parameters: [{ name: "@t", value: "visit" }]
    }).fetchAll();
    const totalVisits = (totalRes.resources && totalRes.resources[0]) || 0;

    // Visits last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24Res = await container.items.query({
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.type = @t AND c.ts >= @since",
      parameters: [{ name: "@t", value: "visit" }, { name: "@since", value: since }]
    }).fetchAll();
    const visitsLast24h = (last24Res.resources && last24Res.resources[0]) || 0;

    // Unique sessions
    const sessions = await queryAll(
      container,
      "SELECT DISTINCT VALUE c.sessionId FROM c WHERE c.type = @t AND IS_DEFINED(c.sessionId)",
      [{ name: "@t", value: "visit" }]
    );
    const uniqueSessions = sessions.length;

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, totalVisits, visitsLast24h, uniqueSessions }
    };
  } catch (e) {
    context.log("admin-summary error", e);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e) }
    };
  }
};
