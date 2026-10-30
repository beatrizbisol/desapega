// Smoke test against a real `next start` build: proxy matcher, 405s and Auth.js mount.
// Usage: npm run build && node scripts/smoke.mjs [routes|auth]
import { spawn } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2] ?? "routes";
const port = 43000 + Math.floor(Math.random() * 900);
const ADMIN_HOST = `admin.test:${port}`;
const PUBLIC_HOST = `site.test:${port}`;

const dataDir = await mkdtemp(path.join(os.tmpdir(), "desapega-smoke-"));
await cp("data/items.json", path.join(dataDir, "items.json"));

const server = spawn("npx", ["next", "start", "--port", String(port), "--hostname", "127.0.0.1"], {
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    ADMIN_HOST,
    AUTH_SECRET: "smoke-secret-smoke-secret-smoke-secret",
    AUTH_URL: `http://${ADMIN_HOST}`,
    AUTH_GOOGLE_ID: "smoke-id",
    AUTH_GOOGLE_SECRET: "smoke-secret",
    ALLOWED_EMAILS: "filipemlins@gmail.com",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

function request(method, urlPath, host) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, method, path: urlPath, headers: { host } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      await request("GET", "/api/items", PUBLIC_HOST);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("server did not start");
}

const failures = [];
function expect(label, actual, predicate) {
  const ok = predicate(actual);
  console.log(`${ok ? "PASS" : "FAIL"} ${label} -> ${JSON.stringify(actual)}`);
  if (!ok) failures.push(label);
}

try {
  await waitReady();
  if (mode === "routes") {
    const items = await request("GET", "/api/items", PUBLIC_HOST);
    expect("GET /api/items 200", items.status, (s) => s === 200);
    const id = JSON.parse(items.body)[0]?.id ?? "x";
    expect("POST /api/items 405", (await request("POST", "/api/items", PUBLIC_HOST)).status, (s) => s === 405);
    expect("PATCH /api/items/:id 405", (await request("PATCH", `/api/items/${id}`, PUBLIC_HOST)).status, (s) => s === 405);
    expect("DELETE /api/items/:id 405", (await request("DELETE", `/api/items/${id}`, PUBLIC_HOST)).status, (s) => s === 405);
    expect("GET /api/orders 405", (await request("GET", "/api/orders", PUBLIC_HOST)).status, (s) => s === 405);
    expect("GET /admin public host 404", (await request("GET", "/admin", PUBLIC_HOST)).status, (s) => s === 404);
    expect("GET /api/admin/orders public host 404", (await request("GET", "/api/admin/orders", PUBLIC_HOST)).status, (s) => s === 404);
    const admin = await request("GET", "/admin", ADMIN_HOST);
    expect("GET /admin admin host no cookie -> 307 /admin/login", [admin.status, admin.headers.location], ([s, l]) => s === 307 && /\/admin\/login$/.test(l ?? ""));
  } else {
    const providers = await request("GET", "/api/auth/providers", ADMIN_HOST);
    expect("GET /api/auth/providers 200 with google", [providers.status, providers.body.includes('"google"')], ([s, g]) => s === 200 && g);
    const signin = await request("GET", "/api/auth/signin/google", ADMIN_HOST);
    expect("GET /api/auth/signin/google 302", [signin.status, signin.headers.location], ([s, l]) => s === 302 && /accounts\.google\.com|\/admin\/login/.test(l ?? ""));
    expect("GET /api/auth/providers public host 404", (await request("GET", "/api/auth/providers", PUBLIC_HOST)).status, (s) => s === 404);
  }
} finally {
  server.kill("SIGTERM");
  await rm(dataDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`${failures.length} smoke check(s) failed`);
  process.exit(1);
}
