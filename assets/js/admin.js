// ===== admin.js =====
async function fetchJson(url) {
  const res = await fetch(url, {
    // Static Web Apps auth is cookie-based, include cookies so admin APIs work.
    credentials: "include"
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  // If we got HTML, it usually means one of:
  // - you are not signed in (SWA returned the login page)
  // - /api functions didn't deploy (SWA returned your index.html)
  // - you're signed in but not in the 'admin' role (SWA returned 403 page)
  if (text && text.trimStart().startsWith("<!DOCTYPE")) {
    const hint = "Got HTML instead of JSON. This usually means you're not signed in, you're not in the 'admin' role, or your /api functions did not deploy (check your GitHub Action api_location=api).";
    throw new Error(hint);
  }

  let data = null;
  if (text && (contentType.includes("application/json") || text.trimStart().startsWith("{"))) {
    try { data = JSON.parse(text); } catch {}
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message))
      ? (data.error || data.message)
      : (text || res.statusText);
    throw new Error(`HTTP ${res.status} from ${url}: ${msg}`);
  }

  // If it's empty but ok, return null
  return data;
}

function setStatus(msg, ok = true) {
  const el = document.getElementById("status");
  el.className = ok ? "ok" : "error";
  el.textContent = msg;
}

function td(text){ const el=document.createElement("td"); el.textContent = text; return el; }

function renderVisitors(rows) {
  const body = document.getElementById("visitors-body");
  body.innerHTML = "";
  if (!rows || !rows.length) {
    const tr=document.createElement("tr");
    const cell=document.createElement("td");
    cell.colSpan=3;
    cell.className="muted";
    cell.textContent="No data yet. Your home page will start logging once /api/track is live.";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }
  for (const r of rows) {
    const tr=document.createElement("tr");
    tr.appendChild(td(r.sessionId || "—"));
    tr.appendChild(td(String(r.visits ?? "—")));
    tr.appendChild(td(r.lastSeenUtc || "—"));
    body.appendChild(tr);
  }
}

function renderLocations(rows) {
  const body = document.getElementById("locations-body");
  body.innerHTML = "";
  if (!rows || !rows.length) {
    const tr=document.createElement("tr");
    const cell=document.createElement("td");
    cell.colSpan=3;
    cell.className="muted";
    cell.textContent="No data yet.";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }
  for (const r of rows) {
    const tr=document.createElement("tr");
    tr.appendChild(td(r.ip || "—"));
    tr.appendChild(td(String(r.visits ?? "—")));
    tr.appendChild(td(r.geo || "—"));
    body.appendChild(tr);
  }
}

async function refresh() {
  setStatus("Loading...", true);
  try {
    // Basic health check for API + presence of db_connect (does not reveal secret)
    try {
      const ping = await fetchJson("/api/ping");
      const el = document.getElementById("ping-status");
      if (el) el.textContent = (ping && ping.hasDbConnect) ? "OK, db_connect is set" : "API reachable, but db_connect is missing";
    } catch (e) {
      const el = document.getElementById("ping-status");
      if (el) el.textContent = "API not reachable";
    }
    const summary = await fetchJson("/api/admin/summary");
    document.getElementById("kpi-total").textContent = summary.totalVisits ?? "—";
    document.getElementById("kpi-unique").textContent = summary.uniqueSessions ?? "—";
    document.getElementById("kpi-24h").textContent = summary.visitsLast24h ?? "—";
    renderVisitors(summary.topSessions || []);
    const loc = await fetchJson("/api/admin/locations");
    renderLocations(loc.topIPs || []);
    setStatus("Loaded.", true);
  } catch (e) {
    setStatus("Error: " + e.message, false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("refresh").addEventListener("click", refresh);
  refresh();
});
