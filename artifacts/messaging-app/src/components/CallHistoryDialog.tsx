import { useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneOff, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";

type CallRecord = {
  id: number;
  conversationId: number;
  otherUserId: string;
  otherName: string;
  direction: "incoming" | "outgoing";
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
};

function formatCallTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusIcon({ status, direction }: { status: string; direction: string }) {
  if (status === "answered") {
    return direction === "outgoing" ? (
      <PhoneOutgoing className="w-4 h-4 text-primary" />
    ) : (
      <PhoneIncoming className="w-4 h-4 text-primary" />
    );
  }
  if (status === "missed") return <PhoneOff className="w-4 h-4 text-destructive" />;
  if (status === "declined") return <PhoneOff className="w-4 h-4 text-muted-foreground" />;
  return <Phone className="w-4 h-4 text-muted-foreground" />;
}

export function CallHistoryDialog({
  open,
  onClose,
  onSelectConversation,
}: {
  open: boolean;
  onClose: () => void;
  onSelectConversation?: (conversationId: number) => void;
}) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/call-history", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCalls)
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Call history</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No call history yet
            </div>
          ) : (
            <div className="space-y-1">
              {calls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => {
                    onSelectConversation?.(call.conversationId);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                >
                  <Avatar name={call.otherName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {call.otherName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusIcon status={call.status} direction={call.direction} />
                      <span>{formatCallTime(call.startedAt)}</span>
                      {call.durationSeconds != null && call.status === "answered" && (
                        <span>• {formatDuration(call.durationSeconds)}</span>
                      )}
                      {call.status === "missed" && (
                        <span className="text-destructive">Missed</span>
                      )}
                      {call.status === "declined" && (
                        <span>Declined</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusIcon status={call.status} direction={call.direction} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
