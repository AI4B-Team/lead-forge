// Coverage-first readiness for the AI Agent. Deliberately NOT a character quota:
// breadth of what the agent can answer is what matters, depth is secondary.
import type { KnowledgeItem } from "@/lib/knowledge-cards.shared";
import { KNOWLEDGE_CARDS } from "@/lib/knowledge-cards.shared";

/** Real content, not an empty stub. */
const MIN_REAL_CHARS = 120;
/** Below this a covered source is honest-but-thin. */
const THIN_CHARS = 600;

/** Source types ordered by how many real buyer questions they unlock. */
export const KEY_SOURCES: { key: string; weight: number; capability: string }[] = [
  { key: "website", weight: 3, capability: "Add Your Website So The Agent Can Answer What You Do, Where You Work, And What You Charge" },
  { key: "faqs", weight: 3, capability: "Add FAQs So Pricing And Timeline Questions Get Approved Answers, Not Guesses" },
  { key: "scripts", weight: 2, capability: "Add A Sales Script So Replies Match How Your Best Rep Talks" },
  { key: "catalog", weight: 2, capability: "Add Your Product Catalog So The Agent Can Quote Real Packages And Warranties" },
  { key: "calls", weight: 1, capability: "Add A Call Transcript So The Agent Handles Objections The Way You Actually Do" },
  { key: "documents", weight: 1, capability: "Add Documents So Terms, Warranties, And Specs Come From Your Paperwork" },
  { key: "emails", weight: 1, capability: "Add Email Threads So Follow-Ups Mirror Replies That Already Work" },
  { key: "videos", weight: 1, capability: "Add A Video Transcript So Walkthrough And Demo Questions Are Covered" },
];

export type SourceDepth = {
  key: string;
  label: string;
  unit: string;
  count: number;
  chars: number;
  /** Human depth string, e.g. "1 Set · 72 Chars" or "None". */
  detail: string;
  covered: boolean;
  thin: boolean;
};

export function formatChars(chars: number) {
  if (chars >= 1000) return `${(chars / 1000).toFixed(chars >= 10000 ? 0 : 1).replace(/\.0$/, "")}k Chars`;
  return `${chars} Chars`;
}

export function sourceDepths(sources: KnowledgeItem[]): SourceDepth[] {
  return KNOWLEDGE_CARDS.map((spec) => {
    const items = sources.filter((s) => s.category === spec.key);
    const chars = items.reduce((a, s) => a + s.chars, 0);
    const covered = items.length > 0 && chars >= MIN_REAL_CHARS;
    const unitPlural = items.length === 1 ? spec.unit : `${spec.unit}s`;
    return {
      key: spec.key,
      label: spec.title,
      unit: spec.unit,
      count: items.length,
      chars,
      detail: items.length === 0 ? "None" : `${items.length} ${unitPlural} · ${formatChars(chars)}`,
      covered,
      thin: items.length > 0 && !covered,
    };
  });
}

export type ReadinessState = "Getting Started" | "Answers Common Questions" | "Well-Trained";

export type Readiness = {
  /** Coverage-weighted, never framed as a finish line. */
  score: number;
  state: ReadinessState;
  coveredCount: number;
  keyCoveredCount: number;
  depths: SourceDepth[];
  /** Highest-value uncovered source type, if any. */
  nextGap: { key: string; label: string; capability: string } | null;
};

export function agentReadiness(sources: KnowledgeItem[]): Readiness {
  const depths = sourceDepths(sources);
  const byKey = new Map(depths.map((d) => [d.key, d]));

  const totalWeight = KEY_SOURCES.reduce((a, s) => a + s.weight, 0);
  const earnedWeight = KEY_SOURCES.reduce(
    (a, s) => a + (byKey.get(s.key)?.covered ? s.weight : 0),
    0,
  );
  // Coverage dominates (80). Depth is a small secondary nudge (20) and saturates
  // early so padding text can never be the way to move the meter.
  const coverage = (earnedWeight / totalWeight) * 80;
  const totalChars = depths.reduce((a, d) => a + d.chars, 0);
  const depth = Math.min(20, (totalChars / 12000) * 20);
  const score = sources.length === 0 ? 0 : Math.max(5, Math.min(100, Math.round(coverage + depth)));

  const coveredCount = depths.filter((d) => d.covered).length;
  const keyCovered = KEY_SOURCES.slice(0, 4).filter((s) => byKey.get(s.key)?.covered).length;

  const state: ReadinessState =
    keyCovered >= 3 && coveredCount >= 4
      ? "Well-Trained"
      : keyCovered >= 2
        ? "Answers Common Questions"
        : "Getting Started";

  const gap = KEY_SOURCES.find((s) => !byKey.get(s.key)?.covered);
  return {
    score,
    state,
    coveredCount,
    keyCoveredCount: keyCovered,
    depths,
    nextGap: gap
      ? { key: gap.key, label: byKey.get(gap.key)?.label ?? gap.key, capability: gap.capability }
      : null,
  };
}

/** Fired by the readiness suggestion; the matching source row opens its Add flow. */
export const OPEN_KNOWLEDGE_EVENT = "leadtrace:open-knowledge-source";

export function openKnowledgeSource(key: string) {
  document.getElementById(`knowledge-card-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(OPEN_KNOWLEDGE_EVENT, { detail: { key } }));
  }, 350);
}
