const { CosmosClient } = require("@azure/cosmos");

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
  const client = new CosmosClient(conn);
  const databaseId = process.env.COSMOS_DB_NAME || "joerod-com";
  const containerId = process.env.COSMOS_CONTAINER_NAME || "site-info";
  const container = client.database(databaseId).container(containerId);
  return { client, databaseId, containerId, container };
}

module.exports = { getCosmos, getClientIp };
