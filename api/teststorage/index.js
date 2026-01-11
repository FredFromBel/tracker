const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) {
      context.res = { status: 500, body: { ok: false, error: "Missing AZURE_STORAGE_CONNECTION_STRING" } };
      return;
    }

    const tableName = "DailyCheckins";
    const client = TableClient.fromConnectionString(conn, tableName);

    // test entity
    const partitionKey = "u_test";
    const rowKey = "ping";
    const entity = {
      partitionKey,
      rowKey,
      Date: new Date().toISOString().slice(0, 10),
      UpdatedAtUtc: new Date().toISOString()
    };

    // Upsert (create or replace)
    await client.upsertEntity(entity, "Replace");

    // Read back
    const read = await client.getEntity(partitionKey, rowKey);

    context.res = { status: 200, headers: { "Content-Type": "application/json" }, body: { ok: true, read } };
  } catch (e) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, error: e.message || String(e) }
    };
  }
};
