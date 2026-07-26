import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
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
  { code: "HE", g: "iw", label: "עברית", flag: "🇮🇱" },
  { code: "RU", g: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ZH", g: "zh-CN", label: "中文", flag: "🇨🇳" },
  { code: "JA", g: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "KO", g: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "HI", g: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "VI", g: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "TH", g: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "ID", g: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
] as const;

function readGoogTrans(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )googtrans=([^;]+)/);
  if (!m) return "en";
  const parts = decodeURIComponent(m[1]).split("/");
  return parts[2] || "en";
}

function setGoogTrans(target: string) {
  const value = `/en/${target}`;
  const host = window.location.hostname;
  document.cookie = `googtrans=${value}; path=/`;
  // set for parent domain too so it survives subdomain nav
  const parts = host.split(".");
  if (parts.length > 1) {
    const parent = "." + parts.slice(-2).join(".");
    document.cookie = `googtrans=${value}; path=/; domain=${parent}`;
  }
}

function ensureGoogleTranslateScript() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { googleTranslateElementInit?: () => void; google?: { translate?: unknown } };
  if (document.getElementById("google-translate-script")) return;
  w.googleTranslateElementInit = () => {
    const g = (window as unknown as { google?: { translate?: { TranslateElement?: new (opts: unknown, el: string) => void } } }).google;
    const TE = g?.translate?.TranslateElement as (new (opts: unknown, el: string) => void) | undefined;
    if (!TE) return;
    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }
    new TE({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
  };
  const s = document.createElement("script");
  s.id = "google-translate-script";
  s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.body.appendChild(s);

  // Hide the Google Translate top banner it forces on <body>.
  const style = document.createElement("style");
  style.innerHTML = `
    .goog-te-banner-frame, .skiptranslate { display: none !important; }
    body { top: 0 !important; }
  `;
  document.head.appendChild(style);
}

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
  useEffect(() => {
    ensureGoogleTranslateScript();
    const g = readGoogTrans();
    const match = LANGUAGES.find((l) => l.g === g);
    if (match) setLang(match.code);
  }, []);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const handleSelect = (code: (typeof LANGUAGES)[number]["code"]) => {
    const target = LANGUAGES.find((l) => l.code === code);
    if (!target) return;
    setLang(code);
    if (target.g === "en") {
      // Clear translation cookies
      document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      const host = window.location.hostname.split(".").slice(-2).join(".");
      document.cookie = `googtrans=; path=/; domain=.${host}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } else {
      setGoogTrans(target.g);
    }
    window.location.reload();
  };
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
                  onSelect={() => handleSelect(l.code)}
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