import { useEffect, useState } from "react";

interface CountdownInput {
  /** Server clock at the start of the round. */
  startedAt: number | null | undefined;
  /** Round length in milliseconds, `null` when there is no timer. */
  durationMs: number | null | undefined;
  /**
   * Server clock when `startedAt` was received, to cancel the offset between
   * the server and the browser clocks. Defaults to the local clock.
   */
  serverTime?: number | null;
  /** Stops ticking while `false`. */
  running?: boolean;
}

/**
 * Seconds left in a server-timed round, derived from the server timestamps
 * rather than counted locally: a late or duplicated state update cannot make
 * the countdown drift or restart.
 *
 * @returns Whole seconds left (never negative), or `null` without a timer.
 */
export function useCountdown({
  startedAt,
  durationMs,
  serverTime,
  running = true,
}: CountdownInput): number | null {
  const [now, setNow] = useState(() => Date.now());

  // Offset measured once per round so the deadline is stable.
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (startedAt == null) return;
    setOffset(serverTime != null ? serverTime - Date.now() : 0);
    setNow(Date.now());
    // `startedAt` identifies the round; `serverTime` moves with every payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  useEffect(() => {
    if (!running || startedAt == null || durationMs == null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [running, startedAt, durationMs]);

  if (startedAt == null || durationMs == null) return null;
  const deadline = startedAt + durationMs;
  const remainingMs = deadline - (now + offset);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
