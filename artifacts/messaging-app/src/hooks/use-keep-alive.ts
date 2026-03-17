import { useEffect, useRef } from "react";

/**
 * Pings the backend periodically to prevent Render free tier from spinning down.
 * Render spins down after ~15 min of inactivity; pinging every 10 min keeps it awake.
 */
const PING_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes (Render spins down after ~15 min)

export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = () => {
      fetch("/api/healthz", { method: "GET", credentials: "include" }).catch(
        () => {}
      );
    };

    ping();
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
