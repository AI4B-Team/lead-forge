import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEMPLATES, type Template, type TemplateCategory } from "@/lib/templates";
import { TemplateLogo } from "@/components/marketing/template-logo";
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

const CATEGORY_LABEL: Partial<Record<TemplateCategory, string>> = {
  upload: "Your Data",
  business: "Business Search",
  directories: "Directories",
  records: "Public Records",
  social: "Social",
  ecommerce: "E-Commerce",
  jobs: "Jobs",
  reviews: "Reviews",
  realestate: "Real Estate",
  travel: "Travel",
  finance: "Finance",
  education: "Education",
  news: "News",
  sports: "Sports",
  search: "Search",
};

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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((t, i) => (
              <Link
                key={t.id}
                {...templateLink(t)}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
              >
                <TemplateLogo template={t} className="h-12 w-12" imgClassName="h-7 w-7" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-bold leading-snug text-foreground">
                      {t.title}
                    </span>
                    {t.beta ? (
                      <span className="shrink-0 rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Beta
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t.subtitle}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {CATEGORY_LABEL[t.category] ?? "Template"}
                    </span>
                    {i < 3 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                        <Star className="h-3 w-3 fill-current" /> Popular
                      </span>
                    )}
                  </span>
                </span>
              </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
