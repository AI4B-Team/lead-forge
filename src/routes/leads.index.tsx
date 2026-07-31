import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clock,
  Database,
  FileSpreadsheet,
  Globe,
  Phone,
  ShieldCheck,
  Smartphone,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { PipelineFlow } from "@/components/marketing/pipeline-flow";
import { CONTENT_UPDATED, LEAD_PAGES, REFERENCE_FUNNEL } from "@/lib/lead-pages";

export const Route = createFileRoute("/leads/")({
  head: () => ({
    meta: [
      { title: "Lead Lists You Can Actually Contact | LeadTrace" },
      {
        name: "description",
        content:
          "Mobile-verified, DNC-scrubbed, duplicate-free business lead lists by niche — roofing, HVAC, plumbing, med spas and more. See a sample list before you build one.",
      },
      { property: "og:title", content: "Lead Lists You Can Actually Contact — LeadTrace" },
      {
        property: "og:description",
        content: "Every list is deduplicated, mobile verified, and DNC scrubbed before it reaches you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/leads" }],
  }),
  component: LeadsIndex,
});

const BADGES = [
  "Multi-Source Data",
  "Upload Your Own Lists",
  "Mobile Verified",
  "Skip Trace Available",
  "Outreach Ready",
];

const WORKFLOW_STEPS = ["Generate Lists", "Clean & Verify", "Launch Outreach"];

const NICHE_FACTS = [
  { icon: Globe, label: "Nationwide" },
  { icon: Smartphone, label: "Mobile Verified" },
  { icon: Zap, label: "Built On Demand" },
];

const UPLOAD_BENEFITS = [
  "Remove Duplicates",
  "Verify Mobile Numbers",
  "Skip Trace Missing Contacts",
  "Scrub DNC",
  "Export A Cleaner List",
];

/** Outcome-framed headings for the pipeline-stage pages (presentation only). */
const BENEFITS: Record<string, { title: string; body: string }> = {
  "google-maps-lead-finder": {
    title: "Fresh Businesses",
    body: "Lists are generated the moment you ask for them — never resold, never recycled from a database someone bought in 2019.",
  },
  "landline-remover": {
    title: "Only Reach Mobile Phones",
    body: "Every number is carrier-checked, so your texts land on phones people actually carry instead of dying on office landlines.",
  },
  "dnc-list-scrubbing": {
    title: "Better Deliverability",
    body: "Numbers on the National Do Not Call Registry are removed before delivery, with a timestamped record of every check.",
  },
  "litigator-scrub": {
    title: "Reduce TCPA Risk",
    body: "Known serial plaintiffs and TCPA litigators are hard-blocked, so the one number that ends a campaign never enters it.",
  },
  "sms-lead-outreach": {
    title: "More Conversations",
    body: "Send straight from the clean list — merge fields, quiet hours, and automatic opt-out handling included, no export required.",
  },
};

const SOURCES = [
  { icon: Database, label: "Public Business Data" },
  { icon: FileSpreadsheet, label: "Public Records" },
  { icon: Upload, label: "Multiple Data Sources" },
  { icon: Phone, label: "Carrier Data" },
  { icon: ShieldCheck, label: "Compliance Data" },
];

const PROMISES = ["Freshly Generated", "Never Resold", "Built On Demand", "Export Ready"];

function LeadsIndex() {
  const niches = LEAD_PAGES.filter((p) => p.kind === "niche");
  const stages = LEAD_PAGES.filter((p) => p.kind === "stage");
  const sample = niches[0]?.rows.slice(0, 4) ?? [];

  return (
    <MarketingLayout>
      {/* Hero — outcome first */}
      <section className="bg-background pt-16 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-display text-4xl md:text-6xl font-black leading-[1.05] text-foreground">
            Lead Lists You Can Actually Contact.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Build a new lead list from multiple data sources or upload your own. Every list can be cleaned,
            enriched, mobile verified, skip-traced, scrubbed against the National DNC Registry, and prepared
            for outreach before you ever contact a prospect.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {BADGES.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Check className="h-4 w-4 text-primary" /> {b}
              </span>
            ))}
          </div>

          <div className="mt-5 inline-flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
            {WORKFLOW_STEPS.map((step, i) => (
              <span key={step} className="inline-flex items-center gap-2 last:mr-0">
                <span className="text-foreground">{step}</span>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/auth">
                Build My List <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <a href="#sample-list">See Sample List</a>
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Updated {CONTENT_UPDATED}
            </span>
          </div>
        </div>
      </section>

      {/* Pipeline flow */}
      <section className="border-y border-border bg-surface-muted py-14 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            How Every List Gets Prepared
          </h2>
          <PipelineFlow stages={REFERENCE_FUNNEL} className="mt-8" />
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm font-semibold text-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{REFERENCE_FUNNEL.clean} Ready To Contact</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="rounded-full border border-border bg-surface px-3 py-1">Launch SMS Campaign</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="rounded-full border border-border bg-surface px-3 py-1">Replies Start Coming In</span>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-sm text-muted-foreground">
            A real reference search. The 554 delivered records are the ones you text.
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-muted-foreground">
            The 686 removed records are why you don't get complaints or demand letters.
          </p>
        </div>
      </section>

      {/* Sample list */}
      <section id="sample-list" className="scroll-mt-24 bg-background py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            See Exactly What You Get
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Every row arrives verified and export-ready. Sample rows are illustrative — fabricated names
            and 555 numbers.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Mobile Phone</th>
                  <th className="px-4 py-3">Line Type</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">DNC</th>
                  <th className="px-4 py-3">Litigator</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Last Verified</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((r) => (
                  <tr key={r.business} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{r.business}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.owner}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{r.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.lineType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.website}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-primary" /> {r.dnc}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-primary" /> {r.litigator}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.lastVerified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Already have a list? */}
      <section className="border-t border-border bg-surface-muted py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            Already Have A Lead List?
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Upload your CSV and let LeadTrace do the cleanup — CRM exports, trade show lists, purchased
            lists, or an old database you gave up on.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {UPLOAD_BENEFITS.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Check className="h-4 w-4 text-primary" /> {b}
              </span>
            ))}
          </div>
          <Button asChild size="lg" className="mt-8 rounded-full">
            <Link to="/auth">
              Upload A List <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Niches */}
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
                <div className="font-display text-lg font-black text-foreground">
                  {p.nicheLabel ?? p.title}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {NICHE_FACTS.map((f) => (
                    <li key={f.label} className="flex items-center gap-2 font-semibold text-foreground">
                      <f.icon className="h-4 w-4 shrink-0 text-primary" /> {f.label}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  View Leads <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits (formerly pipeline stages) */}
      <section className="bg-background py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            Why Our Lists Convert Better
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {stages.map((p) => {
              const b = BENEFITS[p.slug];
              return (
                <Link
                  key={p.slug}
                  to="/leads/$slug"
                  params={{ slug: p.slug }}
                  className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary"
                >
                  <div className="font-display text-lg font-black text-foreground">
                    {b?.title ?? p.title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {b?.body ?? p.valueProp}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust / social proof */}
      <section className="border-t border-border bg-surface-muted py-14">
        <div className="mx-auto max-w-6xl px-6 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Built From</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {SOURCES.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <s.icon className="h-5 w-5 shrink-0 text-primary" /> {s.label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Every List Is</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {PROMISES.map((p) => (
                <div key={p} className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <Check className="h-5 w-5 shrink-0 text-primary" /> {p}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl px-6">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Build My List <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
