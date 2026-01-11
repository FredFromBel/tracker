const { TableClient } = require("@azure/data-tables");

function yyyymmdd(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function getUserPartitionKey(req) {
  const header = req.headers["x-ms-client-principal"] || req.headers["X-MS-CLIENT-PRINCIPAL"];
  if (!header) return null;
  const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  const userId = decoded?.userId;
  if (!userId) return null;
  return `u_${userId}`;
}

module.exports = async function (context, req) {
  try {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) {
      context.res = { status: 500, body: { ok: false, error: "Missing AZURE_STORAGE_CONNECTION_STRING" } };
      return;
    }

    const pk = getUserPartitionKey(req);
    if (!pk) {
      context.res = { status: 401, body: { ok: false, error: "Unauthorized (missing client principal)" } };
      return;
    }

    const b = req.body || {};
    const date = b.date; // "YYYY-MM-DD"
    if (!date) {
      context.res = { status: 400, body: { ok: false, error: "Missing required field: date" } };
      return;
    }

    const rk = yyyymmdd(date);
    if (!rk) {
      context.res = { status: 400, body: { ok: false, error: "Invalid date. Use YYYY-MM-DD." } };
      return;
    }

    const client = TableClient.fromConnectionString(conn, "DailyCheckins");

    const entity = {
      partitionKey: pk,
      rowKey: rk,
      Date: date,
      WeightKg: Number(b.weightKg ?? 0),
      Fasting231: Boolean(b.fasting231 ?? false),
      PushUps: Number(b.pushUps ?? 0),
      Squats: Number(b.squats ?? 0),
      BarbellRows: Number(b.barbellRows ?? 0),
      RowerMin: Number(b.rowerMin ?? 0),
      Strength: Boolean(b.strength ?? false),
      MealNotes: String(b.mealNotes ?? ""),
      SleepPct: Number(b.sleepPct ?? 0),
      EnergyScore: Number(b.energyScore ?? 0),
      StressScore: Number(b.stressScore ?? 0),
      DayScore: Number(b.dayScore ?? 0),
      Notes: String(b.notes ?? ""),
      UpdatedAtUtc: new Date().toISOString()
    };

    await client.upsertEntity(entity, "Replace");

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, partitionKey: pk, rowKey: rk }
    };
  } catch (e) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, error: e.message || String(e) }
    };
  }
};
