import { mkdir, writeFile } from "fs/promises";
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
