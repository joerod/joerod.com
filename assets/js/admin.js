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
    tr.appendChild(td(r.sessionId || "â€”"));
    tr.appendChild(td(String(r.visits ?? "â€”")));
    tr.appendChild(td(r.lastSeenUtc || "â€”"));
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
    tr.appendChild(td(r.ip || "â€”"));
    tr.appendChild(td(String(r.visits ?? "â€”")));
    tr.appendChild(td(r.geo || "â€”"));
    body.appendChild(tr);
  }
}

function setConfigStatus(msg, ok = true) {
  const el = document.getElementById("stocks-key-status");
  if (!el) return;
  el.textContent = msg;
  el.className = ok ? "ok" : "error";
}

async function loadConfig() {
  try {
    const data = await fetchJson("/api/config");
    const hasKey = !!data.hasStocksKey;
    const keyStatus = hasKey ? "Key is set" : "Not set";
    setConfigStatus(keyStatus, hasKey);
    const list = Array.isArray(data.videos) ? data.videos : [];
    const textarea = document.getElementById("youtube-list");
    if (textarea) textarea.value = list.join("\n");
    const count = document.getElementById("youtube-count");
    if (count) count.textContent = `${list.length} videos`;
  } catch (e) {
    setConfigStatus("Unable to load config", false);
  }
}

async function saveConfig() {
  const keyInput = document.getElementById("stocks-key");
  const listInput = document.getElementById("youtube-list");
  const stocksKey = keyInput ? keyInput.value.trim() : "";
  const videos = (listInput ? listInput.value.split("\n") : [])
    .map((v) => v.trim())
    .filter(Boolean);

  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stocksKey, videos })
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) ? (data.error || data.message) : (text || res.statusText);
      throw new Error(msg);
    }
    const count = document.getElementById("youtube-count");
    if (count) count.textContent = `${(data && data.videoCount) || 0} videos`;
    setConfigStatus((data && data.hasStocksKey) ? "Key is set" : "Not set", !!(data && data.hasStocksKey));
    if (keyInput) keyInput.value = "";
    setStatus("Settings saved.", true);
  } catch (e) {
    setStatus("Error: " + e.message, false);
  }
}

async function refresh() {
  setStatus("Loading...", true);
  try {
    const summary = await fetchJson("/api/summary");
    const el = document.getElementById("ping-status");
    if (el) el.textContent = "OK";
    document.getElementById("kpi-total").textContent = summary.totalVisits ?? "â€”";
    document.getElementById("kpi-unique").textContent = summary.uniqueSessions ?? "â€”";
    document.getElementById("kpi-24h").textContent = summary.visitsLast24h ?? "â€”";
    document.getElementById("kpi-unique-24h").textContent = summary.uniqueSessions24h ?? "â€”";
    document.getElementById("kpi-unique-7d").textContent = summary.uniqueSessions7d ?? "â€”";
    document.getElementById("kpi-unique-30d").textContent = summary.uniqueSessions30d ?? "â€”";
    renderVisitors(summary.topSessions || summary.sessions || []);
    const loc = await fetchJson("/api/locations");
    renderLocations(loc.locations || loc.topIPs || []);
    await loadConfig();
    setStatus("Loaded.", true);
  } catch (e) {
    const el = document.getElementById("ping-status");
    if (el) el.textContent = "Error";
    setStatus("Error: " + e.message, false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("refresh").addEventListener("click", refresh);
  const save = document.getElementById("save-config");
  if (save) save.addEventListener("click", saveConfig);
  refresh();
});
