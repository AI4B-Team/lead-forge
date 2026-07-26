import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDUSTRIES } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start Free Trial — LeadTrace" },
      { name: "description", content: "Start your 14-day LeadTrace trial. No credit card required." },
      { property: "og:title", content: "Start Your LeadTrace Trial" },
      { property: "og:description", content: "14 days free. No credit card. Cancel anytime." },
    ],
  }),
  component: Start,
});

function Start() {
  const [industry, setIndustry] = useState<string>("insurance");
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-lg px-6 py-20">
        <h1 className="font-display text-4xl font-black text-foreground">Start Your Free Trial.</h1>
        <p className="text-muted-foreground mt-2">14 Days Free. No Credit Card. Cancel Anytime.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.assign("/app/dashboard");
          }}
        >
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Jane Smith" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Work Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className="mt-1" />
          </div>
          <div>
            <Label>What Industry?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  key={i.key}
                  type="button"
                  onClick={() => setIndustry(i.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                    industry === i.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-foreground border-border"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full rounded-full">Create My Workspace</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-6 text-center">
          Already Have An Account?{" "}
          <Link to="/sign-in" className="text-primary font-medium">Sign In</Link>
        </p>
      </section>
    </MarketingLayout>
  );
}