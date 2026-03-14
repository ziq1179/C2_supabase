import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

// WebRTC types are browser-only; we pass through as opaque objects
type SdpLike = object;
type IceCandidateLike = object;

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

    socket.on("call:start", (data: { targetUserId: string; conversationId: number }) => {
      const { targetUserId, conversationId } = data;
      if (!targetUserId || !conversationId) return;
      const fromName = (socket.handshake.auth as { fromName?: string })?.fromName ?? "Someone";
      io.to(`user:${targetUserId}`).emit("call:incoming", {
        fromUserId: userId,
        fromName,
        conversationId,
      });
    });

    socket.on("call:offer", (data: { toUserId: string; sdp: SdpLike }) => {
      const { toUserId, sdp } = data;
      if (!toUserId || !sdp) return;
      io.to(`user:${toUserId}`).emit("call:offer", { fromUserId: userId, sdp });
    });

    socket.on("call:answer", (data: { toUserId: string; sdp: SdpLike }) => {
      const { toUserId, sdp } = data;
      if (!toUserId || !sdp) return;
      io.to(`user:${toUserId}`).emit("call:answer", { fromUserId: userId, sdp });
    });

    socket.on("call:ice", (data: { toUserId: string; candidate: IceCandidateLike }) => {
      const { toUserId, candidate } = data;
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:ice", { fromUserId: userId, candidate });
    });

    socket.on("call:decline", (data: { toUserId: string }) => {
      const { toUserId } = data;
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:decline", { fromUserId: userId });
    });

    socket.on("call:end", (data: { toUserId: string }) => {
      const { toUserId } = data;
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:end", { fromUserId: userId });
    });

    socket.on("disconnect", () => {
      // User left; rooms are auto-cleaned
    });
  });

  return io;
}
