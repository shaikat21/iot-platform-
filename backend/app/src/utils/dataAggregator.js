// backend/app/src/utils/timeseriesAggregator.js

/**
 * Convert a "resolution" string into bucketMs or "raw"
 */
export function normalizeResolution(
  resolution,
  fallback = "5m",
  allowed = ["raw", "5s", "10s", "30s", "1m", "5m", "15m", "1h"]
) {
  const r = String(resolution || fallback).toLowerCase();
  return allowed.includes(r) ? r : fallback;
}

export function resolutionToBucketMs(resolution, fallback = "5m") {
  const r = String(resolution || fallback).toLowerCase();
  if (r === "raw") return "raw";
  if (r === "5s") return 5_000;
  if (r === "10s") return 10_000;
  if (r === "30s") return 30_000;
  if (r === "1m") return 60_000;
  if (r === "5m") return 300_000;
  if (r === "15m") return 900_000;
  if (r === "1h") return 3_600_000;
  return 300_000;
}

export function normalizeLimit(v, fallback = 50, min = 1, max = 10_000) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * @template TSample, TBucket, TOut
 *
 * Generic timeseries aggregator.
 *
 * fetchSamples(): controller-defined async function to load samples.
 * Supports "raw" passthrough and bucket aggregation.
 */
export async function aggregateTimeseries({
  fetchSamples,              // async () => TSample[]
  resolution,                // string: "raw" | "1m" | "5m" ...
  fallbackResolution = "5m",

  // For bucketing
  getTimeMs,                 // (sample) => number (epoch ms)
  createBucket,              // (bucketKeyMs) => TBucket
  accumulate,                // (bucket, sample) => void
  finalize,                  // (bucket) => TOut

  // Optional filter (applied AFTER fetchSamples)
  cutoffMs,                  // number | undefined (keep samples >= cutoffMs)

  // Optional: allow caller to limit sample count early (post-fetch)
  maxSamples,                // number | undefined
}) {
  if (typeof fetchSamples !== "function") {
    throw new Error("aggregateTimeseries: fetchSamples must be a function");
  }
  if (typeof getTimeMs !== "function") {
    throw new Error("aggregateTimeseries: getTimeMs must be a function");
  }

  const reso = normalizeResolution(resolution, fallbackResolution);
  const bucketMs = resolutionToBucketMs(reso, fallbackResolution);

  const samplesRaw = await fetchSamples();
  const samples = Array.isArray(samplesRaw) ? samplesRaw : [];

  // Filter by cutoff if provided
  let filtered = samples;
  if (Number.isFinite(cutoffMs)) {
    filtered = filtered.filter((s) => {
      const t = getTimeMs(s);
      return Number.isFinite(t) && t >= cutoffMs;
    });
  }

  if (Number.isFinite(maxSamples) && maxSamples > 0 && filtered.length > maxSamples) {
    // keep newest by time (safer than slice(0))
    filtered = [...filtered]
      .sort((a, b) => (getTimeMs(b) || 0) - (getTimeMs(a) || 0))
      .slice(0, maxSamples);
  }

  // RAW passthrough
  if (bucketMs === "raw") {
    return {
      resolution: "raw",
      points: filtered.length,
      data: filtered,
    };
  }

  if (typeof createBucket !== "function" || typeof accumulate !== "function" || typeof finalize !== "function") {
    throw new Error("aggregateTimeseries: createBucket/accumulate/finalize must be functions for non-raw mode");
  }

  const buckets = new Map(); // key(ms) -> bucket

  for (const s of filtered) {
    const t = getTimeMs(s);
    if (!Number.isFinite(t)) continue;

    const key = Math.floor(t / bucketMs) * bucketMs;

    let b = buckets.get(key);
    if (!b) {
      b = createBucket(key);
      buckets.set(key, b);
    }
    accumulate(b, s);
  }

  const aggregated = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, b]) => finalize(b));

  return {
    resolution: reso,
    points: aggregated.length,
    data: aggregated,
  };
}
