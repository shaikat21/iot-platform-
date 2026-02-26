import { getBatchForCsv, manufactureBatch } from "../models/manufacturingModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// allow UUID v1–v8 (including v7)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v);
}

// Safe CSV escaping
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);

  // Escape if contains comma, quote or newline
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function asTrimmedString(v) {
  if (v == null) return "";
  return String(v).trim();
}

function isSafeCode(v, max = 32) {
  // Accept letters, digits, underscore, dash only.
  return typeof v === "string" && v.length > 0 && v.length <= max && /^[A-Za-z0-9_-]+$/.test(v);
}

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function parsePositiveInt(v, fallback) {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const MAX_BATCH_COUNT = 2000;

// POST /api/manufacturing/batch
export const manufactureBatchController = asyncHandler(async (req, res) => {
  const factory = asTrimmedString(req.body?.factory);
  const line = asTrimmedString(req.body?.line);
  const lotRaw = req.body?.lot;
  const prefix = asTrimmedString(req.body?.prefix || "MI");
  const count = parsePositiveInt(req.body?.count, 100);
  const metadata = req.body?.metadata;
  const notes = req.body?.notes ?? null;

  if (!isSafeCode(factory, 16)) return res.status(400).json({ error: "invalid_factory" });
  if (!isSafeCode(line, 16)) return res.status(400).json({ error: "invalid_line" });

  const lot = parsePositiveInt(lotRaw, null);
  if (lot == null || lot > 999999) return res.status(400).json({ error: "invalid_lot" });

  if (!isSafeCode(prefix, 8)) return res.status(400).json({ error: "invalid_prefix" });

  if (count == null || count > MAX_BATCH_COUNT) {
    return res.status(400).json({ error: "invalid_count", max: MAX_BATCH_COUNT });
  }

  if (metadata != null && !isPlainObject(metadata)) {
    return res.status(400).json({ error: "invalid_metadata" });
  }

  const result = await manufactureBatch({
    factory,
    line,
    lot,
    prefix,
    count,
    metadata: metadata ?? {},
    notes: notes == null ? null : String(notes).slice(0, 2000),
  });

  return res.status(201).json(result);
});

export async function downloadBatchCsvController(req, res) {
  const batchId = String(req.params?.id || "").trim();

  if (!batchId) {
    return res.status(400).json({ error: "batch id required" });
  }

  if (!isUuid(batchId)) {
    return res.status(400).json({ error: "invalid batch id format" });
  }

  try {
    const rows = await getBatchForCsv(batchId);

    if (!rows.length) {
      return res.status(404).json({ error: "batch not found" });
    }

    const header = [
      "batch_id",
      "serial_number",
      "prov_secret",
      "factory",
      "line",
      "lot",
      "manufactured_at",
      "status"
    ].join(",");

    const lines = rows.map(r =>
      [
        r.batch_id,
        r.serial_number,
        r.prov_secret,
        r.factory,
        r.line,
        r.lot,
        r.manufactured_at
          ? new Date(r.manufactured_at).toISOString()
          : "",
        r.status
      ].map(csvEscape).join(",")
    );

    const csv = [header, ...lines].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",
      `attachment; filename="manufacturing-batch-${batchId}.csv"`
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(csv);

} catch (err) {
  console.error("[manufacturing][csv] failed", {
    batchId,
    message: err?.message,
    code: err?.code,
  });
  return res.status(500).json({ error: "csv export failed" });
  }
}