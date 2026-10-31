import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

export async function useTempDataDir() {
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
