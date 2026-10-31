import path from "path";
import type { PoolClient } from "pg";
import { query, transaction } from "./db";
import type { CreateItemInput, CreateOrderInput, Item, Order } from "./types";

/** Pending reservations expire after 24h without payment confirmation. */
export const RESERVATION_MS = 24 * 60 * 60 * 1000;

export function dataDir() {
  return process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
}

type ItemRow = {
  id: string;
  title: string;
  description: string;
  price: string;
  photos: string[];
  status: Item["status"];
  created_at: Date;
  updated_at: Date;
};

type OrderRow = {
  id: string;
  item_id: string;
  item_title: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: Order["paymentMethod"];
  delivery_method: Order["deliveryMethod"];
  status: Order["status"];
  created_at: Date;
};

const toItem = (row: ItemRow): Item => ({
  id: row.id,
  title: row.title,
  description: row.description,
  price: Number(row.price),
  photos: row.photos,
  status: row.status,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const toOrder = (row: OrderRow): Order => ({
  id: row.id,
  itemId: row.item_id,
  itemTitle: row.item_title,
  buyerName: row.buyer_name,
  buyerPhone: row.buyer_phone,
  paymentMethod: row.payment_method,
  deliveryMethod: row.delivery_method,
  status: row.status,
  createdAt: row.created_at.toISOString(),
});

function isUniqueViolation(error: unknown, constraint: string) {
  const pgError = error as { code?: string; constraint?: string };
  return pgError?.code === "23505" && pgError.constraint === constraint;
}

// why: the cutoff comes from the app clock, so expiry follows the same clock
// RESERVATION_MS and the tests measure against.
async function releaseExpiredReservations() {
  const cutoff = new Date(Date.now() - RESERVATION_MS);
  await transaction(async (client) => {
    const { rows } = await client.query<{ item_id: string }>(
      `UPDATE orders SET status = 'cancelled'
       WHERE status = 'pending' AND created_at < $1
       RETURNING item_id`,
      [cutoff],
    );
    if (rows.length === 0) return;
    await client.query(
      `UPDATE items SET status = 'available', updated_at = now()
       WHERE id = ANY($1::text[]) AND status = 'reserved'`,
      [rows.map((row) => row.item_id)],
    );
  });
}

export async function listItems(): Promise<Item[]> {
  await releaseExpiredReservations();
  const rows = await query<ItemRow>("SELECT * FROM items ORDER BY created_at DESC");
  return rows.map(toItem);
}

export async function getItem(id: string): Promise<Item | null> {
  await releaseExpiredReservations();
  const rows = await query<ItemRow>("SELECT * FROM items WHERE id = $1", [id]);
  return rows[0] ? toItem(rows[0]) : null;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const rows = await query<ItemRow>(
    `INSERT INTO items (id, title, description, price, photos, status)
     VALUES ($1, $2, $3, $4, $5, 'available') RETURNING *`,
    [crypto.randomUUID(), input.title.trim(), input.description.trim(), input.price, input.photos],
  );
  return toItem(rows[0]);
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<Item, "title" | "description" | "price" | "photos" | "status">>,
): Promise<Item | null> {
  const rows = await query<ItemRow>(
    `UPDATE items SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       price = COALESCE($4, price),
       photos = COALESCE($5, photos),
       status = COALESCE($6, status),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      patch.title ?? null,
      patch.description ?? null,
      patch.price ?? null,
      patch.photos ?? null,
      patch.status ?? null,
    ],
  );
  return rows[0] ? toItem(rows[0]) : null;
}

export async function deleteItem(id: string): Promise<boolean> {
  const rows = await query("DELETE FROM items WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}

export async function listOrders(): Promise<Order[]> {
  await releaseExpiredReservations();
  const rows = await query<OrderRow>("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(toOrder);
}

async function lockItem(client: PoolClient, id: string) {
  const { rows } = await client.query<ItemRow>(
    "SELECT * FROM items WHERE id = $1 FOR UPDATE",
    [id],
  );
  return rows[0] ?? null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  await releaseExpiredReservations();
  try {
    return await transaction(async (client) => {
      const item = await lockItem(client, input.itemId);
      if (!item) throw new Error("ITEM_NOT_FOUND");
      if (item.status !== "available") throw new Error("ITEM_UNAVAILABLE");

      const { rows } = await client.query<OrderRow>(
        `INSERT INTO orders (id, item_id, item_title, buyer_name, buyer_phone,
                             payment_method, delivery_method, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
        [
          crypto.randomUUID(),
          item.id,
          item.title,
          input.buyerName.trim(),
          input.buyerPhone.trim(),
          input.paymentMethod,
          input.deliveryMethod,
        ],
      );
      await client.query(
        "UPDATE items SET status = 'reserved', updated_at = now() WHERE id = $1",
        [item.id],
      );
      return toOrder(rows[0]);
    });
  } catch (error) {
    if (isUniqueViolation(error, "orders_one_pending_per_phone")) {
      throw new Error("PHONE_HAS_PENDING");
    }
    if (isUniqueViolation(error, "orders_one_pending_per_item")) {
      throw new Error("ITEM_UNAVAILABLE");
    }
    throw error;
  }
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"],
): Promise<Order | null> {
  await releaseExpiredReservations();
  return transaction(async (client) => {
    const { rows } = await client.query<OrderRow>(
      "SELECT * FROM orders WHERE id::text = $1 FOR UPDATE",
      [id],
    );
    const current = rows[0];
    if (!current) return null;
    if (current.status === status) return toOrder(current);
    if (current.status !== "pending" && status !== "cancelled") {
      throw new Error("INVALID_TRANSITION");
    }

    const updated = await client.query<OrderRow>(
      "UPDATE orders SET status = $2 WHERE id = $1 RETURNING *",
      [current.id, status],
    );
    if (status === "confirmed") {
      await client.query(
        "UPDATE items SET status = 'sold', updated_at = now() WHERE id = $1",
        [current.item_id],
      );
    } else if (status === "cancelled") {
      await client.query(
        "UPDATE items SET status = 'available', updated_at = now() WHERE id = $1 AND status = 'reserved'",
        [current.item_id],
      );
    }
    return toOrder(updated.rows[0]);
  });
}

