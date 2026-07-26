import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/config/brand";
import { Button } from "@/components/ui/button";
import {
  Radar,
  ShieldCheck,
  Database,
  Phone,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "EN", label: "English", flag: "🇺🇸" },
  { code: "ES", label: "Español", flag: "🇪🇸" },
  { code: "PT", label: "Português", flag: "🇧🇷" },
  { code: "FR", label: "Français", flag: "🇫🇷" },
  { code: "DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "IT", label: "Italiano", flag: "🇮🇹" },
  { code: "NL", label: "Nederlands", flag: "🇳🇱" },
  { code: "PL", label: "Polski", flag: "🇵🇱" },
  { code: "SV", label: "Svenska", flag: "🇸🇪" },
  { code: "TR", label: "Türkçe", flag: "🇹🇷" },
  { code: "AR", label: "العربية", flag: "🇸🇦" },
  { code: "HE", label: "עברית", flag: "🇮🇱" },
  { code: "RU", label: "Русский", flag: "🇷🇺" },
  { code: "ZH", label: "中文", flag: "🇨🇳" },
  { code: "JA", label: "日本語", flag: "🇯🇵" },
  { code: "KO", label: "한국어", flag: "🇰🇷" },
  { code: "HI", label: "हिन्दी", flag: "🇮🇳" },
  { code: "VI", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "TH", label: "ไทย", flag: "🇹🇭" },
  { code: "ID", label: "Bahasa Indonesia", flag: "🇮🇩" },
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
  const [lang, setLang] = useState<(typeof LANGUAGES)[number]["code"]>("EN");
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const { session, loading } = useAuth();
  const signedIn = !!session;
  return (
    <header
      className={
        dark
          ? "border-b border-white/10 bg-ink text-ink-foreground"
          : "border-b border-border bg-background"
      }
    >
      <div className="w-full px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
            <Radar className="h-5 w-5" />
          </span>
          {BRAND_NAME}
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {!loading && signedIn ? (
            <>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.assign("/");
                }}
                className={`text-sm font-medium px-2 ${dark ? "text-ink-foreground" : "text-foreground"}`}
              >
                Sign Out
              </button>
              <Button asChild className="rounded-full">
                <Link to="/app/dashboard">Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className={`text-sm font-medium px-2 ${dark ? "text-ink-foreground" : "text-foreground"}`}
              >
                Log In
              </Link>
              <Button asChild className="rounded-full">
                <Link to="/auth" search={{ mode: "signup" }}>Start Free</Link>
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Select language"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                dark
                  ? "border-white/20 text-ink-foreground hover:bg-white/10"
                  : "border-border text-foreground hover:bg-surface-muted"
              }`}
            >
              <span className="text-base leading-none">{current.flag}</span>
              <span>{current.code}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-56">
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onSelect={() => setLang(l.code)}
                  className="cursor-pointer gap-2"
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="font-medium w-8">{l.code}</span>
                  <span className="text-muted-foreground">{l.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function ComplianceStrip() {
  return (
    <section className="bg-ink text-ink-foreground py-10">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-around gap-4 text-sm">
        <Item icon={<Database className="h-4 w-4 shrink-0" />} label="Business Scrapes + Public Records In One Place" />
        <Item icon={<ShieldCheck className="h-4 w-4 shrink-0" />} label="DNC + Litigator Scrubbing On Every List" />
        <Item icon={<Phone className="h-4 w-4 shrink-0" />} label="Local Phone Numbers & Rotation" />
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
      <div className="w-full px-6 py-10 grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-display font-bold text-base text-foreground">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground">
            <Radar className="h-4 w-4" />
          </span>
          {BRAND_NAME}
        </div>
        <div className="flex justify-center gap-6">
          <Link to="/pricing">Pricing</Link>
          <Link to="/compliance">Compliance</Link>
          <Link to="/sign-in">Sign In</Link>
        </div>
        <div className="text-right">© {new Date().getFullYear()} {BRAND_NAME}. All Rights Reserved.</div>
      </div>
    </footer>
  );
}