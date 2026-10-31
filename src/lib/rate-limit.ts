type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Fixed-window counter kept in process memory.
 * hazard: a restart clears every counter, and a second app instance would keep
 * its own counts; both are acceptable while the site runs as one process.
 */
export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  // why: without pruning, every distinct client adds an entry that is never freed.
  for (const [storedKey, stored] of windows) {
    if (stored.resetAt <= now) windows.delete(storedKey);
  }
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

export function activeWindowCount() {
  return windows.size;
}

// hazard: without CLIENT_IP_HEADER the key is the first X-Forwarded-For entry,
// which the client controls whenever a proxy appends to that header instead of
// replacing it, as Cloudflare does; docker-compose.prod.yml sets
// CLIENT_IP_HEADER=cf-connecting-ip for that reason.
export function clientIp(request: Request) {
  const header = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  const raw = header
    ? request.headers.get(header)
    : request.headers.get("x-forwarded-for");
  const ip = raw?.split(",")[0]?.trim();
  if (!ip) return "local";
  return ip.includes(":") ? ipv6Prefix64(ip) : ip;
}

// why: one IPv6 subscriber usually holds a whole /64, so keying on the full
// address would hand them a fresh bucket per address.
function ipv6Prefix64(ip: string) {
  const [head, tail = ""] = ip.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - headParts.length - tailParts.length : 0;
  const groups = [...headParts, ...Array(Math.max(missing, 0)).fill("0"), ...tailParts];
  return `${groups
    .slice(0, 4)
    .map((group) => (parseInt(group, 16) || 0).toString(16))
    .join(":")}::/64`;
}
