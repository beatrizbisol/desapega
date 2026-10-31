// Resizes the seed photos in public/items to at most 1600px and uploads them to R2
// under the same path (items/<item>/<file>.jpg), which is where the seed URLs point.
// Usage: node --env-file=.env.production scripts/upload-seed-photos.mjs
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const { R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, MEDIA_BASE_URL } = process.env;
if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !MEDIA_BASE_URL) {
  console.error("R2_* and MEDIA_BASE_URL are required");
  process.exit(2);
}

const client = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});
const tmp = await mkdtemp(path.join(os.tmpdir(), "desapega-seed-"));
const root = "public/items";
let failed = 0;

for (const item of await readdir(root)) {
  for (const file of await readdir(path.join(root, item))) {
    const source = path.join(root, item, file);
    const resized = path.join(tmp, `${item}-${file}`);
    execFileSync("sips", ["-Z", "1600", "-s", "format", "jpeg", "-s", "formatOptions", "82", source, "--out", resized], { stdio: "ignore" });
    const key = `items/${item}/${file}`;
    const response = await client.fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`, {
      method: "PUT",
      body: await readFile(resized),
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!response.ok) failed += 1;
    console.log(`${response.ok ? "OK  " : "FAIL"} ${key} (${response.status})`);
  }
}

const probe = await fetch(`${MEDIA_BASE_URL}/items/cadeira/frente.jpg`, { method: "HEAD" });
console.log(`public read ${MEDIA_BASE_URL}/items/cadeira/frente.jpg -> ${probe.status}`);
process.exit(failed || probe.status !== 200 ? 1 : 0);
