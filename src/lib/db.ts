import { promises as fs } from "fs";
import { Pool, type PoolClient } from "pg";

type Holder = typeof globalThis & {
  __desapegaPool?: { url: string; pool: Pool; ready: Promise<void> };
};
const holder = globalThis as Holder;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price > 0),
  photos text[] NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('available', 'reserved', 'sold')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  item_id text NOT NULL,
  item_title text NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'card')),
  delivery_method text NOT NULL CHECK (delivery_method IN ('pickup', 'uber_flash', 'correios')),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- invariant: at most one pending reservation per item and per phone, enforced by
-- the database so concurrent requests cannot both succeed.
CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending_per_item
  ON orders (item_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending_per_phone
  ON orders (buyer_phone) WHERE status = 'pending';
`;

async function seedItems(pool: Pool) {
  const seedPath = process.env.SEED_ITEMS_PATH?.trim();
  if (!seedPath) return;
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM items");
  if (rows[0].n > 0) return;
  const items = JSON.parse(await fs.readFile(seedPath, "utf8")) as Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    photos: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  // why: the seed lists photos as site paths (/items/...); once they live in R2
  // they are served from MEDIA_BASE_URL instead.
  const base = process.env.MEDIA_BASE_URL?.trim().replace(/\/+$/, "");
  const photoUrl = (photo: string) => (base && photo.startsWith("/") ? `${base}${photo}` : photo);
  for (const item of items) {
    item.photos = item.photos.map(photoUrl);
    await pool.query(
      `INSERT INTO items (id, title, description, price, photos, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
      [item.id, item.title, item.description, item.price, item.photos, item.status, item.createdAt, item.updatedAt],
    );
  }
}

// why: the pool lives on globalThis because the production server loads this
// module separately for pages and route handlers; one pool per copy would double
// the connections and run the schema setup twice.
async function getPool() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set");
  if (holder.__desapegaPool?.url !== url) {
    const pool = new Pool({ connectionString: url, max: 5 });
    const ready = pool
      .query(SCHEMA)
      .then(() => seedItems(pool))
      .catch(async (error) => {
        // why: without dropping the failed pool, one startup error (database not
        // up yet) would make every later request fail until a restart.
        delete holder.__desapegaPool;
        await pool.end().catch(() => undefined);
        throw error;
      });
    holder.__desapegaPool = { url, pool, ready };
  }
  const { pool, ready } = holder.__desapegaPool;
  await ready;
  return pool;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const pool = await getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
