import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { PipelineFunnel } from "@/components/app/pipeline-funnel";
import { CONTENT_UPDATED, LEAD_PAGES, REFERENCE_FUNNEL } from "@/lib/lead-pages";

export const Route = createFileRoute("/leads/")({
  head: () => ({
    meta: [
      { title: "Lead Lists By Niche — DNC-Scrubbed & Textable | LeadTrace" },
      {
        name: "description",
        content:
          "Browse clean, DNC and litigator scrubbed lead lists by niche — roofing, HVAC, plumbing, med spas and more — plus how each pipeline stage works.",
      },
      { property: "og:title", content: "Lead Lists By Niche — LeadTrace" },
      { property: "og:description", content: "Every niche list and pipeline stage, in one browser-based pipeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsIndex,
});

function LeadsIndex() {
  const niches = LEAD_PAGES.filter((p) => p.kind === "niche");
  const stages = LEAD_PAGES.filter((p) => p.kind === "stage");

  return (
    <MarketingLayout>
      <section className="bg-background pt-16 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-display text-4xl md:text-6xl font-black leading-[1.05] text-foreground">
            Lead Lists, Clean On Arrival
          </h1>
          <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Updated {CONTENT_UPDATED}
          </div>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Pick a niche. We pull it from Google Maps, dedupe it, drop the franchises, verify which numbers
            are mobile, and scrub against the National DNC Registry and known-litigator databases before you
            see a single row.
          </p>
          <div className="mt-10 max-w-2xl">
            <PipelineFunnel stages={REFERENCE_FUNNEL} />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">Lead Lists By Niche</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {niches.map((p) => (
              <Link
                key={p.slug}
                to="/leads/$slug"
                params={{ slug: p.slug }}
                className="rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary"
              >
                <div className="font-display text-lg font-black text-foreground">{p.title}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.tags.slice(0, 2).map((t) => (
                    <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  View List <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            How Each Pipeline Stage Works
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {stages.map((p) => (
              <Link
                key={p.slug}
                to="/leads/$slug"
                params={{ slug: p.slug }}
                className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary"
              >
                <div className="font-display text-lg font-black text-foreground">{p.title}</div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.valueProp}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
