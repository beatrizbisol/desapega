import { promises as fs } from "fs";
import path from "path";
import type { CreateItemInput, CreateOrderInput, Item, Order } from "./types";

const dataDir = path.join(process.cwd(), "data");
const itemsPath = path.join(dataDir, "items.json");
const ordersPath = path.join(dataDir, "orders.json");

/** Pending reservations expire after 24h without payment confirmation. */
export const RESERVATION_MS = 24 * 60 * 60 * 1000;

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(itemsPath);
  } catch {
    await fs.writeFile(itemsPath, "[]\n", "utf8");
  }
  try {
    await fs.access(ordersPath);
  } catch {
    await fs.writeFile(ordersPath, "[]\n", "utf8");
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  await ensureDataFiles();
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson<T>(filePath: string, data: T) {
  await ensureDataFiles();
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function releaseExpiredReservations() {
  const [items, orders] = await Promise.all([
    readJson<Item[]>(itemsPath),
    readJson<Order[]>(ordersPath),
  ]);
  const now = Date.now();
  let changed = false;

  for (const order of orders) {
    if (order.status !== "pending") continue;
    const age = now - new Date(order.createdAt).getTime();
    if (age < RESERVATION_MS) continue;

    order.status = "cancelled";
    changed = true;

    const item = items.find((entry) => entry.id === order.itemId);
    if (item && item.status === "reserved") {
      item.status = "available";
      item.updatedAt = new Date().toISOString();
    }
  }

  if (!changed) return;
  await Promise.all([writeJson(itemsPath, items), writeJson(ordersPath, orders)]);
}

export async function listItems(): Promise<Item[]> {
  await releaseExpiredReservations();
  const items = await readJson<Item[]>(itemsPath);
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getItem(id: string): Promise<Item | null> {
  const items = await listItems();
  return items.find((item) => item.id === id) ?? null;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const items = await listItems();
  const now = new Date().toISOString();
  const item: Item = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    photos: input.photos,
    status: "available",
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(item);
  await writeJson(itemsPath, items);
  return item;
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<Item, "title" | "description" | "price" | "photos" | "status">>,
): Promise<Item | null> {
  const items = await listItems();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const updated: Item = {
    ...items[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  items[index] = updated;
  await writeJson(itemsPath, items);
  return updated;
}

export async function deleteItem(id: string): Promise<boolean> {
  const items = await listItems();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeJson(itemsPath, next);
  return true;
}

export async function listOrders(): Promise<Order[]> {
  await releaseExpiredReservations();
  const orders = await readJson<Order[]>(ordersPath);
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const item = await getItem(input.itemId);
  if (!item) {
    throw new Error("ITEM_NOT_FOUND");
  }
  if (item.status !== "available") {
    throw new Error("ITEM_UNAVAILABLE");
  }

  const order: Order = {
    id: crypto.randomUUID(),
    itemId: item.id,
    itemTitle: item.title,
    buyerName: input.buyerName.trim(),
    buyerPhone: input.buyerPhone.trim(),
    paymentMethod: input.paymentMethod,
    deliveryMethod: input.deliveryMethod,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const orders = await readJson<Order[]>(ordersPath);
  orders.unshift(order);
  await writeJson(ordersPath, orders);
  await updateItem(item.id, { status: "reserved" });
  return order;
}

export function assertAdmin(request: Request) {
  const expected = process.env.ADMIN_SECRET || "mudanca2026";
  const header = request.headers.get("x-admin-secret");
  if (header !== expected) {
    throw new Error("UNAUTHORIZED");
  }
}
