import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, Star, Gauge } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — One Platform, Plans That Scale | LeadTrace" },
      { name: "description", content: "Every LeadTrace plan includes lead generation, list uploads, mobile verification, DNC compliance, SMS campaigns, and CSV export. Plans differ only in seats, sending numbers, and monthly usage." },
      { property: "og:title", content: "LeadTrace Pricing" },
      { property: "og:description", content: "Every plan includes the full platform. Usage scales with credits, not hidden feature limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const EVERY_PLAN = [
  "Lead Generation From Multiple Data Sources",
  "Upload And Clean Your Existing Lists",
  "Mobile Verification On Every Record",
  "DNC And Litigator Compliance Checks",
  "Launch SMS Campaigns With Drip Sequences",
  "CSV Export And Full Audit Trail",
] as const;

const TIERS = [
  {
    name: "Starter",
    price: 97,
    for: "Perfect For Solo Operators.",
    metric: "Up To 10,000 New Leads / Mo",
    cta: "Start Free",
    to: "/start" as const,
    featured: false,
    included: [
      ["1", "User Seat"],
      ["1", "Local Sending Number"],
      ["Standard", "Processing Speed"],
      ["Email", "Support"],
    ],
    usage: [
      ["10,000", "Scrape Credits / Mo Included"],
      ["5,000", "Skip Trace Credits / Mo Included"],
      ["Metered", "SMS Usage"],
    ],
  },
  {
    name: "Growth",
    price: 197,
    for: "For Growing Sales Teams Running Outreach Every Day.",
    metric: "Up To 50,000 New Leads / Mo",
    cta: "Start Growing",
    to: "/start" as const,
    featured: true,
    included: [
      ["5", "User Seats"],
      ["3", "Local Sending Numbers"],
      ["Priority", "Processing Speed"],
      ["Priority", "Support & Faster Processing"],
    ],
    usage: [
      ["50,000", "Scrape Credits / Mo Included"],
      ["25,000", "Skip Trace Credits / Mo Included"],
      ["Metered", "SMS Usage"],
    ],
  },
  {
    name: "Scale",
    price: 497,
    for: "Built For Agencies And High-Volume Operations.",
    metric: "Up To 250,000+ New Leads / Mo",
    cta: "Talk To Sales",
    to: "/start" as const,
    featured: false,
    included: [
      ["Unlimited", "User Seats"],
      ["10", "Local Sending Numbers"],
      ["Fastest", "Processing Speed"],
      ["Dedicated", "Account Manager"],
    ],
    usage: [
      ["250,000", "Scrape Credits / Mo Included"],
      ["100,000", "Skip Trace Credits / Mo Included"],
      ["Metered", "SMS Usage"],
    ],
  },
] as const;

const TRUST = ["Cancel Anytime", "No Long-Term Contracts", "30-Day Money-Back Guarantee"] as const;

const FAQ = [
  {
    q: "How Do Scrape Credits Work?",
    a: "One credit covers one record pulled from a data source during a job. Credits included with your plan reset monthly, and you can top up at any time without changing plans.",
  },
  {
    q: "What Counts As A Skip Trace?",
    a: "A skip trace is one lookup that appends contact details — mobile numbers and emails — to a record you already have. Skip tracing is always optional, so you only spend credits on the lists you choose to enrich.",
  },
  {
    q: "Can I Upload My Own Lists?",
    a: "Yes, on every plan. Uploaded lists run the same pipeline as generated ones: deduplication, mobile verification, DNC and litigator scrubbing, and optional skip trace.",
  },
  {
    q: "Are SMS Messages Included?",
    a: "Sending numbers are included with your plan. Message volume is metered separately at carrier pass-through rates so you never pay for messages you do not send.",
  },
  {
    q: "Can I Upgrade Anytime?",
    a: "Yes. Upgrades take effect immediately and are prorated. Downgrades apply at the start of your next billing period.",
  },
  {
    q: "Do Unused Credits Roll Over?",
    a: "Plan credits reset each billing period. Credits you purchase as top-ups never expire, so buying extra is never wasted.",
  },
] as const;

function Pricing() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">Pricing</div>
          <h1 className="mt-3 font-display text-5xl font-black text-foreground leading-tight">
            Plans That Scale With You.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to generate, clean, verify, and launch outreach from one platform.
          </p>
          <p className="mt-2 text-muted-foreground">
            Choose the plan that matches your team. Usage scales with credits — not hidden feature limits.
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-4xl rounded-2xl border border-border bg-surface-muted p-8">
          <h2 className="text-center font-display text-2xl font-black text-foreground">Every Plan Includes</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {EVERY_PLAN.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            The plans below only change what scales: seats, sending numbers, processing speed, support, and
            monthly usage credits.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-14 items-start">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-8 ${t.featured ? "border-primary bg-surface shadow-2xl md:scale-[1.03]" : "border-border bg-surface"}`}
            >
              {t.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-1.5 text-sm font-bold text-primary-foreground shadow-lg whitespace-nowrap">
                  <Star className="h-4 w-4 fill-current" /> Most Popular
                </div>
              )}
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.name}</div>
              <div className="mt-3 font-display text-5xl font-black text-foreground">
                ${t.price}
                <span className="text-base font-medium text-muted-foreground">/mo</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{t.for}</div>

              <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3">
                <Gauge className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-bold text-foreground">{t.metric}</span>
              </div>

              <Button asChild className="mt-5 w-full rounded-full" variant={t.featured ? "default" : "outline"}>
                <Link to={t.to}>{t.cta}</Link>
              </Button>

              <div className="mt-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Included
                </div>
                <ul className="mt-3 space-y-3">
                  {t.included.map(([v, k]) => (
                    <li key={k} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{v}</span> {k}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Usage-Based
                </div>
                <ul className="mt-3 space-y-3">
                  {t.usage.map(([v, k]) => (
                    <li key={k} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{v}</span> {k}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-success" /> {t}
            </span>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">No Credit Card Required To Start</p>

        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center font-display text-3xl font-black text-foreground">
            Pricing Questions, Answered
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left font-display font-bold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </MarketingLayout>
  );
}