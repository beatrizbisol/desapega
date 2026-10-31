import { AwsClient } from "aws4fetch";

type R2Config = { accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string };

function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey };
}

export function mediaBaseUrl() {
  return process.env.MEDIA_BASE_URL?.trim().replace(/\/+$/, "") || null;
}

/** True when uploads go to R2 instead of UPLOADS_DIR. */
export function r2Enabled() {
  return r2Config() !== null && mediaBaseUrl() !== null;
}

/** Stores the object in R2 and returns its public URL under MEDIA_BASE_URL. */
export async function putMedia(key: string, body: Uint8Array, contentType: string) {
  const config = r2Config();
  const base = mediaBaseUrl();
  if (!config || !base) throw new Error("R2 is not configured");
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const response = await client.fetch(
    `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`,
    {
      method: "PUT",
      body: new Uint8Array(body),
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
  if (!response.ok) throw new Error(`R2 upload failed: ${response.status}`);
  return `${base}/${key}`;
}
