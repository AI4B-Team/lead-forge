import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — LeadTrace" },
      { name: "description", content: "Starter, Growth, and Scale plans. All include DNC scrubbing, STOP handling, and audit logs. 14-day free trial. No credit card required." },
      { property: "og:title", content: "LeadTrace Pricing" },
      { property: "og:description", content: "Plans that scale with you. All compliant by default." },
    ],
  }),
  component: Pricing,
});

const TIERS = [
  {
    name: "Starter",
    price: 97,
    for: "Solo Operators",
    featured: false,
    rows: [
      ["Users", "1"], ["Phone Lines", "1"],
      ["Skip Traces / Mo", "5,000"], ["Scrape Credits / Mo", "10,000"],
      ["Sources", "Business + Upload"], ["Campaigns", "Standard"], ["Support", "Standard"],
    ],
  },
  {
    name: "Growth",
    price: 197,
    for: "Teams Doing Volume",
    featured: true,
    rows: [
      ["Users", "5"], ["Phone Lines", "3"],
      ["Skip Traces / Mo", "25,000"], ["Scrape Credits / Mo", "50,000"],
      ["Sources", "+ Public Records"], ["Campaigns", "Auto Drip Engine"], ["Support", "Priority"],
    ],
  },
  {
    name: "Scale",
    price: 497,
    for: "High-Volume / Agencies",
    featured: false,
    rows: [
      ["Users", "Unlimited"], ["Phone Lines", "10"],
      ["Skip Traces / Mo", "100,000"], ["Scrape Credits / Mo", "250,000"],
      ["Sources", "All + Custom Adapters"], ["Campaigns", "Autonomous + White-Label"], ["Support", "Dedicated Manager"],
    ],
  },
];

function Pricing() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">Pricing</div>
          <h1 className="mt-3 font-display text-5xl font-black text-foreground leading-tight">
            Plans That Scale With You.
          </h1>
          <p className="mt-4 text-muted-foreground">
            SMS, scrape, and skip trace credits are metered on top of every plan.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-8 ${t.featured ? "border-primary bg-surface shadow-2xl scale-[1.02]" : "border-border bg-surface"}`}
            >
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                  Most Popular
                </div>
              )}
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.name}</div>
              <div className="mt-3 font-display text-5xl font-black text-foreground">
                ${t.price}
                <span className="text-base font-medium text-muted-foreground">/mo</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{t.for}</div>
              <Button asChild className="mt-6 w-full rounded-full" variant={t.featured ? "default" : "outline"}>
                <Link to="/start">Start Free Trial</Link>
              </Button>
              <ul className="mt-8 space-y-3">
                {t.rows.map(([k, v]) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">{v}</span> {k}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-10">
          All Plans Include A 30-Day Money-Back Guarantee · No Credit Card Required To Start
        </p>
      </section>
    </MarketingLayout>
  );
}