import { writeFile } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createItem, createOrder } from "@/lib/store";
import { BROKEN_DATABASE_URL, item, order, useTempDataDir } from "./helpers";

const session = vi.hoisted(() => ({ current: null as null | { user: { email: string } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));

const itemsRoute = await import("@/app/api/admin/items/route");
const itemRoute = await import("@/app/api/admin/items/[id]/route");
const ordersRoute = await import("@/app/api/admin/orders/route");
const orderRoute = await import("@/app/api/admin/orders/[id]/route");
const uploadRoute = await import("@/app/api/admin/upload/route");

let tmp: Awaited<ReturnType<typeof useTempDataDir>>;

beforeEach(async () => {
  tmp = await useTempDataDir();
  session.current = null;
  process.env.ALLOWED_EMAILS = "filipemlins@gmail.com";
});

afterEach(async () => {
  await tmp.cleanup();
});

const json = (method: string, body?: unknown) =>
  new Request("http://admin.test/api/admin/x", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const pngForm = () => {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
  return new Request("http://admin.test/api/admin/upload", { method: "POST", body: form });
};

const operations: Array<[string, () => Promise<Response>]> = [
  ["POST items", () => itemsRoute.POST(json("POST", item()))],
  ["PATCH item", () => itemRoute.PATCH(json("PATCH", { price: 50 }), params("x"))],
  ["DELETE item", () => itemRoute.DELETE(json("DELETE"), params("x"))],
  ["GET orders", () => ordersRoute.GET(new Request("http://admin.test/api/admin/orders"))],
  ["PATCH order", () => orderRoute.PATCH(json("PATCH", { status: "confirmed" }), params("x"))],
  ["POST upload", () => uploadRoute.POST(pngForm())],
];

describe("admin routes", () => {
  it("401 without session on each of the 6 operations", async () => {
    for (const [name, run] of operations) {
      const res = await run();
      expect(res.status, name).toBe(401);
      expect(await res.json(), name).toEqual({ error: "Não autorizado." });
    }
  });

  it("works with session: POST items 201 and GET orders 200", async () => {
    session.current = { user: { email: "filipemlins@gmail.com" } };
    const created = await itemsRoute.POST(json("POST", item()));
    expect(created.status).toBe(201);
    const listed = await ordersRoute.GET(new Request("http://admin.test/api/admin/orders"));
    expect(listed.status).toBe(200);
    expect(Array.isArray((await listed.json()).orders)).toBe(true);
  });

  it("admin contract: 200, 400, 404 and 500 per operation", async () => {
    session.current = { user: { email: "filipemlins@gmail.com" } };
    const a = await createItem(item("A"));
    const b = await createItem(item("B"));
    const o = await createOrder(order(b.id));

    expect((await itemsRoute.POST(json("POST", { ...item(), title: "" }))).status).toBe(400);
    expect((await itemRoute.PATCH(json("PATCH", { price: 50 }), params(a.id))).status).toBe(200);
    expect((await itemRoute.PATCH(json("PATCH", { price: -1 }), params(a.id))).status).toBe(400);
    expect((await itemRoute.PATCH(json("PATCH", { price: 50 }), params("nope"))).status).toBe(404);
    expect((await orderRoute.PATCH(json("PATCH", { status: "confirmed" }), params(o.id))).status).toBe(200);
    expect((await orderRoute.PATCH(json("PATCH", { status: "x" }), params(o.id))).status).toBe(400);
    expect((await orderRoute.PATCH(json("PATCH", { status: "cancelled" }), params("nope"))).status).toBe(404);
    expect((await itemRoute.DELETE(json("DELETE"), params(a.id))).status).toBe(200);
    expect((await itemRoute.DELETE(json("DELETE"), params("nope"))).status).toBe(404);

    const textForm = new FormData();
    textForm.set("file", new File(["hi"], "a.txt", { type: "text/plain" }));
    const badUpload = await uploadRoute.POST(
      new Request("http://admin.test/api/admin/upload", { method: "POST", body: textForm }),
    );
    expect(badUpload.status).toBe(400);

    const blocker = path.join(tmp.dir, "not-a-dir");
    await writeFile(blocker, "x");
    process.env.DATABASE_URL = BROKEN_DATABASE_URL;
    process.env.UPLOADS_DIR = path.join(blocker, "uploads");
    for (const [name, run] of operations) {
      expect((await run()).status, name).toBe(500);
    }
  });
});

describe("admin review fixes", () => {
  it("allowlist on every request: a session whose email left ALLOWED_EMAILS gets 401", async () => {
    process.env.ALLOWED_EMAILS = "beatrizbisol@gmail.com";
    session.current = { user: { email: "filipemlins@gmail.com" } };
    for (const [name, run] of operations) {
      expect((await run()).status, name).toBe(401);
    }
    delete process.env.ALLOWED_EMAILS;
  });

  it("logs unexpected errors before answering 500", async () => {
    session.current = { user: { email: "filipemlins@gmail.com" } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocker = path.join(tmp.dir, "not-a-dir");
    await writeFile(blocker, "x");
    process.env.DATABASE_URL = BROKEN_DATABASE_URL;
    expect((await ordersRoute.GET(new Request("http://admin.test/api/admin/orders"))).status).toBe(500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("PATCH item edits all fields and rejects blanking required ones", async () => {
    session.current = { user: { email: "filipemlins@gmail.com" } };
    const a = await createItem(item("A"));
    const edit = { title: "Mesa", description: "Nova", price: 80, photos: ["/x.jpg", "/y.jpg"] };
    const res = await itemRoute.PATCH(json("PATCH", edit), params(a.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject(edit);

    for (const bad of [{ title: "  " }, { description: "" }, { photos: [] }]) {
      expect((await itemRoute.PATCH(json("PATCH", bad), params(a.id))).status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("invalid order transition answers 409", async () => {
    session.current = { user: { email: "filipemlins@gmail.com" } };
    const a = await createItem(item("A"));
    const o = await createOrder(order(a.id));
    await orderRoute.PATCH(json("PATCH", { status: "cancelled" }), params(o.id));
    const res = await orderRoute.PATCH(json("PATCH", { status: "confirmed" }), params(o.id));
    expect(res.status).toBe(409);
  });
});
