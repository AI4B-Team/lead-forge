import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-layout";
import { TemplateCard } from "@/components/marketing/template-card";
import { TEMPLATES, type TemplateCategory } from "@/lib/templates";

type Filter = "all" | TemplateCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "business", label: "Business" },
  { key: "records", label: "Real Estate Records" },
  { key: "upload", label: "Upload" },
];

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Template Library — LeadTrace" },
      { name: "description", content: "Pick a source to start a job. Every LeadTrace template runs the same skip trace, scrub, and campaign pipeline." },
      { property: "og:title", content: "LeadTrace Template Library" },
      { property: "og:description", content: "Browse every scraper, records, and upload template LeadTrace ships." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const items = filter === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <div className="mx-auto max-w-[1240px] px-6 py-14">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back To Home
          </Link>
          <h1 className="mt-6 font-display text-4xl md:text-5xl font-black text-foreground">
            Template Library
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            Pick A Source To Start A Job. Every Template Runs The Same Skip Trace, Scrub, And
            Campaign Pipeline.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}