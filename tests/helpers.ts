import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { query } from "@/lib/db";

const DATABASE_URL = process.env.DATABASE_URL;
export const BROKEN_DATABASE_URL = "postgres://nobody:none@127.0.0.1:1/none";

export async function useTempDataDir() {
  process.env.DATABASE_URL = DATABASE_URL;
  await query("TRUNCATE items, orders");
  const dir = await mkdtemp(path.join(os.tmpdir(), "desapega-test-"));
  process.env.DATA_DIR = dir;
  process.env.UPLOADS_DIR = path.join(dir, "uploads");
  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

export const order = (itemId: string, buyerPhone = "51999998888") => ({
  itemId,
  buyerName: "Ana",
  buyerPhone,
  paymentMethod: "pix" as const,
  deliveryMethod: "pickup" as const,
});

export const item = (title = "Cadeira") => ({
  title,
  description: "Boa",
  price: 100,
  photos: ["/items/cadeira/frente.jpg"],
});
