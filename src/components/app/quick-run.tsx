import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RecordType = "business" | "records" | "upload";

const TYPES: Array<{ key: RecordType; label: string }> = [
  { key: "business", label: "Business Search" },
  { key: "records", label: "Public Records" },
  { key: "upload", label: "Upload A List" },
];

/** Command-bar quick run (spec §18): one line from intent to a prefilled job. */
export function QuickRun() {
  const navigate = useNavigate();
  const [type, setType] = useState<RecordType>("business");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const activeType = TYPES.find((t) => t.key === type)!;

  const run = () => {
    if (type === "upload") return void navigate({ to: "/app/new-job/upload" });
    if (type === "records") return void navigate({ to: "/app/new-job/records" });
    void navigate({
      to: "/app/new-job/business",
      search: {
        ...(niche.trim() ? { niche: niche.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
      },
    });
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                {activeType.label} <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TYPES.map((t) => (
                <DropdownMenuItem key={t.key} onSelect={() => setType(t.key)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {type === "business" ? (
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") run(); }}
                placeholder="What Are You Looking For? e.g. HVAC Companies"
                aria-label="Niche"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="hidden h-5 w-px bg-border sm:block" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") run(); }}
                placeholder="Where? e.g. Hillsborough County, FL"
                aria-label="Location"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          ) : (
            <span className="min-w-0 flex-1 truncate py-2 text-sm text-muted-foreground">
              {type === "upload" ? "Drop A CSV And We'll Clean, Scrub, And Skip Trace It." : "Search Probate, Code Violations, Liens, And More."}
            </span>
          )}
        </div>

        <Button className="rounded-full shrink-0" onClick={run}>
          Start Job <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
