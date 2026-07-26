import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Flame, ShieldCheck, FileCheck, MessageCircleOff, BadgeCheck } from "lucide-react";

const NAV = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/features", label: "Features" },
  { to: "/industries", label: "Industries" },
  { to: "/pricing", label: "Pricing" },
  { to: "/compliance", label: "Compliance" },
] as const;

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <ComplianceStrip />
      <MarketingFooter />
    </div>
  );
}

export { ComplianceStrip, MarketingFooter };

export function MarketingNav({ dark = false }: { dark?: boolean }) {
  const linkClass = dark
    ? "text-ink-muted hover:text-ink-foreground"
    : "text-muted-foreground hover:text-foreground";
  return (
    <header
      className={
        dark
          ? "border-b border-white/10 bg-ink text-ink-foreground"
          : "border-b border-border bg-background"
      }
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
            <Flame className="h-4 w-4" />
          </span>
          {BRAND_NAME}
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/sign-in"
            className={`text-sm font-medium ${dark ? "text-ink-foreground" : "text-foreground"}`}
          >
            Sign In
          </Link>
          <Button asChild className="rounded-full">
            <Link to="/start">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ComplianceStrip() {
  return (
    <section className="bg-ink text-ink-foreground py-10">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <Item icon={<ShieldCheck className="h-4 w-4" />} label="DNC + Litigator Scrubbing On Every List" />
        <Item icon={<MessageCircleOff className="h-4 w-4" />} label="Automatic STOP Handling" />
        <Item icon={<FileCheck className="h-4 w-4" />} label="Timestamped Audit Logs" />
        <Item icon={<BadgeCheck className="h-4 w-4" />} label="10DLC Guided Registration" />
      </div>
    </section>
  );
}

function Item({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span className="text-ink-foreground/90">{label}</span>
    </div>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-display font-bold text-base text-foreground">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground">
            <Flame className="h-3.5 w-3.5" />
          </span>
          {BRAND_NAME}
        </div>
        <div className="flex gap-6">
          <Link to="/pricing">Pricing</Link>
          <Link to="/compliance">Compliance</Link>
          <Link to="/sign-in">Sign In</Link>
        </div>
        <div>© {new Date().getFullYear()} {BRAND_NAME}. All Rights Reserved.</div>
      </div>
    </footer>
  );
}