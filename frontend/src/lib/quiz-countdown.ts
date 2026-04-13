"use client";

import { useState, useEffect, useCallback } from "react";

/** Human-readable countdown; matches fellow quiz list UX. */
export function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hrs = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Milliseconds remaining until target ISO date, ticking every second. Returns -1 if no target. */
export function useCountdown(targetDate: string | null | undefined) {
  const getMs = useCallback(
    () => (targetDate ? new Date(targetDate).getTime() - Date.now() : -1),
    [targetDate],
  );

  const [ms, setMs] = useState(getMs);

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(interval);
  }, [targetDate, getMs]);

  return ms;
}

/** Re-render every second while enabled (for multi-phase open/close windows). */
export function useSecondTick(enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
}
