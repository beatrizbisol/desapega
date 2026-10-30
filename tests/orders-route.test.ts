import { writeFile } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getItemRoute } from "@/app/api/items/[id]/route";
import { POST } from "@/app/api/orders/route";
import { createItem } from "@/lib/store";
import { item, order, useTempDataDir } from "./helpers";

let tmp: Awaited<ReturnType<typeof useTempDataDir>>;
let ipCounter = 0;

beforeEach(async () => {
  tmp = await useTempDataDir();
});

afterEach(async () => {
  await tmp.cleanup();
});

function freshIp() {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
}

function postOrder(body: unknown, ip: string) {
  return POST(
    new Request("http://site.test/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/orders", () => {
  it("rate limit: the 6th request from one IP in an hour gets 429, another IP does not", async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await postOrder({ ...order("missing"), buyerName: "" }, ip);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);

    const limited = await postOrder({ ...order("missing"), buyerName: "" }, ip);
    expect(await limited.json()).toEqual({
      error: "Muitas tentativas. Tente de novo mais tarde.",
    });
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);

    const other = await postOrder({ ...order("missing"), buyerName: "" }, freshIp());
    expect(other.status).not.toBe(429);
  });

  it("phone pending 409: a second reservation with the same phone is refused", async () => {
    const a = await createItem(item("A"));
    const b = await createItem(item("B"));
    const ip = freshIp();
    expect((await postOrder(order(a.id, "(51) 99999-8888"), ip)).status).toBe(201);

    const res = await postOrder(order(b.id, "51 999998888"), ip);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Já existe uma reserva pendente para este telefone.",
    });
  });

  it("public contract: 201, 400, 404, 500 on POST /api/orders and 200/404 on GET /api/items/[id]", async () => {
    const created = await createItem(item());

    const okItem = await getItemRoute(new Request("http://site.test"), params(created.id));
    expect(okItem.status).toBe(200);
    const missingItem = await getItemRoute(new Request("http://site.test"), params("nope"));
    expect(missingItem.status).toBe(404);

    expect((await postOrder({ ...order(created.id), buyerName: "" }, freshIp())).status).toBe(400);
    expect((await postOrder(order("nope"), freshIp())).status).toBe(404);
    expect((await postOrder(order(created.id), freshIp())).status).toBe(201);

    const blocker = path.join(tmp.dir, "not-a-dir");
    await writeFile(blocker, "x");
    process.env.DATA_DIR = blocker;
    expect((await postOrder(order(created.id, "51933334444"), freshIp())).status).toBe(500);
  });
});
