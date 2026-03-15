import { Router, type IRouter } from "express";
import { desc, or, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { callHistoryTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const userId = req.user.id;

  const calls = await db
    .select({
      id: callHistoryTable.id,
      callId: callHistoryTable.callId,
      callerId: callHistoryTable.callerId,
      calleeId: callHistoryTable.calleeId,
      conversationId: callHistoryTable.conversationId,
      status: callHistoryTable.status,
      startedAt: callHistoryTable.startedAt,
      endedAt: callHistoryTable.endedAt,
    })
    .from(callHistoryTable)
    .where(
      or(eq(callHistoryTable.callerId, userId), eq(callHistoryTable.calleeId, userId))
    )
    .orderBy(desc(callHistoryTable.startedAt))
    .limit(100);

  const otherIds = [...new Set(calls.flatMap((c) => [c.callerId, c.calleeId]))].filter(
    (id) => id !== userId
  );
  const otherUsers =
    otherIds.length > 0
      ? await db
          .select({
            id: usersTable.id,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, otherIds))
      : [];
  const userMap = new Map(
    otherUsers.map((u) => [u.id, { firstName: u.firstName, lastName: u.lastName }])
  );

  const result = calls.map((c) => {
    const otherId = c.callerId === userId ? c.calleeId : c.callerId;
    const otherUser = userMap.get(otherId);
    const direction = c.callerId === userId ? "outgoing" : "incoming";
    const otherName = otherUser
      ? `${otherUser.firstName} ${otherUser.lastName}`.trim()
      : "Unknown";
    const duration =
      c.endedAt && c.status === "answered"
        ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000)
        : null;
    return {
      id: c.id,
      callId: c.callId,
      conversationId: c.conversationId,
      otherUserId: otherId,
      otherName,
      direction,
      status: c.status,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationSeconds: duration,
    };
  });

  return res.json(result);
});

export default router;
