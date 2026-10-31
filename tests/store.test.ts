import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/db";
import {
  RESERVATION_MS,
  createItem,
  createOrder,
  getItem,
  listItems,
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
  it("postgres crud: 20 concurrent createItem are all stored in the database", async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => createItem(item(`Item ${i}`))));
    const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM items");
    expect(rows[0].n).toBe(20);
    expect(await listItems()).toHaveLength(20);
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


describe("store hardening", () => {
  it("shared database: two module instances still allow one reservation per item", async () => {
    const created = await createItem(item());
    vi.resetModules();
    const first = await import("@/lib/store");
    vi.resetModules();
    const second = await import("@/lib/store");
    expect(first).not.toBe(second);

    const results = await Promise.allSettled([
      first.createOrder(order(created.id, "51911111111")),
      second.createOrder(order(created.id, "51922222222")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("order rollback: a failed item update leaves no pending order and the item available", async () => {
    const created = await createItem(item("Boom"));
    await query(`CREATE OR REPLACE FUNCTION fail_reserve() RETURNS trigger AS $$
      BEGIN IF NEW.status = 'reserved' THEN RAISE EXCEPTION 'disk gone'; END IF; RETURN NEW; END
      $$ LANGUAGE plpgsql`);
    await query("CREATE TRIGGER fail_reserve BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION fail_reserve()");
    try {
      await expect(createOrder(order(created.id))).rejects.toThrow("disk gone");
    } finally {
      await query("DROP TRIGGER fail_reserve ON items");
    }
    expect(await listOrders()).toHaveLength(0);
    expect((await getItem(created.id))?.status).toBe("available");
  });

  it("order transitions: only a pending order can be confirmed", async () => {
    const a = await createItem(item("A"));
    const first = await createOrder(order(a.id, "51911111111"));
    await updateOrderStatus(first.id, "cancelled");
    await createOrder(order(a.id, "51922222222"));

    await expect(updateOrderStatus(first.id, "confirmed")).rejects.toThrow("INVALID_TRANSITION");
    expect((await getItem(a.id))?.status).toBe("reserved");
  });
});
