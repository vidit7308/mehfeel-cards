import { useState, useEffect } from 'react';

/** Returns seconds remaining until `endAt` epoch ms. Updates every second. */
export function useCountdown(endAt: number | null | undefined): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!endAt) { setSeconds(0); return; }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSeconds(remaining);
    };

    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [endAt]);

  return seconds;
}

/** Returns { elapsed, total } for the match timer. */
export function useMatchTimer(startedAt: number | null, totalMs: number) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return; }
    const id = setInterval(() => {
      setElapsed(Math.min(Date.now() - startedAt, totalMs));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, totalMs]);

  const remaining = Math.max(0, totalMs - elapsed);
  const minutes = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { remaining, minutes, secs, pct: elapsed / totalMs };
}
