import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { INDUSTRY_LANDINGS } from "@/lib/industry-landings";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — Same Engine. Your Playbook. — LeadTrace" },
      { name: "description", content: "Insurance, real estate, solar, home services, and agencies all run on the same LeadTrace pipeline, tuned to their playbook." },
      { property: "og:title", content: "LeadTrace For Every Industry" },
      { property: "og:description", content: "Same engine. Your playbook." },
    ],
  }),
  component: Industries,
});

function Industries() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">Industries</div>
          <h1 className="mt-3 font-display text-5xl md:text-6xl font-black text-foreground leading-tight">
            Same Engine. Your Playbook.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Pick the playbook you run. Every industry gets tuned prompts, targeting, and outreach templates on the same compliant pipeline.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {INDUSTRY_LANDINGS.map((i) => {
            const Icon = i.icon;
            return (
              <Link
                key={i.slug}
                to={`/${i.slug}` as string}
                className="group rounded-2xl border border-border bg-surface p-6 hover:border-primary hover:shadow-lg transition"
              >
                <div className="grid place-items-center h-11 w-11 rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-display font-bold text-xl text-foreground">{i.industry}</div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{i.hero.subtitle}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                  See The Playbook <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </MarketingLayout>
  );
}