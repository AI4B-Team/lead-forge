import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Shared click-to-open "?" hint used everywhere the app explains a label
 * (List Builder field hints, Lists stat strip, …). Popover — not a tooltip —
 * so it works on touch and stays open while the user reads it.
 */
export function HelpHint({
  title,
  children,
  className,
  side = "left",
  align = "start",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What Does ${title} Mean?`}
          onClick={(e) => e.stopPropagation()}
          className={cn("text-muted-foreground transition-colors hover:text-foreground", className)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} side={side} className="w-72 space-y-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
      </PopoverContent>
    </Popover>
  );
}
