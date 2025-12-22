module.exports = async function (context, req) {
  const db = process.env.COSMOS_DB_NAME || process.env.cosmos_db_name || 'joerod-com';
  const container = process.env.COSMOS_CONTAINER_NAME || process.env.cosmos_container_name || 'site-info';
  const hasConn = !!process.env.db_connect;

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      ok: true,
      hasDbConnect: hasConn,
      cosmosDbName: db,
      cosmosContainerName: container,
      note: hasConn ? 'db_connect is set (value hidden)' : 'db_connect is NOT set in Static Web App Configuration'
    }
  };
};
