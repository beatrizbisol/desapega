import { writeFile } from "fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listItems, updateItem } from "@/lib/store";
import { useTempDataDir } from "./helpers";

let tmp: Awaited<ReturnType<typeof useTempDataDir>>;

beforeEach(async () => {
  tmp = await useTempDataDir();
});

afterEach(async () => {
  delete process.env.SEED_ITEMS_PATH;
  delete process.env.MEDIA_BASE_URL;
  await tmp.cleanup();
});

describe("seed", () => {
  it("seed: an empty database is filled from SEED_ITEMS_PATH with photos under MEDIA_BASE_URL", async () => {
    const seedPath = path.join(tmp.dir, "items.json");
    await writeFile(
      seedPath,
      JSON.stringify([
        {
          id: "cadeira-escritorio-mesh",
          title: "Cadeira",
          description: "Boa",
          price: 120,
          photos: ["/items/cadeira/frente.jpg", "https://elsewhere.test/x.jpg"],
          status: "available",
          createdAt: "2026-10-01T10:00:00.000Z",
          updatedAt: "2026-10-01T10:00:00.000Z",
        },
      ]),
    );
    process.env.SEED_ITEMS_PATH = seedPath;
    process.env.MEDIA_BASE_URL = "https://media.useclubapp.com";
    // why: a new connection string forces a fresh pool, which is when seeding runs.
    process.env.DATABASE_URL = `${process.env.DATABASE_URL}?application_name=seed-test`;

    const items = await listItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "cadeira-escritorio-mesh", title: "Cadeira", price: 120, status: "available" });
    expect(items[0].photos).toEqual([
      "https://media.useclubapp.com/items/cadeira/frente.jpg",
      "https://elsewhere.test/x.jpg",
    ]);
  });

  it("seed: a database that already has items gains new seed rows and keeps edits", async () => {
    const seedPath = path.join(tmp.dir, "items.json");
    const base = process.env.DATABASE_URL;
    const chair = {
      id: "cadeira-escritorio-mesh",
      title: "Cadeira",
      description: "Boa",
      price: 120,
      photos: ["/items/cadeira/frente.jpg"],
      status: "available",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    await writeFile(seedPath, JSON.stringify([chair]));
    process.env.SEED_ITEMS_PATH = seedPath;
    process.env.MEDIA_BASE_URL = "https://media.useclubapp.com";
    process.env.DATABASE_URL = `${base}?application_name=seed-keep`;

    const seeded = await listItems();
    expect(seeded).toHaveLength(1);
    await updateItem(chair.id, { price: 80, status: "reserved" });

    await writeFile(
      seedPath,
      JSON.stringify([
        { ...chair, price: 999 },
        {
          id: "monitor-dell-se2216h",
          title: "Monitor",
          description: "Dell",
          price: 250,
          photos: ["/items/monitor-dell-se2216h/frente.jpg"],
          status: "available",
          createdAt: "2026-10-31T01:20:00.000Z",
          updatedAt: "2026-10-31T01:20:00.000Z",
        },
      ]),
    );
    process.env.DATABASE_URL = `${base}?application_name=seed-keep-2`;

    const items = await listItems();
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.id === chair.id)).toMatchObject({ price: 80, status: "reserved" });
    expect(items.find((item) => item.id === "monitor-dell-se2216h")).toMatchObject({
      price: 250,
      photos: ["/items/monitor-dell-se2216h/frente.jpg"],
    });
  });
});
