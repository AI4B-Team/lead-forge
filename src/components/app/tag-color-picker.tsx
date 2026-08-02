import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check } from "lucide-react";
import { TAG_COLORS } from "@/components/app/tag-badge";

const RECENT_KEY = "leadtrace.tag.recentColors";
const HEX = /^#([0-9a-f]{6})$/i;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((c) => typeof c === "string" && HEX.test(c)).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushRecent(color: string): string[] {
  const next = [color, ...readRecent().filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 5);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recents are a nicety, not a requirement */
  }
  return next;
}

/** Custom-color popover: wheel, hex entry, and the last few custom colors used. */
function CustomColorPopover({
  value,
  onSave,
  size,
}: {
  value: string;
  onSave: (color: string) => void;
  size: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hex, setHex] = useState(value);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setHex(value);
      setRecent(readRecent());
    }
  }, [open, value]);

  const box = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const valid = HEX.test(hex);

  const commit = (color: string) => {
    setRecent(pushRecent(color));
    onSave(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Custom Color"
          title="Custom Color"
          className={`${box} shrink-0 rounded-full border border-dashed border-border text-muted-foreground flex items-center justify-center hover:bg-muted/60 transition-colors`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 space-y-3">
        <p className="text-sm font-semibold">Pick A Custom Color</p>

        <input
          type="color"
          aria-label="Color Wheel"
          value={valid ? hex : draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setHex(e.target.value);
          }}
          className="h-24 w-full cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />

        <div className="space-y-1.5">
          <label htmlFor="tag-hex" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hex
          </label>
          <Input
            id="tag-hex"
            value={hex}
            onChange={(e) => {
              const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
              setHex(v);
              if (HEX.test(v)) setDraft(v);
            }}
            placeholder="#8B5CF6"
            spellCheck={false}
            className={`h-9 font-mono text-sm ${hex && !valid ? "border-destructive" : ""}`}
          />
        </div>

        {recent.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</span>
            <div className="flex items-center gap-2">
              {recent.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Recent Color ${c}`}
                  title={c}
                  onClick={() => {
                    setDraft(c);
                    setHex(c);
                  }}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="rounded-full" disabled={!valid} onClick={() => commit(hex.toLowerCase())}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Preset swatch row plus a hidden-by-default custom picker. Fast for most
 * users, unlimited for the ones who care.
 */
export function TagColorPicker({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (color: string) => void;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const isPreset = TAG_COLORS.some((c) => c.value.toLowerCase() === value.toLowerCase());

  return (
    <div className="flex items-center gap-2">
      {TAG_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          aria-label={c.label}
          aria-pressed={value.toLowerCase() === c.value.toLowerCase()}
          onClick={() => onChange(c.value)}
          className={`${dot} shrink-0 rounded-full transition-transform hover:scale-110 ${
            value.toLowerCase() === c.value.toLowerCase()
              ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/70"
              : ""
          }`}
          style={{ backgroundColor: c.value }}
        />
      ))}
      {!isPreset && (
        <span
          aria-label="Selected Custom Color"
          title={value}
          className={`${dot} shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background ring-foreground/70`}
          style={{ backgroundColor: value }}
        />
      )}
      <CustomColorPopover value={value} onSave={onChange} size={size} />
    </div>
  );
}

export { CustomColorPopover };