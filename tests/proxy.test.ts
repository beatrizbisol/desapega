import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const ADMIN_PATHS = ["/admin", "/admin/login", "/api/admin/items", "/api/auth/session"];

const call = (path: string, host: string) =>
  proxy(new NextRequest(`http://${host}${path}`, { headers: { host } }));

afterEach(() => {
  delete process.env.ADMIN_HOST;
});

describe("proxy", () => {
  it("host gate: 404 on admin paths from another host, passes through on ADMIN_HOST", () => {
    process.env.ADMIN_HOST = "admin.test:8443";
    for (const path of ADMIN_PATHS) {
      expect(call(path, "site.test").status, path).toBe(404);
      const passed = call(path, "admin.test:8443");
      expect(passed.headers.get("x-middleware-next"), path).toBe("1");
    }
    expect(config.matcher).toEqual(["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*"]);
  });

  it("ADMIN_HOST unset: every admin path is 404", () => {
    for (const path of ADMIN_PATHS) {
      expect(call(path, "admin.test:8443").status, path).toBe(404);
    }
  });
});
