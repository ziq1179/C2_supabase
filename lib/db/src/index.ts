import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let connectionString = process.env.DATABASE_URL;
const isSupabaseDev =
  connectionString?.includes("supabase.com") &&
  process.env.NODE_ENV === "development";
if (isSupabaseDev) {
  connectionString = connectionString.replace(
    "sslmode=require",
    "sslmode=no-verify"
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
