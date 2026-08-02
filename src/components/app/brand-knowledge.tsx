import {
  FileText,
  Globe,
  HelpCircle,
  MessageSquareQuote,
  Mic,
  PhoneCall,
  Video,
  Brain,
  Sparkles,
  ChevronRight,
  Mail,
  Package,
  Check,
  AlertTriangle,
  Minus,
  Headphones,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type KnowledgeSource = { source_type: string; chars: number; created_at: string };

export type KnowledgeBucket = {
  key: string;
  label: string;
  icon: LucideIcon;
  count: number;
  unit: string;
};

/** Group raw training sources into the buckets a user thinks in. */
export function bucketKnowledge(sources: KnowledgeSource[]): KnowledgeBucket[] {
  const by = (t: string) => sources.filter((s) => s.source_type === t).length;
  return [
    { key: "url", label: "Website", icon: Globe, count: by("url"), unit: "Pages" },
    { key: "file", label: "Documents", icon: FileText, count: by("file"), unit: "Files" },
    { key: "text", label: "Scripts & Notes", icon: MessageSquareQuote, count: by("text"), unit: "Entries" },
    { key: "voice", label: "Dictation", icon: Mic, count: by("voice"), unit: "Recordings" },
  ];
}

/** 0-100 readiness: coverage across buckets plus depth of material. */
export function knowledgeScore(sources: KnowledgeSource[]): number {
  if (!sources.length) return 0;
  const buckets = bucketKnowledge(sources).filter((b) => b.count > 0).length;
  const chars = sources.reduce((a, s) => a + s.chars, 0);
  const coverage = (buckets / 4) * 55;
  const depth = Math.min(45, (chars / 24000) * 45);
  return Math.max(6, Math.min(100, Math.round(coverage + depth)));
}

const TRAINABLE: { icon: LucideIcon; title: string; action: string; lines: string[] }[] = [
  { icon: Globe, title: "Website", action: "Crawl Public Pages", lines: ["About", "Services", "Pricing", "Contact"] },
  { icon: FileText, title: "Documents", action: "Upload PDFs", lines: ["SOPs", "Manuals", "Brochures", "Spec Sheets"] },
  { icon: Headphones, title: "Call Recordings", action: "Learn Winning Conversations", lines: ["Discovery Calls", "Closing Calls", "Objections"] },
  { icon: MessageSquareQuote, title: "Sales Scripts", action: "Copy Your Best Rep", lines: ["Openers", "Objections", "Offers"] },
  { icon: HelpCircle, title: "FAQs", action: "Answer Without Guessing", lines: ["Questions", "Approved Answers", "What You Never Promise"] },
  { icon: Video, title: "Videos", action: "Pull Transcripts", lines: ["YouTube & Loom", "Training Sessions", "Walkthroughs"] },
  { icon: Mail, title: "Emails", action: "Learn From Past Threads", lines: ["Customer Replies", "Follow-Ups", "Common Asks"] },
  { icon: Package, title: "Product Catalog", action: "Quote Real Details", lines: ["Pricing", "Features", "Warranties", "Specifications"] },
];

/** The categories of material the AI can absorb. */
export function TrainableSources() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRAINABLE.map((t) => (
        <Card key={t.title} className="group transition hover:border-primary/60 hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <t.icon className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 font-display font-bold text-foreground">{t.title}</div>
            <div className="mt-0.5 text-xs font-semibold text-primary">{t.action}</div>
            <ul className="mt-2.5 space-y-1">
              {t.lines.map((l) => (
                <li key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" /> {l}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const LEARNS = ["Pricing", "Objections", "FAQs", "Tone Of Voice", "Policies", "Services", "Warranties", "Next Steps"];

/** Uploads → AI Learns: makes the payoff tangible instead of stopping at inputs. */
export function KnowledgeOutcome() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] lg:items-center">
      <div className="rounded-xl border border-border bg-surface px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">You Upload</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Website", "Documents", "Scripts", "Calls", "Emails", "Catalog"].map((l) => (
            <Badge key={l} variant="outline" className="text-[11px] font-medium">{l}</Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center">
        <ChevronRight className="h-5 w-5 rotate-90 text-primary lg:rotate-0" style={{ animation: "knowledge-pulse 3.5s ease-in-out infinite" }} />
      </div>
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Brain className="h-3.5 w-3.5" /> Your AI Learns
        </div>
        <div className="mt-2 grid grid-cols-2 gap-y-1.5 sm:grid-cols-4">
          {LEARNS.map((l) => (
            <div key={l} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Check className="h-3.5 w-3.5 text-success" /> {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SAMPLE_QUESTIONS = [
  "What Financing Do We Offer?",
  "How Do We Compare To Competitors?",
  "What Do I Say When Someone Says We're Too Expensive?",
  "Summarize Our Warranty.",
  "How Should I Respond To This Objection?",
  "What's Our Turnaround Time?",
];

/** Concrete questions the trained AI can answer — sells the feature instantly. */
export function SampleQuestions() {
  return (
    <div className="flex flex-wrap gap-2">
      {SAMPLE_QUESTIONS.map((q) => (
        <span
          key={q}
          className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground"
        >
          “{q}”
        </span>
      ))}
    </div>
  );
}

export type HealthRow = { label: string; status: "ok" | "warn" | "missing"; detail: string };

/** Maps live training sources to a plain-language health checklist. */
export function knowledgeHealth(sources: KnowledgeSource[]): HealthRow[] {
  const count = (t: string) => sources.filter((s) => s.source_type === t).length;
  const row = (label: string, n: number, unit: string, weight: "warn" | "missing" = "missing"): HealthRow =>
    n > 0
      ? { label, status: "ok", detail: `${n} ${unit}${n === 1 ? "" : "s"}` }
      : { label, status: weight, detail: weight === "warn" ? "Missing" : "Not Added" };
  return [
    row("Website", count("url"), "Page", "warn"),
    row("Documents", count("file"), "File", "warn"),
    row("Scripts & FAQs", count("text"), "Entry", "warn"),
    row("Call Recordings", count("voice"), "Recording"),
  ];
}

/** Post-creation card telling the user exactly what to improve next. */
export function KnowledgeHealth({ sources, score }: { sources: KnowledgeSource[]; score: number }) {
  const rows = knowledgeHealth(sources);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Knowledge Health</div>
        <div className="text-xs text-muted-foreground">
          Confidence <span className="font-bold tabular-nums text-foreground">{score}%</span>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {r.status === "ok" && <Check className="h-4 w-4 text-success" />}
              {r.status === "warn" && <AlertTriangle className="h-4 w-4 text-warning" />}
              {r.status === "missing" && <Minus className="h-4 w-4 text-muted-foreground" />}
              {r.label}
            </div>
            <span className="text-xs text-muted-foreground">{r.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FLOW: { label: string; icon: LucideIcon }[] = [
  { label: "Brand", icon: Sparkles },
  { label: "Website", icon: Globe },
  { label: "Training", icon: FileText },
  { label: "Knowledge", icon: Brain },
  { label: "AI Replies", icon: MessageSquareQuote },
];

/** Animated left-to-right reading flow — feels like the AI is absorbing. */
export function KnowledgeFlow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {FLOW.map((f, i) => (
        <div key={f.label} className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2"
            style={{ animation: "knowledge-pulse 5s ease-in-out infinite", animationDelay: `${i * 0.55}s` }}
          >
            <f.icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{f.label}</span>
          </div>
          {i < FLOW.length - 1 && (
            <ChevronRight
              className="h-4 w-4 text-muted-foreground"
              style={{ animation: "knowledge-pulse 5s ease-in-out infinite", animationDelay: `${i * 0.55 + 0.25}s` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}