import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In — LeadForge" },
      { name: "description", content: "Sign in to your LeadForge workspace." },
      { property: "og:title", content: "Sign In To LeadForge" },
      { property: "og:description", content: "Sign in to your LeadForge workspace." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-4xl font-black text-foreground">Welcome Back.</h1>
        <p className="text-muted-foreground mt-2">Sign in to run your pipeline.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.assign("/app/dashboard");
          }}
        >
          <div>
            <Label htmlFor="email">Work Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className="mt-1" />
          </div>
          <Button type="submit" className="w-full rounded-full">Sign In</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-6 text-center">
          New To LeadForge?{" "}
          <Link to="/start" className="text-primary font-medium">Start Free Trial</Link>
        </p>
      </section>
    </MarketingLayout>
  );
}