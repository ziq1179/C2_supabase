import { useEffect, useRef } from "react";
import { PhoneOff, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";

type ActiveCallBarProps = {
  remoteName: string;
  callStatus: "calling" | "connecting" | "connected";
  isOutgoingCall: boolean;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
};

export function ActiveCallBar({ remoteName, callStatus, isOutgoingCall, remoteStream, onEndCall }: ActiveCallBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !remoteStream) return;
    audio.srcObject = remoteStream;
    audio.play().catch(() => {});
  }, [remoteStream]);

  const statusText =
    callStatus === "calling"
      ? "Calling..."
      : callStatus === "connecting"
        ? isOutgoingCall
          ? "Ringing..."
          : "Connecting..."
        : "In call";

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl bg-card/95 backdrop-blur border border-border shadow-lg p-4 flex items-center justify-between">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={remoteName} size="md" />
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{remoteName}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {(callStatus === "connecting" && !isOutgoingCall) && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {statusText}
          </div>
        </div>
      </div>
      <button
        onClick={onEndCall}
        className="p-3 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shrink-0"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}
