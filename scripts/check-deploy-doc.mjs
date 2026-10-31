// Fails when docs/DEPLOY.md stops naming a variable, the tailnet command or the backup cron.
import { readFile } from "node:fs/promises";

const doc = await readFile("docs/DEPLOY.md", "utf8");
const required = [
  "ADMIN_HOST", "AUTH_SECRET", "AUTH_URL", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET",
  "ALLOWED_EMAILS", "DATA_DIR", "UPLOADS_DIR", "tailscale serve", "/etc/cron.d/desapega-backup",
  "0 * * * * root /usr/local/bin/desapega-backup",
];
const missing = required.filter((term) => !doc.includes(term));
if (missing.length) {
  console.error(`DEPLOY.md is missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`DEPLOY.md names all ${required.length} required terms`);
