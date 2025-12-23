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

    // Unique sessions (distinct sessionId)
    const sessions = await queryAll(
      container,
      "SELECT DISTINCT VALUE c.sessionId FROM c WHERE c.type = @t AND IS_DEFINED(c.sessionId)",
      [{ name: "@t", value: "visit" }]
    );
    const uniqueSessions = sessions.length;

    // Top sessions: count visits per sessionId, and lastSeenUtc
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
      body: { ok: true, totalVisits, visitsLast24h, uniqueSessions, topSessions }
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
