// Post-deploy check of the public site: the catalog answers and admin paths are blocked.
// Usage: node scripts/check-public.mjs https://desapega.useclubapp.com
const base = process.argv[2];
if (!base) {
  console.error("usage: node scripts/check-public.mjs <base-url>");
  process.exit(2);
}

const checks = [
  ["/api/items", (s) => s === 200],
  ["/admin", (s) => s === 403 || s === 404],
  ["/api/admin/orders", (s) => s === 403 || s === 404],
  ["/api/auth/providers", (s) => s === 403 || s === 404],
];

let failed = 0;
for (const [path, ok] of checks) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const pass = ok(res.status);
  if (!pass) failed += 1;
  console.log(`${pass ? "PASS" : "FAIL"} ${path} -> ${res.status}`);
}
process.exit(failed ? 1 : 0);
