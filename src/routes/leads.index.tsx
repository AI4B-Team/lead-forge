import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CircleCheck,
  Clock,
  Database,
  FileSpreadsheet,
  Globe,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const NICHE_FACTS = [
  { icon: Globe, label: "Nationwide" },
  { icon: Smartphone, label: "Mobile Verified" },
  { icon: Zap, label: "Built On Demand" },
];

/** Benefit cards, sharpest copy first. */
const BENEFIT_ORDER = [
  "litigator-scrub",
  "landline-remover",
  "dnc-list-scrubbing",
  "google-maps-lead-finder",
  "sms-lead-outreach",
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

function LeadsIndex() {
  const niches = LEAD_PAGES.filter((p) => p.kind === "niche");
  const stages = LEAD_PAGES.filter((p) => p.kind === "stage").sort(
    (a, b) => BENEFIT_ORDER.indexOf(a.slug) - BENEFIT_ORDER.indexOf(b.slug),
  );
  const sample = niches[0]?.rows.slice(0, 4) ?? [];
  const removed = REFERENCE_FUNNEL.found - REFERENCE_FUNNEL.clean;

  return (
    <MarketingLayout>
      {/* Hero — outcome first */}
      <section className="bg-background pt-16 pb-12">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="max-w-xl font-display text-4xl md:text-5xl font-black leading-[1.05] text-foreground">
              Lead Lists You Can Actually Contact.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Build a new lead list from multiple data sources or upload your own.
              LeadTrace cleans, enriches, verifies, and prepares every list for outreach.
            </p>

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

          {/* Hero proof: the whole value prop in one card */}
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              A Real Reference Search
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div>
                <div className="font-display text-3xl font-black tabular-nums text-muted-foreground">
                  {REFERENCE_FUNNEL.found.toLocaleString()}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Records Received
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="rounded-2xl border border-primary bg-primary/5 px-5 py-3">
                <div className="font-display text-3xl font-black tabular-nums text-foreground">
                  {REFERENCE_FUNNEL.clean.toLocaleString()}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  Ready To Contact
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              The {REFERENCE_FUNNEL.clean} delivered records are the ones you text. The {removed} removed
              records are why you don't get complaints or demand letters.
            </p>
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
          <p className="mx-auto mt-8 max-w-3xl text-sm text-muted-foreground">
            The {REFERENCE_FUNNEL.clean} delivered records are the ones you text — then launch an SMS
            campaign and replies start coming in.
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-muted-foreground">
            The {removed} removed records are why you don't get complaints or demand letters.
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
            Illustrative sample only. Every exported row is verified, compliant, and ready for outreach.
          </p>
          <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
            LeadTrace combines records from multiple trusted data sources before delivery.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <TooltipProvider>
              <table className="w-full min-w-[720px] table-fixed text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="w-[20%] px-4 py-3">Business</th>
                    <th className="w-[18%] px-4 py-3">Phone</th>
                    <th className="w-[22%] px-4 py-3">Email</th>
                    <th className="w-[15%] px-4 py-3">Website</th>
                    <th className="w-[10%] px-4 py-3">Verified</th>
                    <th className="w-[15%] px-4 py-3">City</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.map((r) => {
                    const domain = r.website
                      .replace(/^https?:\/\//, "")
                      .replace(/^www\./, "")
                      .split("/")[0];
                    return (
                      <tr key={r.business} className="border-b border-border/60 last:border-0">
                        <td className="w-[20%] px-4 py-3 font-medium text-foreground">
                          <span className="block truncate" title={r.business}>{r.business}</span>
                        </td>
                        <td className="w-[18%] px-4 py-3 tabular-nums text-foreground">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Smartphone className="h-3.5 w-3.5 shrink-0 text-primary" />
                            {r.phone}
                          </span>
                        </td>
                        <td className="w-[22%] px-4 py-3 text-muted-foreground">
                          <span className="block truncate" title={r.email}>{r.email}</span>
                        </td>
                        <td className="w-[15%] px-4 py-3 text-muted-foreground">
                          <span className="block truncate" title={r.website}>{domain}</span>
                        </td>
                        <td className="w-[10%] px-4 py-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-default items-center gap-1.5 whitespace-nowrap">
                                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1.5">
                                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                                </span>
                                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1.5">
                                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mobile verified · DNC scrubbed · Litigator checked</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="w-[15%] px-4 py-3 text-muted-foreground">{r.city}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </div>
      </section>

      {/* Ready to reach out? */}
      <section className="border-t border-border bg-surface-muted py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">Ready To Reach Out?</h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Your list doesn't stop at export. Launch compliant SMS campaigns with local numbers, automated
            follow-ups, and built-in STOP handling.
          </p>
          <Button asChild size="lg" variant="outline" className="mt-6 rounded-full">
            <Link to="/leads/$slug" params={{ slug: "sms-lead-outreach" }}>
              Launch A Campaign <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
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
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Every List:</span>
            {NICHE_FACTS.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1.5">
                <f.icon className="h-4 w-4 shrink-0 text-primary" /> {f.label}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {niches.map((p) => (
              <Link
                key={p.slug}
                to="/leads/$slug"
                params={{ slug: p.slug }}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-black text-foreground">
                    {p.nicheLabel ?? p.title}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    View Leads <ArrowRight className="h-3 w-3" />
                  </span>
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

      {/* Three pillars: source → processing → result */}
      <section className="border-t border-border bg-surface-muted py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-center text-2xl md:text-3xl font-black text-foreground">
            From Sources To Outreach In One Platform
          </h2>
          <div className="mt-10 grid items-start gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-black text-foreground">Built From</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Multiple trusted sources: business directories, public records, carrier data, and
                compliance databases.
              </p>
            </div>
            <div className="flex items-center justify-center md:hidden">
              <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground" />
            </div>
            <div className="hidden md:flex items-center justify-center pt-8">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Settings className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-black text-foreground">Processed By</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The LeadTrace pipeline: deduplication, mobile verification, enrichment, optional skip
                tracing, and compliance checks.
              </p>
            </div>
            <div className="flex items-center justify-center md:hidden">
              <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground" />
            </div>
            <div className="hidden md:flex items-center justify-center pt-8">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <CircleCheck className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-black text-foreground">Delivered As</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Outreach-ready lists: freshly generated, export-ready, never resold, and built on
                demand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final conversion */}
      <section className="border-t border-border bg-background py-14">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            Ready To Build Your First List?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Generate a new list, upload your own data, or launch outreach — all from one platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/auth">
                Build My List <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="#sample-list">
                See Sample Export
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
