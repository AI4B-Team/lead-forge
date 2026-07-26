import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Start Free — LeadTrace" },
      { name: "description", content: "Sign in to your LeadTrace workspace or start free in seconds." },
      { property: "og:title", content: "Sign In To LeadTrace" },
      { property: "og:description", content: "Sign in or start free with email and password, or a magic link." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "magic";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/onboarding" },
        });
        if (error) throw error;
        toast.success("Check Your Email To Confirm Your Account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + "/onboarding" },
        });
        if (error) throw error;
        toast.success("Magic Link Sent. Check Your Email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something Went Wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <section className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16">
          {/* Left panel — brand / value */}
          <aside className="relative hidden lg:flex flex-col justify-between rounded-3xl bg-foreground text-background p-10 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2">
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground">
                  <Radar className="h-5 w-5" />
                </span>
                <span className="font-display text-xl font-black tracking-tight">LeadTrace</span>
              </div>
              <h2 className="mt-10 font-display text-4xl xl:text-5xl font-black leading-[1.02] tracking-tight">
                Find Them.<br />Reach Them.<br />Close Them.
              </h2>
              <p className="mt-4 max-w-sm text-background/70">
                One Pipeline For Scraping, Skip Tracing, Scrubbing, And SMS — Compliance Baked In.
              </p>
            </div>
            <ul className="relative mt-10 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>DNC + Litigator Scrubbing On Every List.</span>
              </li>
              <li className="flex items-start gap-3">
                <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>Regional Numbers, Rotation, And Daily Caps Built In.</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>Business Scrapes + Public Records In One Place.</span>
              </li>
            </ul>
          </aside>

          {/* Right panel — auth form */}
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:pl-4">
          <h1 className="font-display text-4xl font-black text-foreground">
            {mode === "signup" ? "Start Free." : mode === "magic" ? "Magic Link Sign In." : "Welcome Back."}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "signup"
              ? "Create Your LeadTrace Workspace In Seconds."
              : mode === "magic"
                ? "We'll Email You A One-Tap Sign-In Link."
                : "Sign In To Run Your Pipeline."}
          </p>

          <div className="mt-6 flex gap-2 text-sm font-medium">
            <TabBtn active={mode === "signin"} onClick={() => setMode("signin")}>Sign In</TabBtn>
            <TabBtn active={mode === "signup"} onClick={() => setMode("signup")}>Start Free</TabBtn>
            <TabBtn active={mode === "magic"} onClick={() => setMode("magic")}>Magic Link</TabBtn>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1"
              />
            </div>
            {mode !== "magic" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy ? "Working…" : mode === "signup" ? "Create Workspace" : mode === "magic" ? "Send Magic Link" : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            By Continuing You Agree To Our <Link to="/compliance" className="text-primary font-medium">Compliance Terms</Link>.
          </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}