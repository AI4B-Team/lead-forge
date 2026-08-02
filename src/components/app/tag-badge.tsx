export type TagLike = { id: string; name: string; color: string };

/** Colored pill used everywhere a tag is displayed. */
export function TagBadge({ tag, className = "" }: { tag: TagLike; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${className}`}
      style={{
        backgroundColor: `${tag.color}1a`,
        color: tag.color,
        borderColor: `${tag.color}55`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
    </span>
  );
}

/** Six semantic tag colors — each one means something, so nothing is decorative. */
export const TAG_COLORS = [
  { value: "#dc2626", label: "High Priority" },
  { value: "#f97316", label: "Warm" },
  { value: "#f59e0b", label: "Needs Review" },
  { value: "#16a34a", label: "Winning" },
  { value: "#2563eb", label: "Testing" },
  { value: "#6b7280", label: "Default" },
] as const;

export const TAG_SWATCHES = TAG_COLORS.map((c) => c.value);

/** Next color in rotation so tag creation never requires a color decision. */
export function nextTagColor(used: string[]): string {
  const counts = TAG_SWATCHES.map((c) => used.filter((u) => u.toLowerCase() === c).length);
  const min = Math.min(...counts);
  return TAG_SWATCHES[counts.indexOf(min)];
}
