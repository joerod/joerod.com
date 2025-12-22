// ===== admin.js =====
async function fetchJson(url) {
  const res = await fetch(url, { credentials: "include" });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) ? (data.error || data.message) : text || res.statusText;
    throw new Error(msg);
  }
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
