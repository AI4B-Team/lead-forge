import type { ReactNode } from "react";

/** Yellow marker underline for a single hero word. Flat, hand-drawn feel. */
export function MarkerHighlight({ children }: { children: ReactNode }) {
  return <span className="marker-highlight">{children}</span>;
}