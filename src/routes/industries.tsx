import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { INDUSTRIES } from "@/lib/mock-data";
import { useState } from "react";

const PRESETS: Record<string, { source: string; sample: string }> = {
  insurance: { source: "Business Scrape · Local Prospects", sample: "Hey {{FirstName}}, quick question — Are You Still Reviewing Medicare Options This Year? No pressure, just checking in." },
  real_estate: { source: "Public Records · Probate + Pre-Foreclosure", sample: "Hi {{FirstName}}, Are You Open To Offers On The Property At {{Address}}? Cash, quick close, no fees." },
  solar: { source: "Business Scrape · Roofers + Contractors", sample: "Hey {{FirstName}}, We Partner With Roofers On Solar Referrals — Worth A 5-Min Chat?" },
  home_services: { source: "Business Scrape · Homeowners In {{County}}", sample: "Hi {{FirstName}}, Any HVAC / Plumbing Work Coming Up This Season? We're Booking For Next Week." },
  agency: { source: "Upload · Your Client's List", sample: "White-Labeled Under Your Brand. Configurable Per Client." },
  other: { source: "Any Door You Want", sample: "Same Engine. Your Playbook." },
};

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — Same Engine. Your Playbook. — LeadForge" },
      { name: "description", content: "Insurance, real estate, solar, home services, and agencies all run on the same LeadForge pipeline, tuned to their playbook." },
      { property: "og:title", content: "LeadForge For Every Industry" },
      { property: "og:description", content: "Same engine. Your playbook." },
    ],
  }),
  component: Industries,
});

function Industries() {
  const [active, setActive] = useState<string>("insurance");
  const preset = PRESETS[active];
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">Industries</div>
        <h1 className="mt-3 font-display text-5xl font-black text-foreground leading-tight">
          Same Engine. Your Playbook.
        </h1>
        <div className="flex flex-wrap gap-2 mt-10">
          {INDUSTRIES.map((i) => (
            <button
              key={i.key}
              onClick={() => setActive(i.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                active === i.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface text-foreground border-border hover:border-foreground/30"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Wired To</div>
            <div className="mt-2 font-display font-bold text-2xl text-foreground">{preset.source}</div>
          </div>
          <div className="rounded-2xl border border-border bg-ink text-ink-foreground p-6">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-widest">Sample Message</div>
            <div className="mt-2 text-base">{preset.sample}</div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}