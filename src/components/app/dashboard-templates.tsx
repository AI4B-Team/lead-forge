import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEMPLATES, type Template, type TemplateCategory } from "@/lib/templates";
import { cn } from "@/lib/utils";

type TabKey = "all" | "records" | "business" | "social";

const TABS: Array<{ key: TabKey; label: string; match: TemplateCategory[] }> = [
  { key: "all", label: "All", match: [] },
  { key: "records", label: "Public Records", match: ["records"] },
  { key: "business", label: "Business", match: ["business", "directories"] },
  { key: "social", label: "Social", match: ["social"] },
];

/** Deep-links into New Job with the record type preselected (spec §18). */
function templateLink(t: Template) {
  if (t.category === "upload") return { to: "/app/new-job/upload" } as const;
  if (t.category === "records") return { to: "/app/new-job/records" } as const;
  return { to: "/app/new-job/business", search: { niche: t.title } } as const;
}

export function DashboardTemplates() {
  const [tab, setTab] = useState<TabKey>("all");
  const active = TABS.find((t) => t.key === tab)!;
  const items = (tab === "all" ? TEMPLATES : TEMPLATES.filter((t) => active.match.includes(t.category))).slice(0, 8);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base font-display">Start From A Template</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/templates">See All <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div role="tablist" className="mb-4 inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                t.key === tab ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                {...templateLink(t)}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-primary hover:shadow-sm"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold text-foreground">{t.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t.subtitle}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
