import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://tiangpass:tiangpass@127.0.0.1:5432/tiangpass";

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

export const pg =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = pg;
}

export const db = drizzle(pg, { schema });
