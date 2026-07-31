import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/components/translation-provider";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/config/brand";
import { Button } from "@/components/ui/button";
import {
  Radar,
  ShieldCheck,
  Database,
  Phone,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "EN", g: "en", label: "English", flag: "🇺🇸" },
  { code: "ES", g: "es", label: "Español", flag: "🇪🇸" },
  { code: "PT", g: "pt", label: "Português", flag: "🇧🇷" },
  { code: "FR", g: "fr", label: "Français", flag: "🇫🇷" },
  { code: "DE", g: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "IT", g: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "NL", g: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "PL", g: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "SV", g: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "TR", g: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "AR", g: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "HE", g: "he", label: "עברית", flag: "🇮🇱" },
  { code: "RU", g: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ZH", g: "zh", label: "中文", flag: "🇨🇳" },
  { code: "JA", g: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "KO", g: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "HI", g: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "VI", g: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "TH", g: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "ID", g: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
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

const NAV_LINKS = [
  { to: "/leads", label: "Lead Lists" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/tools", label: "Free Tools" },
  { to: "/pricing", label: "Pricing" },
] as const;

export { ComplianceStrip, MarketingFooter };

export function MarketingNav({ dark = false }: { dark?: boolean }) {
  const { lang, setLang, translating } = useTranslation();
  const current = LANGUAGES.find((l) => l.g === lang) ?? LANGUAGES[0];
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
      <div className="w-full px-6 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
            <Radar className="h-5 w-5" />
          </span>
          {BRAND_NAME}
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium justify-self-center">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={dark ? "text-ink-foreground/90 hover:text-ink-foreground" : "text-foreground hover:text-primary"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4 justify-self-end">
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
              data-no-translate
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                dark
                  ? "border-white/20 text-ink-foreground hover:bg-white/10"
                  : "border-border text-foreground hover:bg-surface-muted"
              }`}
            >
              <span className="text-base leading-none">{current.flag}</span>
              <span>{current.code}</span>
              {translating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-no-translate className="max-h-80 overflow-y-auto w-56">
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onSelect={() => setLang(l.g)}
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
        <Item icon={<Database className="h-6 w-6 shrink-0" />} label="Google Maps + Public Records" />
        <Item icon={<ShieldCheck className="h-6 w-6 shrink-0" />} label="DNC + Litigator Scrubbed" />
        <Item icon={<Phone className="h-6 w-6 shrink-0" />} label="Local Numbers & Rotation" />
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
      <div className="w-full px-6 py-10 grid grid-cols-1 md:grid-cols-2 items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-display font-bold text-base text-foreground">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground">
            <Radar className="h-4 w-4" />
          </span>
          {BRAND_NAME}
        </div>
        <div className="text-right md:text-right">© {new Date().getFullYear()} {BRAND_NAME}. All Rights Reserved.</div>
      </div>
    </footer>
  );
}