import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneCall, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "Free Lead Tools — DNC & Line Type Checkers | LeadTrace" },
      { name: "description", content: "Free single-number tools: check the National DNC Registry and look up whether a number is mobile, landline, or VoIP. No download, no setup." },
      { property: "og:title", content: "Free Lead Tools — DNC & Line Type Checkers" },
      { property: "og:description", content: "Check DNC status and line type for any number, free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolsHub,
});

const TOOLS = [
  {
    to: "/tools/dnc-checker",
    icon: ShieldCheck,
    title: "DNC Number Checker",
    body: "Paste a number and see whether it lands on the National Do Not Call Registry before you text it.",
  },
  {
    to: "/tools/line-type-checker",
    icon: PhoneCall,
    title: "Line Type Checker",
    body: "Landline, mobile, or VoIP. Texting a landline burns credits and hurts your sender reputation.",
  },
] as const;

function ToolsHub() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">Free Tools</div>
        <h1 className="mt-3 font-display text-5xl font-black text-foreground leading-tight">
          Free Tools for Clean Outreach
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Two checks we run automatically on every list, opened up one number at a time. No download, no setup.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="pt-6">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
                    <t.icon className="h-5 w-5" />
                  </span>
                  <div className="mt-4 font-display text-xl font-bold text-foreground">{t.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open Tool <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
