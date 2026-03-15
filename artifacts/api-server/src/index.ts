import http from "http";
import app from "./app";
import { pool } from "@workspace/db";
import { createSignalingServer } from "./voice/signaling";

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id          SERIAL PRIMARY KEY,
        message_id  INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL,
        emoji       TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_unique_idx
        ON message_reactions (message_id, user_id, emoji);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_history (
        id          SERIAL PRIMARY KEY,
        call_id     TEXT NOT NULL UNIQUE,
        caller_id   TEXT NOT NULL,
        callee_id   TEXT NOT NULL,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        status      TEXT NOT NULL,
        started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at    TIMESTAMPTZ
      );
    `);
    console.log("Migrations applied");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runMigrations().then(() => {
  const httpServer = http.createServer(app);
  createSignalingServer(httpServer);
  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
