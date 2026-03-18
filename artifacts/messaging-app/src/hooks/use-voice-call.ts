import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

export type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected" | "ended" | "declined";

type IncomingCall = {
  callId: string;
  fromUserId: string;
  fromName: string;
  conversationId: number;
};

export function useVoiceCall(
  userId: string | undefined,
  userName: string
) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteName, setRemoteName] = useState<string>("");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<{ fromUserId: string; sdp: RTCSessionDescriptionInit } | null>(null);

  const cleanupCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setRemoteStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    setCallStatus("idle");
    setIsOutgoingCall(false);
    setRemoteUserId(null);
    setRemoteName("");
    setIncomingCall(null);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const baseUrl = import.meta.env.PROD ? window.location.origin : "http://localhost:3000";
    const socket = io(baseUrl, {
      path: "/socket.io",
      withCredentials: true,
      auth: { userId, fromName: userName },
    });
    socketRef.current = socket;

    socket.on("call:incoming", (data: IncomingCall) => {
      setIncomingCall(data);
      setCallStatus("incoming");
    });

    socket.on("call:offer", (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      pendingOfferRef.current = data;
    });

    socket.on("call:answer", async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        setCallStatus("connected");
      } catch (err) {
        console.error("Set remote description error:", err);
        cleanupCall();
      }
    });

    socket.on("call:ice", (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
    });

    socket.on("call:decline", () => {
      setCallStatus("declined");
      setTimeout(cleanupCall, 1500);
    });

    socket.on("call:end", () => {
      cleanupCall();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      cleanupCall();
    };
  }, [userId, userName, cleanupCall]);

  const startCall = useCallback(async (targetUserId: string, targetName: string, conversationId: number) => {
    if (!userId || !socketRef.current) return;
    const callId = crypto.randomUUID();
    activeCallIdRef.current = callId;
    setRemoteUserId(targetUserId);
    setRemoteName(targetName);
    setIsOutgoingCall(true);
    setCallStatus("calling");
    socketRef.current.emit("call:start", { targetUserId, conversationId, callId });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVERS }] });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          remoteStreamRef.current = e.streams[0];
          setRemoteStream(e.streams[0]);
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socketRef.current?.emit("call:ice", { toUserId: targetUserId, candidate: e.candidate });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("call:offer", { toUserId: targetUserId, sdp: pc.localDescription });
      setCallStatus("connecting");
    } catch (err) {
      console.error("Start call error:", err);
      cleanupCall();
    }
  }, [userId, cleanupCall]);

  const answerCall = useCallback(async () => {
    const call = incomingCall;
    const offer = pendingOfferRef.current;
    if (!call || !socketRef.current) return;
    if (!offer || offer.fromUserId !== call.fromUserId) {
      console.warn("No offer received yet");
      return;
    }
    activeCallIdRef.current = call.callId;
    setRemoteUserId(call.fromUserId);
    setRemoteName(call.fromName);
    setIncomingCall(null);
    pendingOfferRef.current = null;
    setIsOutgoingCall(false);
    setCallStatus("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVERS }] });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          remoteStreamRef.current = e.streams[0];
          setRemoteStream(e.streams[0]);
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socketRef.current?.emit("call:ice", { toUserId: call.fromUserId, candidate: e.candidate });
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("call:answer", { toUserId: call.fromUserId, sdp: pc.localDescription, callId: call.callId });
      setCallStatus("connected");
    } catch (err) {
      console.error("Answer call error:", err);
      cleanupCall();
    }
  }, [incomingCall, cleanupCall]);

  const declineCall = useCallback(() => {
    const call = incomingCall;
    if (!call || !socketRef.current) return;
    socketRef.current.emit("call:decline", { toUserId: call.fromUserId, callId: call.callId });
    setIncomingCall(null);
    setCallStatus("idle");
  }, [incomingCall]);

  const endCall = useCallback(() => {
    const target = remoteUserId;
    const callId = activeCallIdRef.current;
    if (target && socketRef.current) {
      socketRef.current.emit("call:end", { toUserId: target, callId: callId ?? undefined });
    }
    activeCallIdRef.current = null;
    cleanupCall();
  }, [remoteUserId, cleanupCall]);

  return {
    callStatus,
    isOutgoingCall,
    remoteUserId,
    remoteName,
    incomingCall,
    remoteStream,
    startCall,
    answerCall,
    declineCall,
    endCall,
  };
}
