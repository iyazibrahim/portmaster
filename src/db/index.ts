import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { asSqlTimestamp } from "../lib/sql-value";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://tiangpass:tiangpass@127.0.0.1:5432/tiangpass";

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const DATE_OID = 1082;
const TIMESTAMP_OID = 1114;
const TIMESTAMPTZ_OID = 1184;

export const pg =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: 10,
    // Simple protocol is required for PgBouncer / some Docker poolers.
    // Next.js can drop postgres.js Date serializers in this mode, so we
    // register them explicitly and still pass ISO strings from login.
    prepare: false,
    types: {
      date: {
        to: TIMESTAMPTZ_OID,
        from: [DATE_OID, TIMESTAMP_OID, TIMESTAMPTZ_OID],
        serialize: asSqlTimestamp,
        parse: (value: string) => new Date(value),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = pg;
}

export const db = drizzle(pg, { schema });
