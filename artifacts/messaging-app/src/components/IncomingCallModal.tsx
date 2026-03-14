import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { Avatar } from "./Avatar";

type IncomingCallModalProps = {
  fromName: string;
  onAnswer: () => void;
  onDecline: () => void;
  open: boolean;
};

export function IncomingCallModal({ fromName, onAnswer, onDecline, open }: IncomingCallModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-4 w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl border border-border"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm font-medium text-muted-foreground">Incoming voice call</div>
              <Avatar name={fromName} size="lg" />
              <div className="text-lg font-semibold text-foreground">{fromName}</div>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={onDecline}
                  className="flex flex-col items-center gap-1 p-4 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <PhoneOff className="w-8 h-8" />
                  <span className="text-xs font-medium">Decline</span>
                </button>
                <button
                  onClick={onAnswer}
                  className="flex flex-col items-center gap-1 p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Phone className="w-8 h-8" />
                  <span className="text-xs font-medium">Answer</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
