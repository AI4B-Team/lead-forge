import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { TemplateCard } from "@/components/marketing/template-card";
import { TEMPLATES, CATEGORY_LABELS, type Template, type TemplateCategory } from "@/lib/templates";
import { useOverflow } from "@/hooks/use-overflow";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: string | null;
  onSelect: (t: Template) => void;
};

/** Category chip order — Upload first, then the highest-volume categories. */
const CHIP_ORDER: TemplateCategory[] = [
  "upload", "business", "directories", "realestate", "records",
  "social", "ecommerce", "jobs", "reviews", "search",
  "travel", "finance", "education", "news", "sports",
];

/**
 * Searchable, category-filtered template picker. Search + chips stay pinned;
 * only the card grid scrolls, with the thin-scrollbar + bottom-fade treatment.
 */
export function TemplatePickerDialog({ open, onOpenChange, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const scroll = useOverflow<HTMLDivElement>();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory("all");
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const categories = useMemo(() => {
    const present = new Set(TEMPLATES.map((t) => t.category));
    return CHIP_ORDER.filter((c) => present.has(c));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        CATEGORY_LABELS[t.category].toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const grouped = useMemo(() => {
    const groups = new Map<TemplateCategory, Template[]>();
    for (const t of matches) {
      const list = groups.get(t.category) ?? [];
      list.push(t);
      groups.set(t.category, list);
    }
    return Array.from(groups.entries());
  }, [matches]);

  const grid = (list: Template[]) => (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {list.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          variant="insert"
          selected={selectedId === t.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[62rem]">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>All Templates</DialogTitle>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Templates By Name, Description, Or Category…"
              aria-label="Search templates"
              className="rounded-full pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 thin-scroll">
            {(["all", ...categories] as const).map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c as TemplateCategory | "all")}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "all" ? "All" : CATEGORY_LABELS[c as TemplateCategory]}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scroll.ref}
            className={`h-full overflow-y-auto px-6 py-4 ${scroll.overflowing ? "thin-scroll" : ""}`}
          >
            {matches.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-foreground">No Templates Match</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try A Different Search Term Or Category.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={() => { setQuery(""); setCategory("all"); searchRef.current?.focus(); }}
                >
                  Clear Search
                </Button>
              </div>
            ) : category === "all" ? (
              <div className="space-y-6">
                {grouped.map(([cat, list]) => (
                  <div key={cat}>
                    <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                      {CATEGORY_LABELS[cat]}
                    </div>
                    {grid(list)}
                  </div>
                ))}
              </div>
            ) : (
              grid(matches)
            )}
          </div>
          {scroll.overflowing && !scroll.atBottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}