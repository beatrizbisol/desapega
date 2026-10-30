import { readFile } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fsModule from "fs";
import {
  RESERVATION_MS,
  createItem,
  createOrder,
  listOrders,
  updateOrderStatus,
} from "@/lib/store";
import { item, order, useTempDataDir } from "./helpers";

let tmp: Awaited<ReturnType<typeof useTempDataDir>>;

beforeEach(async () => {
  tmp = await useTempDataDir();
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await tmp.cleanup();
});

describe("store", () => {
  it("DATA_DIR and write queue: 20 concurrent createItem land in DATA_DIR/items.json", async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => createItem(item(`Item ${i}`))));
    const saved = JSON.parse(await readFile(path.join(tmp.dir, "items.json"), "utf8"));
    expect(saved).toHaveLength(20);
  });

  it("atomic write: a failed rename leaves the previous items.json complete", async () => {
    await createItem(item("Primeiro"));
    const before = await readFile(path.join(tmp.dir, "items.json"), "utf8");

    vi.spyOn(fsModule.promises, "rename").mockRejectedValueOnce(new Error("disk gone"));
    await expect(createItem(item("Segundo"))).rejects.toThrow("disk gone");

    const after = await readFile(path.join(tmp.dir, "items.json"), "utf8");
    expect(after).toBe(before);
    expect(JSON.parse(after)).toHaveLength(1);
  });

  it("concurrent reservation: exactly one of two orders for the same item succeeds", async () => {
    const created = await createItem(item());
    const results = await Promise.allSettled([
      createOrder(order(created.id, "51911111111")),
      createOrder(order(created.id, "51922222222")),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason.message).toBe("ITEM_UNAVAILABLE");
  });

  it("one pending per phone: a second reservation with the same phone is rejected", async () => {
    const a = await createItem(item("A"));
    const b = await createItem(item("B"));
    await createOrder(order(a.id, "51999998888"));
    await expect(createOrder(order(b.id, "51999998888"))).rejects.toThrow("PHONE_HAS_PENDING");
    expect(await listOrders()).toHaveLength(1);
  });

  it("phone freed after cancellation", async () => {
    const a = await createItem(item("A"));
    const b = await createItem(item("B"));
    const first = await createOrder(order(a.id));
    await updateOrderStatus(first.id, "cancelled");
    await expect(createOrder(order(b.id))).resolves.toMatchObject({ itemId: b.id });
  });

  it("phone freed after the 24h reservation expires", async () => {
    const a = await createItem(item("A"));
    const b = await createItem(item("B"));
    await createOrder(order(a.id));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + RESERVATION_MS + 1000);
    await expect(createOrder(order(b.id))).resolves.toMatchObject({ itemId: b.id });
  });
});

