import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Play,
  ShieldCheck,
  Check,
  Search,
  Landmark,
  Upload,
  UserSearch,
  MessageSquare,
  Activity,
  Lock,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MarketingNav, ComplianceStrip, MarketingFooter } from "@/components/marketing/marketing-layout";
import { PromptHero } from "@/components/marketing/prompt-hero";
import { TemplateCard } from "@/components/marketing/template-card";
import { TEMPLATES } from "@/lib/templates";
import { INDUSTRIES } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadTrace — Leads To Deals, On Autopilot" },
      { name: "description", content: "Scrape, skip trace, DNC scrub, and text your leads from one compliant platform. Built for insurance, real estate, solar, and home services." },
      { property: "og:title", content: "LeadTrace — Leads To Deals, On Autopilot" },
      { property: "og:description", content: "One platform replaces your scraper, skip tracer, DNC service, and texting tool." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav />
      <PromptHero />
      <TemplateTeaser />
      <ConsolidationBand />
      <HowItWorksSection />
      <FeaturesSection />
      <IndustriesSection />
      <PricingPreview />
      <ComplianceStrip />
      <MarketingFooter />
    </div>
  );
}

function TemplateTeaser() {
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState(() => TEMPLATES.map((_, i) => i));
  const pageSize = 6;
  const visible = useMemo(() => {
    const arr: typeof TEMPLATES = [];
    for (let i = 0; i < pageSize; i++) {
      arr.push(TEMPLATES[order[(offset + i) % order.length]]);
    }
    return arr;
  }, [offset, order]);

  const shuffle = () => {
    const next = [...order];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setOffset(0);
  };

  return (
    <section className="bg-background pb-20">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="flex flex-col items-start gap-1">
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Not Sure Where To Start? Try One Of These…
            </h2>
            <Link to="/templates" className="text-sm font-semibold text-primary hover:underline">
              View All Templates →
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shuffle}
              className="grid place-items-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-muted"
              aria-label="Shuffle Templates"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => (o - pageSize + order.length) % order.length)}
              className="grid place-items-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-muted"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => (o + pageSize) % order.length)}
              className="grid place-items-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-muted"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((t, i) => (
            <TemplateCard key={`${t.id}-${i}`} template={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsolidationBand() {
  return (
    <section className="bg-ink text-ink-foreground py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.18em]">
            <Sparkles className="h-3.5 w-3.5" />
            One Platform, Not Four Tools
          </div>
          <h2 className="mt-6 font-display text-5xl md:text-6xl font-black leading-[1.05] text-ink-foreground">
            Four Tools.
            <br />
            One Login.
          </h2>
          <p className="mt-6 text-lg text-ink-muted max-w-lg">
            LeadTrace scrapes your leads, verifies their contact info, scrubs them clean, and launches
            your campaign. One platform replaces your scraper, your skip tracer, your DNC service, and
            your texting tool.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/start">
                Start Your 14-Day Free Trial <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full bg-transparent border-white/25 text-ink-foreground hover:bg-white/10 hover:text-ink-foreground"
            >
              <Link to="/how-it-works">
                <Play className="mr-1 h-4 w-4" /> Watch Demo
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-ink-muted">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> 14-Day Free Trial
            </span>
          </div>
        </div>
        <div className="relative">
          <div className="flex gap-2 mb-4">
            {["Business", "Records", "Upload"].map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/20 bg-white/5 text-ink-foreground/90 px-3 py-1 text-xs font-medium"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="relative rounded-2xl bg-white text-foreground p-6 rotate-[-1.5deg] shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pipeline Status
            </div>
            <div className="mt-2 font-display font-black text-3xl">
              Skip Traced <span className="text-primary">2,810</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: "78%" }} />
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 text-sm">
              <Check className="h-4 w-4" />
              Compliance Scrub Baked In
            </div>
            <div className="absolute -top-4 -right-4 rounded-xl bg-ink text-ink-foreground px-4 py-2 text-sm font-semibold rotate-[4deg] shadow-lg">
              Reply Rate <span style={{ color: "#F5D547" }}>12.4%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: "01", title: "Pick Your Source.", body: "Scrape a niche, scrape public records, or upload a list you already own." },
    { n: "02", title: "We Do The Grunt Work.", body: "De-dupe, remove franchises, skip trace missing numbers, and scrub DNC + litigators into three files." },
    { n: "03", title: "Launch The Campaign.", body: "Send from geo-matched numbers with drips that stop the second someone replies." },
  ];
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="How It Works" title="Three Doors. One Pipeline." />
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface p-8">
              <div className="text-primary font-display text-4xl font-black">{s.n}</div>
              <div className="mt-4 text-xl font-display font-bold text-foreground">{s.title}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Search, title: "Niche Scraper", body: "Type A Trade And A State. Get Every Small Business, Franchises Removed." },
    { icon: Landmark, title: "Public Records", body: "Probates, Code Violations, Pre-Foreclosures, Tax Defaults, Vacancy Notices." },
    { icon: Upload, title: "Bring Your Own List", body: "Already Have Data? Drop A CSV And Skip Straight To Cleaning." },
    { icon: UserSearch, title: "Auto Skip Trace", body: "Missing Phone Numbers Filled In Automatically." },
    { icon: ShieldCheck, title: "Built-In Scrubbing", body: "DNC And Litigators Removed. Three Files, Every Time." },
    { icon: MessageSquare, title: "Smart Campaigns", body: "Geo-Matched Numbers, Message Rotation, Reply-Stop Drips." },
    { icon: Activity, title: "List Quality Score", body: "See How Hot A List Is Before You Spend A Credit." },
    { icon: Lock, title: "Compliance First", body: "10DLC Guided Setup, STOP Handling, Audit Logs." },
  ];
  return (
    <section className="bg-surface-muted py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Features" title="Everything The Pipeline Needs. Nothing It Doesn't." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-6">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display font-bold text-foreground">{f.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IndustriesSection() {
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Industries" title="Same Engine. Your Playbook." />
        <div className="flex flex-wrap gap-2 justify-center mt-10">
          {INDUSTRIES.map((i) => (
            <span
              key={i.key}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground"
            >
              {i.label}
            </span>
          ))}
        </div>
        <p className="text-center text-muted-foreground text-sm mt-6 max-w-2xl mx-auto">
          Insurance agents pull business lists. Real estate wholesalers pull public records.
          Home services scrape their trade. Same pipeline, tuned to the way you sell.
        </p>
      </div>
    </section>
  );
}

function PricingPreview() {
  const tiers = [
    { name: "Starter", price: 97, for: "Solo Operators", featured: false },
    { name: "Growth", price: 197, for: "Teams Doing Volume", featured: true },
    { name: "Scale", price: 497, for: "High-Volume / Agencies", featured: false },
  ];
  return (
    <section className="bg-surface-muted py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Pricing" title="Plans That Scale With You." />
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-8 ${t.featured ? "border-primary bg-surface shadow-xl" : "border-border bg-surface"}`}
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
                <Link to="/pricing">See Full Comparison</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          All Plans Include A 30-Day Money-Back Guarantee · No Credit Card Required To Start
        </p>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">{eyebrow}</div>
      <h2 className="mt-3 font-display text-4xl md:text-5xl font-black text-foreground leading-tight">
        {title}
      </h2>
    </div>
  );
}
