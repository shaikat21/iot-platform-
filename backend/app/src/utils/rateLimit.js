const WINDOW_MS = 60 * 1000; // 1 minute
const MAX = 6;             // 30 requests per IP per minute

const hits = new Map();

export function rateLimit(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress;

  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > MAX) {
    return res.status(429).json({
      error: "Too many requests",
      retry_after: Math.ceil((entry.reset - now) / 1000)
    });
  }

  next();
}
