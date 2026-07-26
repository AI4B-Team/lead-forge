import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Landmark, Upload, ShieldCheck, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How LeadTrace Works — From Source To Send" },
      { name: "description", content: "Three doors in, one compliant pipeline out. See how LeadTrace scrapes, skip traces, scrubs, and launches your campaigns." },
      { property: "og:title", content: "How LeadTrace Works" },
      { property: "og:description", content: "Three doors in, one compliant pipeline out." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  const stages = [
    { icon: Search, name: "Source", body: "Scrape a niche, pull public records, or upload your own list." },
    { icon: Upload, name: "Enrich", body: "De-dupe, remove franchises, tag mobile vs landline." },
    { icon: Landmark, name: "Skip Trace", body: "Fill missing phones and emails from your provider of choice." },
    { icon: ShieldCheck, name: "Scrub", body: "DNC and litigator scrub. Clean, DNC, and Litigator files every time." },
    { icon: MessageSquare, name: "Send", body: "Geo-matched numbers, message rotation, reply-stop drips." },
  ];
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">How It Works</div>
        <h1 className="mt-3 font-display text-5xl font-black text-foreground leading-tight">
          Three Doors In. One Pipeline Out.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Every job flows through the same conveyor belt. That is the whole product: repeatable,
          compliant, and boring in the best way.
        </p>

        <div className="mt-14 space-y-4">
          {stages.map((s, i) => (
            <div key={s.name} className="rounded-2xl border border-border bg-surface p-6 flex items-start gap-5">
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary/10 text-primary shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Stage 0{i + 1}
                </div>
                <div className="font-display font-bold text-xl text-foreground mt-1">{s.name}</div>
                <p className="text-sm text-muted-foreground mt-2">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/start">Start Free Trial <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/pricing">See Pricing</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}