const { TableClient } = require("@azure/data-tables");

// Helper: yyyyMMdd
function yyyymmdd(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

module.exports = async function (context, req) {
  try {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) {
      context.res = { status: 500, body: { ok: false, error: "Missing AZURE_STORAGE_CONNECTION_STRING" } };
      return;
    }

    // Body expected (JSON)
    const b = req.body || {};
    const date = b.date; // "YYYY-MM-DD"
    const pk = b.partitionKey; // e.g. "u_<yourObjectId>" (we will harden later)
    if (!date || !pk) {
      context.res = { status: 400, body: { ok: false, error: "Missing required fields: date, partitionKey" } };
      return;
    }

    const rk = yyyymmdd(date);
    if (!rk) {
      context.res = { status: 400, body: { ok: false, error: "Invalid date. Use YYYY-MM-DD." } };
      return;
    }

    const client = TableClient.fromConnectionString(conn, "DailyCheckins");

    // Build entity (replace allowed = "écraser")
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
      SleepPct: Number(b.sleepPct ?? 0),     // MyAir 0-100
      EnergyScore: Number(b.energyScore ?? 0), // optional 1-5
      StressScore: Number(b.stressScore ?? 0), // optional 1-5
      DayScore: Number(b.dayScore ?? 0),       // 0-10
      Notes: String(b.notes ?? ""),
      UpdatedAtUtc: new Date().toISOString()
    };

    await client.upsertEntity(entity, "Replace");

    context.res = { status: 200, headers: { "Content-Type": "application/json" }, body: { ok: true, partitionKey: pk, rowKey: rk } };
  } catch (e) {
    context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: { ok: false, error: e.message || String(e) } };
  }
};
