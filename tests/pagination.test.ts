import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listItemsRoute } from "@/app/api/items/route";
import { createItem, createOrder, updateItem } from "@/lib/store";
import type { Item, Order } from "@/lib/types";
import { item, order, useTempDataDir } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { email: "filipemlins@gmail.com" } })) }));
const { GET: listOrdersRoute } = await import("@/app/api/admin/orders/route");
const { GET: listAdminItemsRoute } = await import("@/app/api/admin/items/route");

let tmp: Awaited<ReturnType<typeof useTempDataDir>>;

beforeEach(async () => {
  tmp = await useTempDataDir();
  process.env.ALLOWED_EMAILS = "filipemlins@gmail.com";
});

afterEach(async () => {
  await tmp.cleanup();
});

const getItems = (qs: string) => listItemsRoute(new Request(`http://site.test/api/items${qs}`));
const getAdminItems = (qs: string) => listAdminItemsRoute(new Request(`http://admin.test/api/admin/items${qs}`));
const getOrders = (qs: string) => listOrdersRoute(new Request(`http://admin.test/api/admin/orders${qs}`));

describe("pagination", () => {
  it("items pages: limit and nextCursor walk every item exactly once, newest first", async () => {
    for (let i = 0; i < 5; i += 1) await createItem(item(`Item ${i}`));

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res = await getItems(`?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: Item[]; nextCursor: string | null };
      expect(body.items.length).toBeLessThanOrEqual(2);
      seen.push(...body.items.map((entry) => entry.title));
      cursor = body.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen).toEqual(["Item 4", "Item 3", "Item 2", "Item 1", "Item 0"]);
  });

  it("items filter and bounds: status filter, default limit 20, invalid input 400", async () => {
    const a = await createItem(item("A"));
    await createItem(item("B"));
    await updateItem(a.id, { status: "sold" });

    const publicItems = (await (await getItems("")).json()) as { items: Item[] };
    expect(publicItems.items.map((entry) => entry.title)).toEqual(["B"]);
    const sold = (await (await getAdminItems("?status=sold")).json()) as { items: Item[] };
    expect(sold.items.map((entry) => entry.title)).toEqual(["A"]);

    for (let i = 0; i < 25; i += 1) await createItem(item(`More ${i}`));
    const firstPage = (await (await getItems("")).json()) as { items: Item[]; nextCursor: string | null };
    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.nextCursor).not.toBeNull();

    for (const bad of ["?limit=0", "?limit=101", "?limit=abc", "?status=lost", "?status=sold", "?cursor=@@@"]) {
      const res = await getItems(bad);
      expect(res.status, bad).toBe(400);
    }
  });

  it("orders pages: admin orders paginate with nextCursor and filter by status", async () => {
    for (let i = 0; i < 3; i += 1) {
      const created = await createItem(item(`Item ${i}`));
      await createOrder(order(created.id, `5199999000${i}`));
    }
    const first = (await (await getOrders("?limit=2")).json()) as { orders: Order[]; nextCursor: string };
    expect(first.orders).toHaveLength(2);
    const second = (await (await getOrders(`?limit=2&cursor=${first.nextCursor}`)).json()) as {
      orders: Order[];
      nextCursor: string | null;
    };
    expect(second.orders).toHaveLength(1);
    expect(second.nextCursor).toBeNull();

    const confirmed = (await (await getOrders("?status=confirmed")).json()) as { orders: Order[] };
    expect(confirmed.orders).toHaveLength(0);
  });
});
