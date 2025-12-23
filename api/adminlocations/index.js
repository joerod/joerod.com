const https = require("https");
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

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.setTimeout(2500, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", () => resolve(null));
  });
}

async function fetchGeo(ip) {
  if (!ip || isPrivateIp(ip)) return null;
  const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!data || data.error) return null;
  return {
    country: data.country_name || null,
    region: data.region || null,
    city: data.city || null
  };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
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
        city: x.city || null,
        region: x.region || null,
        country: x.country || null
      }));

    const missingGeo = locations
      .map((x, idx) => ({ idx, ip: x.ip, hasGeo: x.city || x.region || x.country }))
      .filter(x => !x.hasGeo)
      .slice(0, 10);

    if (missingGeo.length) {
      await mapLimit(missingGeo, 3, async (item) => {
        try {
          const geo = await fetchGeo(item.ip);
          if (!geo) return;
          locations[item.idx].city = locations[item.idx].city || geo.city;
          locations[item.idx].region = locations[item.idx].region || geo.region;
          locations[item.idx].country = locations[item.idx].country || geo.country;
        } catch (_) {
          return;
        }
      });
    }

    const rows = locations.map((x) => ({
      ip: x.ip,
      visits: x.visits,
      lastSeenUtc: x.lastSeenUtc,
      geo: [x.city, x.region, x.country].filter(Boolean).join(", ") || "—"
    }));

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, locations: rows }
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
