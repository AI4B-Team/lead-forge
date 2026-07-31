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

export const TAG_SWATCHES = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
