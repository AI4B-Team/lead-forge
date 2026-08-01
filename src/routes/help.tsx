import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Search, Upload, ShieldCheck, MessageSquare, Phone, CreditCard } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — LeadTrace" },
      { name: "description", content: "Answers on generating lists, uploading your own data, skip trace, DNC and litigator scrubbing, number pools, and SMS compliance." },
      { property: "og:title", content: "LeadTrace Help Center" },
      { property: "og:description", content: "Everything from first list to first campaign, in plain language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Help,
});

const TOPICS = [
  { icon: Search, title: "Generating Lists", body: "Enter a niche and a county. We pull matching businesses from multiple sources and price the run before it starts." },
  { icon: Upload, title: "Uploading Your Own List", body: "Import a CSV, map your columns, and run the same clean-and-scrub pipeline without paying for sourcing." },
  { icon: ShieldCheck, title: "Clean & Scrub", body: "Every record is deduped, line-type checked, and scrubbed against DNC and litigator data with a timestamped audit trail." },
  { icon: CreditCard, title: "Credits & Skip Trace", body: "One lead credit covers a fully processed record. Skip tracing is included on Growth and up within daily and monthly fair-use limits, then metered per hit." },
  { icon: Phone, title: "Numbers & Registration", body: "Carrier brand and campaign registration is free on every plan. Numbers rotate from a managed pool with health monitoring." },
  { icon: MessageSquare, title: "Campaigns & Compliance", body: "Quiet hours follow the recipient's timezone, STOP is processed automatically, and litigators can never enter a campaign." },
];

const FAQS = [
  { q: "Do I Need To Install Anything?", a: "No. Everything runs in the browser, and jobs keep running server-side after you close the tab." },
  { q: "How Fresh Is The DNC Scrub?", a: "Lists older than 30 days are re-scrubbed automatically before a campaign can launch." },
  { q: "Can I Text Landlines?", a: "Landlines and VoIP stay on your list for calling, but they're excluded from the textable pool." },
  { q: "What Happens If A Provider Is Down?", a: "Your job pauses safely, shows the exact stage that stalled, and resumes on its own — nothing is discarded." },
];

function Help() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">Help Center</div>
          <h1 className="mt-3 font-display text-5xl font-black text-foreground leading-tight">How LeadTrace Works</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            From first list to first campaign, in plain language. Prefer a walkthrough?{" "}
            <Link to="/tutorials" className="text-primary font-semibold">See The Tutorials</Link>.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {TOPICS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-border bg-surface p-6">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                <t.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h2 className="mt-4 font-display font-bold text-lg text-foreground">{t.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-20 font-display text-3xl font-black text-foreground">Common Questions</h2>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-display font-bold text-base text-foreground">{f.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}