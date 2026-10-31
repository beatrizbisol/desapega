import { afterEach, describe, expect, it, vi } from "vitest";
import { activeWindowCount, clientIp, hitRateLimit } from "@/lib/rate-limit";

const req = (ip: string) => new Request("http://site.test", { headers: { "x-forwarded-for": ip } });

afterEach(() => {
  vi.useRealTimers();
});

describe("rate limit", () => {
  it("ipv6 /64: addresses in one /64 share a bucket, another /64 does not", () => {
    const a = clientIp(req("2001:db8:1:2:aaaa::1"));
    const b = clientIp(req("2001:db8:1:2:bbbb::9"));
    const c = clientIp(req("2001:db8:1:3::1"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(clientIp(req("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("expired windows are pruned", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 50; i += 1) hitRateLimit(`prune-test:${i}`, 5, 1000);
    expect(activeWindowCount()).toBeGreaterThanOrEqual(50);
    vi.advanceTimersByTime(1001);
    hitRateLimit("prune-test:new", 5, 1000);
    expect(activeWindowCount()).toBe(1);
  });
});

describe("client ip source", () => {
  afterEach(() => {
    delete process.env.CLIENT_IP_HEADER;
  });

  it("CLIENT_IP_HEADER: reads the configured header and ignores a forged X-Forwarded-For", () => {
    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    const request = new Request("http://site.test", {
      headers: { "x-forwarded-for": "6.6.6.6, 198.51.100.4", "cf-connecting-ip": "198.51.100.4" },
    });
    expect(clientIp(request)).toBe("198.51.100.4");
  });

  it("CLIENT_IP_HEADER set but header missing: falls back to one shared bucket", () => {
    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    const request = new Request("http://site.test", { headers: { "x-forwarded-for": "6.6.6.6" } });
    expect(clientIp(request)).toBe("local");
  });
});
