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

    const rows = await queryAll(
      container,
      "SELECT c.ip, c.ts FROM c WHERE c.type = @t AND IS_DEFINED(c.ip)",
      [{ name: "@t", value: "visit" }]
    );

    const byIp = new Map();
    for (const r of rows) {
      const ip = r.ip;
      if (!ip) continue;
      const cur = byIp.get(ip) || { ip, visits: 0, lastSeenUtc: null };
      cur.visits += 1;
      if (!cur.lastSeenUtc || (r.ts && r.ts > cur.lastSeenUtc)) cur.lastSeenUtc = r.ts;
      byIp.set(ip, cur);
    }

    const top = Array.from(byIp.values())
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 25);

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, locations: top }
    };
  } catch (e) {
    context.log("admin-locations error", e);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e) }
    };
  }
};