export const PAGE_DEFAULT = 20;
export const PAGE_MAX = 100;

export type PageQuery = { limit: number; cursor: string | null; status: string | null };
export type Page<T> = { rows: T[]; nextCursor: string | null };

// invariant: a cursor is the (created_at, id) of the last row served, with
// created_at as Postgres text so microseconds survive; ordering by both columns
// makes every row appear on exactly one page even when timestamps tie.
function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(JSON.stringify([createdAt, id])).toString("base64url");
}

function decodeCursor(cursor: string) {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "string" &&
      !Number.isNaN(Date.parse(value[0])) &&
      typeof value[1] === "string"
    ) {
      return value as [string, string];
    }
  } catch {}
  throw new Error("INVALID_CURSOR");
}

async function listPage<Row extends { id: string }, T>(
  table: "items" | "orders",
  page: PageQuery,
  map: (row: Row) => T,
): Promise<Page<T>> {
  await releaseExpiredReservations();
  const params: unknown[] = [];
  const where: string[] = [];
  if (page.status) {
    params.push(page.status);
    where.push(`status = $${params.length}`);
  }
  if (page.cursor) {
    const [createdAt, id] = decodeCursor(page.cursor);
    params.push(createdAt, id);
    where.push(`(created_at, id::text) < ($${params.length - 1}::timestamptz, $${params.length})`);
  }
  params.push(page.limit + 1);
  const rows = await query<Row & { cursor_ts: string }>(
    `SELECT *, created_at::text AS cursor_ts FROM ${table}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC, id::text DESC
     LIMIT $${params.length}`,
    params,
  );
  const hasMore = rows.length > page.limit;
  const served = rows.slice(0, page.limit);
  const last = served[served.length - 1];
  return {
    rows: served.map(map),
    nextCursor: hasMore && last ? encodeCursor(last.cursor_ts, String(last.id)) : null,
  };
}

export const listItemsPage = (page: PageQuery) => listPage<ItemRow, Item>("items", page, toItem);
export const listOrdersPage = (page: PageQuery) => listPage<OrderRow, Order>("orders", page, toOrder);
