import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact metric tile used across Settings, Team, and Admin headers. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** "alert" = live problem (amber accent); "muted" = nothing to do here. */
  tone?: "default" | "alert" | "muted";
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-left",
        tone === "alert"
          ? "border-warn/40 bg-warn/[0.07]"
          : tone === "muted"
            ? "border-border bg-surface opacity-70"
            : "border-border bg-surface",
        onClick && "cursor-pointer transition-colors hover:border-foreground/25 hover:bg-surface-muted",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
          tone === "alert" ? "text-warn" : "text-muted-foreground",
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-2xl font-black leading-none tabular-nums",
          tone === "alert" ? "text-warn" : "text-foreground",
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Comp>
  );
}
