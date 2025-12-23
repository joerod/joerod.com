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

function normalizeIp(value) {
  if (!value) return value;
  const ip = String(value).trim();
  if (!ip) return ip;
  if (ip.startsWith("[") && ip.includes("]")) {
    return ip.slice(1, ip.indexOf("]"));
  }
  if (/^\\d{1,3}(?:\\.\\d{1,3}){3}:\\d+$/.test(ip)) {
    return ip.slice(0, ip.lastIndexOf(":"));
  }
  return ip;
}

module.exports = async function (context, req) {
  try {
    const { container } = getCosmos();

    const rows = await queryAll(
      container,
      "SELECT c.ip, c.country, c.region, c.city, c.ts FROM c WHERE c.type = @t AND IS_DEFINED(c.ip)",
      [{ name: "@t", value: "visit" }]
    );

    const byIp = new Map();
    for (const r of rows) {
      const ip = normalizeIp(r.ip);
      if (!ip) continue;

      const cur = byIp.get(ip) || {
        ip,
        visits: 0,
        lastSeenUtc: null,
        country: r.country || null,
        region: r.region || null,
        city: r.city || null
      };

      cur.visits += 1;
      if (!cur.lastSeenUtc || (r.ts && r.ts > cur.lastSeenUtc)) cur.lastSeenUtc = r.ts;

      cur.country = cur.country || r.country || null;
      cur.region = cur.region || r.region || null;
      cur.city = cur.city || r.city || null;

      byIp.set(ip, cur);
    }

    const locations = Array.from(byIp.values())
      .sort((a, b) => (b.visits - a.visits))
      .slice(0, 25)
      .map(x => ({
        ip: x.ip,
        visits: x.visits,
        lastSeenUtc: x.lastSeenUtc,
        geo: [x.city, x.region, x.country].filter(Boolean).join(", ") || "—"
      }));

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, locations }
    };
  } catch (e) {
    context.log("locations error", e);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { ok: false, error: String(e.message || e) }
    };
  }
};
