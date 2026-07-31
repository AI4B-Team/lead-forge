import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Building2, CheckCircle2, MapPin, Send, ShieldCheck, Smartphone } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { LivePipeline } from "@/components/marketing/live-pipeline";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "From Raw Data To Ready-To-Contact Leads | LeadTrace" },
      {
        name: "description",
        content:
          "See what happens after you click Build My List: five verification steps that turn 1,240 raw businesses into 554 clean, mobile-verified, DNC-scrubbed contacts in about 90 seconds.",
      },
      { property: "og:title", content: "From Raw Data To Ready-To-Contact Leads — LeadTrace" },
      {
        property: "og:description",
        content: "One request. Five verification steps. A list you can text in about 90 seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorks,
});

const STAGES = [
  {
    icon: MapPin,
    name: "Find Businesses",
    body: "Pull businesses from Google Maps, public records, or upload your own list.",
    time: "~15 seconds",
  },
  {
    icon: Building2,
    name: "Verify Contacts",
    body: "Remove duplicates, filter out franchise locations, and standardize every record.",
    time: "~20 seconds",
  },
  {
    icon: Smartphone,
    name: "Fill Missing Data",
    body: "Carrier lookup identifies mobile numbers, and missing phones or emails are appended when available.",
    time: "~40 seconds",
  },
  {
    icon: ShieldCheck,
    name: "Clean & Comply",
    body: "Checked against the National DNC Registry and known-litigator databases before delivery.",
    time: "~15 seconds",
  },
  {
    icon: Send,
    name: "Launch Outreach",
    body: "Send campaigns from local numbers, rotate sending, and automate follow-up and STOP handling.",
    time: "When you're ready",
  },
];

function HowItWorks() {
  return (
    <MarketingLayout>
      {/* Hero + input → output transformation */}
      <section className="bg-background pt-16 pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How It Works</div>
          <h1 className="mt-3 font-display text-4xl md:text-6xl font-black leading-[1.05] text-foreground">
            From Raw Data To Ready-To-Contact Leads
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            One request. Five verification steps. You type a niche and a location; you get back a list of
            mobile numbers you can text today.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Input</div>
              <div className="mt-3 font-display text-2xl font-black text-foreground">Roofers in Texas</div>
              <div className="mt-1 text-sm text-muted-foreground">1,240 businesses found</div>
            </div>
            <div className="grid place-items-center text-muted-foreground">
              <ArrowDown className="h-6 w-6 md:hidden" />
              <ArrowRight className="hidden h-6 w-6 md:block" />
            </div>
            <div className="rounded-2xl border border-primary bg-primary/5 p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">Output</div>
              <div className="mt-3 font-display text-2xl font-black text-foreground">
                554 clean mobile contacts
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Ready to text · about 90 seconds</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live run */}
      <section className="border-y border-border bg-surface-muted py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            Watch A List Get Clean
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            This is the same run behind every number on our site — 1,240 businesses in, 554 textable
            contacts out.
          </p>
          <LivePipeline className="mt-8" />
        </div>
      </section>

      {/* Five steps */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground">
            Every List Follows The Same Five Steps
          </h2>
          <div className="mt-10 space-y-4">
            {STAGES.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-start gap-5 rounded-2xl border border-border bg-surface p-6">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div className="font-display text-xl font-black text-foreground">
                        {i + 1}. {s.name}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {s.time}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </div>
                {i < STAGES.length - 1 && (
                  <div className="grid place-items-center py-1 text-muted-foreground/60">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-start gap-3 rounded-2xl border border-primary bg-primary/5 p-6">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-base font-semibold text-foreground">
              Nothing is delivered until every record completes every step — so quality is the same on
              every list, every time.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/start">
                Build My List <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/leads">See Sample List</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
