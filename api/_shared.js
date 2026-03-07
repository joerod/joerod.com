const crypto = require("crypto");

try {
  if (!global.crypto && crypto.webcrypto) {
    // Best-effort Web Crypto polyfill for older Node runtimes.
    global.crypto = crypto.webcrypto;
  }
} catch (_) {
  // Never fail module load on runtime-specific global mutations.
}

let _CosmosClient = null;
function getCosmosClientCtor() {
  if (_CosmosClient) return _CosmosClient;
  // Lazy load so a package/runtime mismatch doesn't crash every function at startup.
  const mod = require("@azure/cosmos");
  _CosmosClient = mod && mod.CosmosClient;
  if (!_CosmosClient) {
    throw new Error("Unable to load @azure/cosmos CosmosClient");
  }
  return _CosmosClient;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function getClientIp(req) {
  // Front Door / proxies usually provide X-Forwarded-For. Some setups also provide X-Azure-ClientIP.
  const xff = (req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"] || "").toString();
  if (xff) return xff.split(",")[0].trim();
  const xaci = (req.headers["x-azure-clientip"] || req.headers["X-Azure-ClientIP"] || "").toString();
  if (xaci) return xaci.trim();
  return null;
}

function getCosmos() {
  const conn = requireEnv("db_connect");
  const CosmosClient = getCosmosClientCtor();
  const client = new CosmosClient(conn);
  const databaseId = process.env.COSMOS_DB_NAME || "joerod-com";
  const containerId = process.env.COSMOS_CONTAINER_NAME || "site-info";
  const container = client.database(databaseId).container(containerId);
  return { client, databaseId, containerId, container };
}

module.exports = { getCosmos, getClientIp };
