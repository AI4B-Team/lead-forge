import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Watches a scroll container and reports whether its content actually
 * overflows and whether the viewer has reached the bottom. Used to render the
 * thin scrollbar and bottom fade only when there is more content below.
 */
export function useOverflow<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const over = el.scrollHeight - el.clientHeight > 2;
    setOverflowing(over);
    setAtBottom(!over || el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  return { ref, overflowing, atBottom, measure };
}
