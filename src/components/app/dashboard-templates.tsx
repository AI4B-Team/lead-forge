import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEMPLATES, hasCategory, primaryCategory, type Template, type TemplateCategory } from "@/lib/templates";
import { TemplateLogo } from "@/components/marketing/template-logo";
import { TemplateCostBadge } from "@/components/marketing/template-card";
import { getVerifiedCoverage } from "@/lib/coverage.functions";
import { recordTypeCovered } from "@/lib/coverage.shared";
import { recordTypeForTemplate } from "@/lib/record-types";
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
  if (hasCategory(t, "upload")) return { to: "/app/assistant", search: { source: "upload" } } as const;
  if (hasCategory(t, "records")) return { to: "/app/assistant", search: { source: "records" } } as const;
  return { to: "/app/assistant", search: { source: "business", niche: t.title } } as const;
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
  // 9 keeps the grid a full 3×3 at xl.
  const items = (tab === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.categories.some((c) => active.match.includes(c)))).slice(0, 9);

  // Card state comes from source_coverage, never from the template config: a
  // public-records template with no verified county anywhere is not runnable.
  const coverageQ = useQuery({
    queryKey: ["verified-coverage"],
    queryFn: () => getVerifiedCoverage(),
    staleTime: 5 * 60_000,
  });
  const verified = coverageQ.data?.coverage ?? [];
  const runnable = (t: Template) => {
    const recordType = recordTypeForTemplate(t.id);
    if (!recordType || coverageQ.isPending) return true;
    return recordTypeCovered(verified, recordType);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base font-display">Start From A Template</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/templates">See All <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div role="tablist" className="mb-4 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                t.key === tab
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((t, i) => {
            const available = runnable(t);
            const body = (
              <>
                <TemplateLogo template={t} className="h-12 w-12" imgClassName="h-7 w-7" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-bold leading-snug text-foreground">
                      {t.title}
                    </span>
                    {!available ? (
                      <span className="shrink-0 rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Coming Soon
                      </span>
                    ) : t.beta ? (
                      <span className="shrink-0 rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Beta
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {available ? t.subtitle : "No verified county yet — request it and we'll add it."}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {CATEGORY_LABEL[primaryCategory(t)] ?? "Template"}
                    </span>
                    {available && <TemplateCostBadge template={t} />}
                    {available && i < 3 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                        <Star className="h-3 w-3 fill-current" /> Popular
                      </span>
                    )}
                    {!available && (
                      <span className="text-[10px] font-semibold text-primary">Request It</span>
                    )}
                  </span>
                </span>
              </>
            );
            return available ? (
              <Link
                key={t.id}
                {...templateLink(t)}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
              >
                {body}
              </Link>
            ) : (
              <Link
                key={t.id}
                to="/app/assistant"
                search={{ source: "records" }}
                title="We don't have a verified source for this filing yet — open the builder to request it."
                className="group flex items-center gap-4 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-4 opacity-80 transition hover:border-primary"
              >
                {body}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
