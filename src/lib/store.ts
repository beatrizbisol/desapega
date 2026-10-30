import { promises as fs } from "fs";
import path from "path";
import type { CreateItemInput, CreateOrderInput, Item, Order } from "./types";

/** Pending reservations expire after 24h without payment confirmation. */
export const RESERVATION_MS = 24 * 60 * 60 * 1000;

// why: read at call time so DATA_DIR can point outside the repo in production
export function dataDir() {
  return process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
}

const itemsPath = () => path.join(dataDir(), "items.json");
const ordersPath = () => path.join(dataDir(), "orders.json");

// invariant: every exported operation runs inside this chain, one at a time, so a
// read-modify-write never interleaves with another and two reservations of the
// same item cannot both see it as available.
let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function ensureDataFiles() {
  await fs.mkdir(dataDir(), { recursive: true });
  for (const filePath of [itemsPath(), ordersPath()]) {
    try {
      await fs.access(filePath);
    } catch {
      await writeAtomic(filePath, "[]\n");
    }
  }
}

// invariant: the destination always holds a complete file; a crash mid-write
// leaves only a stray .tmp next to it.
async function writeAtomic(filePath: string, content: string) {
  const tmpPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, content, "utf8");
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  await ensureDataFiles();
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson<T>(filePath: string, data: T) {
  await ensureDataFiles();
  await writeAtomic(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function releaseExpiredReservations() {
  const [items, orders] = await Promise.all([
    readJson<Item[]>(itemsPath()),
    readJson<Order[]>(ordersPath()),
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
  await Promise.all([writeJson(itemsPath(), items), writeJson(ordersPath(), orders)]);
}

async function listItemsUnlocked(): Promise<Item[]> {
  await releaseExpiredReservations();
  const items = await readJson<Item[]>(itemsPath());
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function getItemUnlocked(id: string): Promise<Item | null> {
  const items = await listItemsUnlocked();
  return items.find((item) => item.id === id) ?? null;
}

async function createItemUnlocked(input: CreateItemInput): Promise<Item> {
  const items = await listItemsUnlocked();
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
  await writeJson(itemsPath(), items);
  return item;
}

async function updateItemUnlocked(
  id: string,
  patch: Partial<Pick<Item, "title" | "description" | "price" | "photos" | "status">>,
): Promise<Item | null> {
  const items = await listItemsUnlocked();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const updated: Item = {
    ...items[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  items[index] = updated;
  await writeJson(itemsPath(), items);
  return updated;
}

async function deleteItemUnlocked(id: string): Promise<boolean> {
  const items = await listItemsUnlocked();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeJson(itemsPath(), next);
  return true;
}

async function listOrdersUnlocked(): Promise<Order[]> {
  await releaseExpiredReservations();
  const orders = await readJson<Order[]>(ordersPath());
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function createOrderUnlocked(input: CreateOrderInput): Promise<Order> {
  const item = await getItemUnlocked(input.itemId);
  if (!item) {
    throw new Error("ITEM_NOT_FOUND");
  }
  if (item.status !== "available") {
    throw new Error("ITEM_UNAVAILABLE");
  }

  const orders = await readJson<Order[]>(ordersPath());
  const phone = input.buyerPhone.trim();
  if (orders.some((entry) => entry.status === "pending" && entry.buyerPhone === phone)) {
    throw new Error("PHONE_HAS_PENDING");
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

  orders.unshift(order);
  await writeJson(ordersPath(), orders);
  await updateItemUnlocked(item.id, { status: "reserved" });
  return order;
}

async function updateOrderStatusUnlocked(
  id: string,
  status: Order["status"],
): Promise<Order | null> {
  await releaseExpiredReservations();
  const orders = await readJson<Order[]>(ordersPath());
  const index = orders.findIndex((order) => order.id === id);
  if (index < 0) return null;

  const current = orders[index];
  if (current.status === status) return current;

  const updated: Order = { ...current, status };
  orders[index] = updated;
  await writeJson(ordersPath(), orders);

  if (status === "confirmed") {
    await updateItemUnlocked(current.itemId, { status: "sold" });
  } else if (status === "cancelled") {
    const item = await getItemUnlocked(current.itemId);
    if (item && item.status === "reserved") {
      await updateItemUnlocked(current.itemId, { status: "available" });
    }
  }

  return updated;
}

export const listItems = () => serialized(listItemsUnlocked);
export const getItem = (id: string) => serialized(() => getItemUnlocked(id));
export const createItem = (input: CreateItemInput) =>
  serialized(() => createItemUnlocked(input));
export const updateItem = (...args: Parameters<typeof updateItemUnlocked>) =>
  serialized(() => updateItemUnlocked(...args));
export const deleteItem = (id: string) => serialized(() => deleteItemUnlocked(id));
export const listOrders = () => serialized(listOrdersUnlocked);
export const createOrder = (input: CreateOrderInput) =>
  serialized(() => createOrderUnlocked(input));
export const updateOrderStatus = (...args: Parameters<typeof updateOrderStatusUnlocked>) =>
  serialized(() => updateOrderStatusUnlocked(...args));

export function assertAdmin(request: Request) {
  const expected = process.env.ADMIN_SECRET?.trim();
  const header = request.headers.get("x-admin-secret");
  if (!expected || header !== expected) {
    throw new Error("UNAUTHORIZED");
  }
}
