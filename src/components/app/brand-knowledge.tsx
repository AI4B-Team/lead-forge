import { FileText, Globe, HelpCircle, MessageSquareQuote, Mic, PhoneCall, Video, Brain, Sparkles, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

const TRAINABLE: { icon: LucideIcon; title: string; lines: string[] }[] = [
  { icon: FileText, title: "Documents", lines: ["PDFs", "Manuals & SOPs", "Spec Sheets"] },
  { icon: Globe, title: "Website", lines: ["Services & Pricing", "About & Policies", "Any Public URL"] },
  { icon: Video, title: "Videos", lines: ["YouTube & Loom", "Training Sessions", "Transcripts"] },
  { icon: MessageSquareQuote, title: "Sales Scripts", lines: ["Objections", "Offers", "Opening Lines"] },
  { icon: PhoneCall, title: "Call Transcripts", lines: ["Winning Conversations", "Discovery Calls", "Handoffs"] },
  { icon: HelpCircle, title: "FAQs", lines: ["Questions", "Answers", "What You Never Promise"] },
];

/** The six categories of material the AI can absorb. */
export function TrainableSources() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TRAINABLE.map((t) => (
        <Card key={t.title} className="group transition hover:border-primary/60">
          <CardContent className="pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <t.icon className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 font-display font-bold text-foreground">{t.title}</div>
            <ul className="mt-2 space-y-1">
              {t.lines.map((l) => (
                <li key={l} className="text-xs text-muted-foreground">{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
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