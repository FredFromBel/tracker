const { TableClient } = require("@azure/data-tables");

// Build RowKey range: yyyyMMdd
function rk(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

module.exports = async function (context, req) {
  try {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) {
      context.res = { status: 500, body: { ok: false, error: "Missing AZURE_STORAGE_CONNECTION_STRING" } };
      return;
    }

    const days = Math.max(1, Math.min(60, Number(req.query.days ?? 7))); // clamp 1..60
    const pk = String(req.query.partitionKey ?? "u_test"); // for now (we harden later)

    const end = new Date(); // today UTC
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const startRk = rk(start);
    const endRk = rk(end);

    const client = TableClient.fromConnectionString(conn, "DailyCheckins");

    const filter = `PartitionKey eq '${pk}' and RowKey ge '${startRk}' and RowKey le '${endRk}'`;

    const items = [];
    for await (const e of client.listEntities({ queryOptions: { filter } })) {
      items.push(e);
    }

    // Sort descending by RowKey (latest first)
    items.sort((a, b) => (a.rowKey < b.rowKey ? 1 : a.rowKey > b.rowKey ? -1 : 0));

    context.res = { status: 200, headers: { "Content-Type": "application/json" }, body: { ok: true, days, partitionKey: pk, items } };
  } catch (e) {
    context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: { ok: false, error: e.message || String(e) } };
  }
};
