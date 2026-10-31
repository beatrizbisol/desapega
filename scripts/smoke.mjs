// Smoke test against a real `next start` build: proxy matcher, 405s, Auth.js sign-in and the admin page body.
// Usage: npm run build && node scripts/smoke.mjs [routes|auth]
import { execFileSync, spawn } from "node:child_process";
import pg from "pg";
import { mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2] ?? "routes";
const port = 43000 + Math.floor(Math.random() * 900);
const ADMIN_HOST = `admin.test:${port}`;
const PUBLIC_HOST = `site.test:${port}`;

const dataDir = await mkdtemp(path.join(os.tmpdir(), "desapega-smoke-"));
const PG_NAME = `desapega-smoke-pg-${process.pid}`;
execFileSync("docker", ["run", "-d", "--rm", "--name", PG_NAME, "-e", "POSTGRES_PASSWORD=smoke", "-e", "POSTGRES_DB=desapega", "-p", "127.0.0.1::5432", "postgres:16-alpine"]);
const pgPort = execFileSync("docker", ["port", PG_NAME, "5432"]).toString().trim().split(":").pop();
const DATABASE_URL = `postgres://postgres:smoke@127.0.0.1:${pgPort}/desapega`;
for (let i = 0; i < 60; i += 1) {
  try {
    execFileSync("docker", ["exec", PG_NAME, "pg_isready", "-U", "postgres", "-h", "127.0.0.1"]);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
const SENTINEL_PHONE = "51987654321";

const server = spawn("npx", ["next", "start", "--port", String(port), "--hostname", "127.0.0.1"], {
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    DATABASE_URL,
    SEED_ITEMS_PATH: "data/items.json",
    ADMIN_HOST,
    AUTH_SECRET: "smoke-secret-smoke-secret-smoke-secret",
    AUTH_URL: `http://${ADMIN_HOST}`,
    AUTH_GOOGLE_ID: "smoke-id",
    AUTH_GOOGLE_SECRET: "smoke-secret",
    ALLOWED_EMAILS: "filipemlins@gmail.com",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

function request(method, urlPath, host, extraHeaders = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, method, path: urlPath, headers: { host, ...extraHeaders } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.end(body);
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
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  await client.query(
    `INSERT INTO orders (id, item_id, item_title, buyer_name, buyer_phone, payment_method, delivery_method, status)
     VALUES (gen_random_uuid(), gen_random_uuid(), 'x', 'Sentinela', $1, 'pix', 'pickup', 'confirmed')`,
    [SENTINEL_PHONE],
  );
  await client.end();
  if (mode === "routes") {
    const items = await request("GET", "/api/items", PUBLIC_HOST);
    expect("GET /api/items 200", items.status, (s) => s === 200);
    const id = JSON.parse(items.body).items[0]?.id ?? "x";
    expect("POST /api/items 405", (await request("POST", "/api/items", PUBLIC_HOST)).status, (s) => s === 405);
    expect("PATCH /api/items/:id 405", (await request("PATCH", `/api/items/${id}`, PUBLIC_HOST)).status, (s) => s === 405);
    expect("DELETE /api/items/:id 405", (await request("DELETE", `/api/items/${id}`, PUBLIC_HOST)).status, (s) => s === 405);
    expect("GET /api/orders 405", (await request("GET", "/api/orders", PUBLIC_HOST)).status, (s) => s === 405);
    expect("GET /admin public host 404", (await request("GET", "/admin", PUBLIC_HOST)).status, (s) => s === 404);
    expect("GET /api/admin/orders public host 404", (await request("GET", "/api/admin/orders", PUBLIC_HOST)).status, (s) => s === 404);
    const admin = await request("GET", "/admin", ADMIN_HOST);
    expect("GET /admin admin host no cookie -> 307 /admin/login", [admin.status, admin.headers.location], ([s, l]) => s === 307 && /\/admin\/login$/.test(l ?? ""));
    expect("GET /admin redirect body carries no order data", admin.body.includes(SENTINEL_PHONE), (leaked) => leaked === false);
  } else {
    const providers = await request("GET", "/api/auth/providers", ADMIN_HOST);
    expect("GET /api/auth/providers 200 with google", [providers.status, providers.body.includes('"google"')], ([s, g]) => s === 200 && g);
    // The real sign-in is a POST carrying the CSRF token and its cookie.
    const csrf = await request("GET", "/api/auth/csrf", ADMIN_HOST);
    const { csrfToken } = JSON.parse(csrf.body);
    const cookie = (csrf.headers["set-cookie"] ?? []).map((c) => c.split(";")[0]).join("; ");
    const signin = await request(
      "POST",
      "/api/auth/signin/google",
      ADMIN_HOST,
      { cookie, "content-type": "application/x-www-form-urlencoded" },
      new URLSearchParams({ csrfToken, callbackUrl: "/admin" }).toString(),
    );
    expect("POST /api/auth/signin/google 302 to Google", [signin.status, signin.headers.location?.slice(0, 60)], ([s, l]) => s === 302 && /^https:\/\/accounts\.google\.com\//.test(l ?? ""));
    expect("GET /api/auth/providers public host 404", (await request("GET", "/api/auth/providers", PUBLIC_HOST)).status, (s) => s === 404);
  }
} finally {
  server.kill("SIGTERM");
  execFileSync("docker", ["rm", "-f", PG_NAME]);
  await rm(dataDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`${failures.length} smoke check(s) failed`);
  process.exit(1);
}
