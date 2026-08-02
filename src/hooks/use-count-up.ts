import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 to `target` with an ease-out ramp, optionally after a delay so
 * a row of numbers can cascade one card at a time. Respects
 * prefers-reduced-motion by jumping straight to the final value.
 */
export function useCountUp(target: number, opts?: { duration?: number; delay?: number; enabled?: boolean }) {
  const duration = opts?.duration ?? 900;
  const delay = opts?.delay ?? 0;
  const enabled = opts?.enabled ?? true;
  const [value, setValue] = useState(enabled ? 0 : target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || reduce || target <= 0) {
      setValue(target);
      return;
    }
    let start: number | null = null;

    const step = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    setValue(0);
    const timer = setTimeout(() => {
      frame.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, delay, enabled]);

  return value;
}
