import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        <section className="mx-auto max-w-md px-6 py-16">
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