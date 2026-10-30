type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Fixed-window counter kept in process memory.
 * hazard: a restart clears every counter, and a second app instance would keep
 * its own counts; both are acceptable while the site runs as one process.
 */
export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    windows.set(key, entry);
  }
  entry.count += 1;
  return {
    limited: entry.count > limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

/**
 * why: Caddy overwrites X-Forwarded-For with the real peer address, and the app
 * listens only on 127.0.0.1, so the first entry is the visitor's IP.
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}
