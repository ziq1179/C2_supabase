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
// Supabase's pooler cert chain can fail strict verification with Node.js pg
const isSupabase = connectionString?.includes("supabase.com");
if (isSupabase && connectionString.includes("sslmode=require")) {
  connectionString = connectionString.replace(
    "sslmode=require",
    "sslmode=no-verify"
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
