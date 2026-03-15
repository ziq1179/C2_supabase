import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { conversationsTable } from "./messages";

export const callHistoryTable = pgTable("call_history", {
  id: serial("id").primaryKey(),
  callId: text("call_id").notNull().unique(),
  callerId: text("caller_id").notNull(),
  calleeId: text("callee_id").notNull(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'ringing' | 'answered' | 'missed' | 'declined'
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export type CallHistoryRecord = typeof callHistoryTable.$inferSelect;
