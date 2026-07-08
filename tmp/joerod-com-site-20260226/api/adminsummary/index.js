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

async function distinctSessionsSince(container, sinceIso) {
  const rows = await queryAll(
    container,
    "SELECT DISTINCT VALUE c.sessionId FROM c WHERE c.type = @t AND IS_DEFINED(c.sessionId) AND c.ts >= @since",
    [{ name: "@t", value: "visit" }, { name: "@since", value: sinceIso }]
  );
  return rows.length;
}

module.exports = async function (context, req) {
  try {
    const { container } = getCosmos();

    const totalRes = await container.items.query({
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.type = @t",
      parameters: [{ name: "@t", value: "visit" }]
    }).fetchAll();
    const totalVisits = (totalRes.resources && totalRes.resources[0]) || 0;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24Res = await container.items.query({
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.type = @t AND c.ts >= @since",
      parameters: [{ name: "@t", value: "visit" }, { name: "@since", value: since }]
    }).fetchAll();
    const visitsLast24h = (last24Res.resources && last24Res.resources[0]) || 0;

    const sessions = await queryAll(
      container,
      "SELECT DISTINCT VALUE c.sessionId FROM c WHERE c.type = @t AND IS_DEFINED(c.sessionId)",
      [{ name: "@t", value: "visit" }]
    );
    const uniqueSessions = sessions.length;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const uniqueSessions24h = await distinctSessionsSince(container, since24h);
    const uniqueSessions7d = await distinctSessionsSince(container, since7d);
    const uniqueSessions30d = await distinctSessionsSince(container, since30d);

    const rows = await queryAll(
      container,
      "SELECT c.sessionId, c.ts FROM c WHERE c.type = @t AND IS_DEFINED(c.sessionId)",
      [{ name: "@t", value: "visit" }]
    );

    const bySession = new Map();
    for (const r of rows) {
      const sid = r.sessionId;
      if (!sid) continue;
      const cur = bySession.get(sid) || { sessionId: sid, visits: 0, lastSeenUtc: null };
      cur.visits += 1;
      if (!cur.lastSeenUtc || (r.ts && r.ts > cur.lastSeenUtc)) cur.lastSeenUtc = r.ts;
      bySession.set(sid, cur);
    }

    const topSessions = Array.from(bySession.values())
      .sort((a, b) => (b.visits - a.visits))
      .slice(0, 25);

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: true,
        totalVisits,
        visitsLast24h,
        uniqueSessions,
        uniqueSessions24h,
        uniqueSessions7d,
        uniqueSessions30d,
        topSessions
      }
    };
  } catch (e) {
    context.log("summary error", e);
    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: false,
        error: String(e.message || e),
        totalVisits: 0,
        visitsLast24h: 0,
        uniqueSessions: 0,
        uniqueSessions24h: 0,
        uniqueSessions7d: 0,
        uniqueSessions30d: 0,
        topSessions: []
      }
    };
  }
};
