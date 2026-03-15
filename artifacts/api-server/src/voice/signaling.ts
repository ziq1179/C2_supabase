import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { callHistoryTable } from "@workspace/db/schema";

// WebRTC types are browser-only; we pass through as opaque objects
type SdpLike = object;
type IceCandidateLike = object;

async function logCallStart(data: {
  callId: string;
  callerId: string;
  calleeId: string;
  conversationId: number;
}) {
  try {
    await db.insert(callHistoryTable).values({
      callId: data.callId,
      callerId: data.callerId,
      calleeId: data.calleeId,
      conversationId: data.conversationId,
      status: "ringing",
    });
  } catch (err) {
    console.error("Failed to log call start:", err);
  }
}

async function logCallUpdate(
  callId: string,
  updates: { status: "answered" | "declined" | "end" }
) {
  try {
    const [existing] = await db
      .select()
      .from(callHistoryTable)
      .where(eq(callHistoryTable.callId, callId))
      .limit(1);
    if (!existing) return;
    const newStatus =
      updates.status === "end" && existing.status === "ringing"
        ? "missed"
        : updates.status === "end"
          ? existing.status
          : updates.status;
    const endedAt =
      updates.status === "end" || newStatus === "declined"
        ? new Date()
        : undefined;
    await db
      .update(callHistoryTable)
      .set({ status: newStatus, ...(endedAt && { endedAt }) })
      .where(eq(callHistoryTable.callId, callId));
  } catch (err) {
    console.error("Failed to log call update:", err);
  }
}

export function createSignalingServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket.handshake.auth as { userId?: string })?.userId;
    if (!userId || typeof userId !== "string") {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);

    socket.on(
      "call:start",
      (data: { targetUserId: string; conversationId: number; callId: string }) => {
        const { targetUserId, conversationId, callId } = data;
        if (!targetUserId || !conversationId || !callId) return;
        const fromName =
          (socket.handshake.auth as { fromName?: string })?.fromName ?? "Someone";
        io.to(`user:${targetUserId}`).emit("call:incoming", {
          callId,
          fromUserId: userId,
          fromName,
          conversationId,
        });
        logCallStart({
          callId,
          callerId: userId,
          calleeId: targetUserId,
          conversationId,
        });
      }
    );

    socket.on("call:offer", (data: { toUserId: string; sdp: SdpLike }) => {
      const { toUserId, sdp } = data;
      if (!toUserId || !sdp) return;
      io.to(`user:${toUserId}`).emit("call:offer", { fromUserId: userId, sdp });
    });

    socket.on(
      "call:answer",
      (data: { toUserId: string; sdp: SdpLike; callId?: string }) => {
        const { toUserId, sdp, callId } = data;
        if (!toUserId || !sdp) return;
        io.to(`user:${toUserId}`).emit("call:answer", {
          fromUserId: userId,
          sdp,
          callId,
        });
        if (callId) await logCallUpdate(callId, { status: "answered" });
      }
    );

    socket.on("call:ice", (data: { toUserId: string; candidate: IceCandidateLike }) => {
      const { toUserId, candidate } = data;
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:ice", {
        fromUserId: userId,
        candidate,
      });
    });

    socket.on(
      "call:decline",
      (data: { toUserId: string; callId?: string }) => {
        const { toUserId, callId } = data;
        if (!toUserId) return;
        io.to(`user:${toUserId}`).emit("call:decline", { fromUserId: userId });
        if (callId) await logCallUpdate(callId, { status: "declined" });
      }
    );

    socket.on("call:end", (data: { toUserId: string; callId?: string }) => {
      const { toUserId, callId } = data;
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:end", { fromUserId: userId });
      if (callId) await logCallUpdate(callId, { status: "end" });
    });

    socket.on("disconnect", () => {
      // User left; rooms are auto-cleaned
    });
  });

  return io;
}
