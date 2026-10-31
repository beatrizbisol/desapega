import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTempDataDir } from "./helpers";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { email: "filipemlins@gmail.com" } })),
}));

const { POST: upload } = await import("@/app/api/admin/upload/route");
const { GET: serve } = await import("@/app/uploads/[file]/route");

let tmp: Awaited<ReturnType<typeof useTempDataDir>>;

beforeEach(async () => {
  tmp = await useTempDataDir();
  process.env.ALLOWED_EMAILS = "filipemlins@gmail.com";
});

afterEach(async () => {
  await tmp.cleanup();
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const params = (file: string) => ({ params: Promise.resolve({ file }) });

describe("uploads", () => {
  it("upload and serve: stored in UPLOADS_DIR, served with its type, bad names 404", async () => {
    const form = new FormData();
    form.set("file", new File([PNG], "foto.png", { type: "image/png" }));
    const res = await upload(
      new Request("http://admin.test/api/admin/upload", { method: "POST", body: form }),
    );
    expect(res.status).toBe(201);
    const { url } = await res.json();
    expect(url).toMatch(/^\/uploads\/[0-9]+-[0-9a-f]{8}\.png$/);

    const name = url.replace("/uploads/", "");
    expect(new Uint8Array(await readFile(path.join(tmp.dir, "uploads", name)))).toEqual(PNG);
    const served = await serve(new Request(`http://site.test${url}`), params(name));
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG);

    await mkdir(path.join(tmp.dir, "uploads"), { recursive: true });
    await writeFile(path.join(tmp.dir, "uploads", "x.svg"), "<svg/>");
    for (const bad of ["../items.json", "..%2Fitems.json", "x.svg", "1-abcdef12.exe"]) {
      const r = await serve(new Request("http://site.test"), params(bad));
      expect(r.status, bad).toBe(404);
    }
    const missing = await serve(new Request("http://site.test"), params("1-abcdef12.png"));
    expect(missing.status).toBe(404);
  });
});

describe("uploads to R2", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "MEDIA_BASE_URL"]) {
      delete process.env[key];
    }
  });

  it("r2 upload: with R2 configured the photo is PUT to the bucket and the media URL is returned", async () => {
    Object.assign(process.env, {
      R2_ACCOUNT_ID: "acc123",
      R2_BUCKET: "desapega",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      MEDIA_BASE_URL: "https://media.useclubapp.com/",
    });
    const calls: Request[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: Request) => {
      calls.push(input);
      return new Response(null, { status: 200 });
    }));

    const form = new FormData();
    form.set("file", new File([PNG], "foto.png", { type: "image/png" }));
    const res = await upload(new Request("http://admin.test/api/admin/upload", { method: "POST", body: form }));

    expect(res.status).toBe(201);
    const { url } = await res.json();
    expect(url).toMatch(/^https:\/\/media\.useclubapp\.com\/uploads\/[0-9]+-[0-9a-f]{8}\.png$/);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toBe(`https://acc123.r2.cloudflarestorage.com/desapega/${url.replace("https://media.useclubapp.com/", "")}`);
    expect(calls[0].headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 /);
  });
});
