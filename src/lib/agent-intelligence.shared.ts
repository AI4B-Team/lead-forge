// ---------------------------------------------------------------------------
// Agent Intelligence — the single framing for "how smart is my agent".
// Coverage across knowledge categories plus depth of material, expressed as a
// 0-100 score with an emotional tier instead of a flat percentage.
//
// Also holds the auto-categorizer: users paste whatever they have and we decide
// where it belongs, so nobody has to think in FAQs / Scripts / Threads.
// ---------------------------------------------------------------------------

import { KNOWLEDGE_CARDS, type KnowledgeItem } from "./knowledge-cards.shared";

export type IntelligenceTier = {
  key: "needs_training" | "learning" | "almost" | "ready";
  label: string;
  /** Text/graph token class for the tier. */
  tone: string;
  /** Fill class for the progress bar. */
  fill: string;
  /** Soft background for the tier chip. */
  chip: string;
  blurb: string;
};

export function intelligenceTier(score: number): IntelligenceTier {
  if (score >= 91) {
    return {
      key: "ready",
      label: "Ready",
      tone: "text-success",
      fill: "bg-success",
      chip: "bg-success/10 text-success border-success/25",
      blurb: "Your Agent Can Hold Its Own On Almost Any Question.",
    };
  }
  if (score >= 61) {
    return {
      key: "almost",
      label: "Almost Ready",
      tone: "text-highlight-foreground",
      fill: "bg-highlight",
      chip: "bg-highlight/20 text-foreground border-highlight/40",
      blurb: "Close — A Couple More Sources And It's Fully Sharp.",
    };
  }
  if (score >= 26) {
    return {
      key: "learning",
      label: "Learning",
      tone: "text-warn",
      fill: "bg-warn",
      chip: "bg-warn/10 text-warn border-warn/25",
      blurb: "It's Picking Things Up — Keep Feeding It.",
    };
  }
  return {
    key: "needs_training",
    label: "Needs Training",
    tone: "text-danger",
    fill: "bg-danger",
    chip: "bg-danger/10 text-danger border-danger/25",
    blurb: "The More Knowledge You Add, The Smarter Your Agent Becomes.",
  };
}

export type CategoryProgress = {
  key: string;
  label: string;
  /** "Crawl Public Pages" style sub-label. */
  action: string;
  unit: string;
  count: number;
  chars: number;
  /** 0-100 depth of this single category — drives its own progress bar. */
  progress: number;
};

/** Per-category depth target in characters — enough to answer confidently. */
const DEPTH_TARGET = 6000;

export type AgentIntelligence = {
  score: number;
  tier: IntelligenceTier;
  categories: CategoryProgress[];
  /** Categories with at least one source. */
  complete: number;
  total: number;
  chars: number;
};

export function agentIntelligence(sources: KnowledgeItem[]): AgentIntelligence {
  const categories: CategoryProgress[] = KNOWLEDGE_CARDS.map((c) => {
    const items = sources.filter((s) => s.category === c.key);
    const chars = items.reduce((a, s) => a + s.chars, 0);
    return {
      key: c.key,
      label: c.title,
      action: c.action,
      unit: c.unit,
      count: items.length,
      chars,
      progress: items.length === 0 ? 0 : Math.max(8, Math.min(100, Math.round((chars / DEPTH_TARGET) * 100))),
    };
  });

  const complete = categories.filter((c) => c.count > 0).length;
  const chars = sources.reduce((a, s) => a + s.chars, 0);
  // Breadth matters more than volume: one 50k-word doc doesn't make an agent smart.
  const coverage = (complete / categories.length) * 60;
  const depth = Math.min(40, (chars / 30000) * 40);
  const score = sources.length === 0 ? 0 : Math.max(6, Math.min(100, Math.round(coverage + depth)));

  return { score, tier: intelligenceTier(score), categories, complete, total: categories.length, chars };
}

// ---------------------------------------------------------------------------
// Auto-categorization
// ---------------------------------------------------------------------------

export type Categorized = {
  category: string;
  /** Human label for the destination, shown before training. */
  label: string;
  title: string;
  sourceType: "text" | "voice" | "file";
};

// Full URLs, or bare domains on a common TLD so "summitroofing.com" still counts.
const URL_RE =
  /https?:\/\/[^\s]+|(?:^|\s)(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|us|biz|info|dev|app|ai|shop|store|services|agency|team|pro|site|online)(?:\/[^\s]*)?/gi;

/** Bare URLs in pasted text — these get crawled instead of stored verbatim. */
export function extractUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  return Array.from(
    new Set(
      found
        .map((u) => u.trim().replace(/[),.;]+$/, ""))
        .filter(Boolean)
        .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)),
    ),
  );
}

/** True when the paste is nothing but links — a website crawl in disguise. */
export function isUrlOnly(text: string): boolean {
  const stripped = text.replace(URL_RE, "").replace(/[\s,]+/g, "");
  return extractUrls(text).length > 0 && stripped.length < 12;
}

function labelFor(category: string): string {
  return KNOWLEDGE_CARDS.find((c) => c.key === category)?.title ?? "Notes";
}

/**
 * Decide where a paste belongs. Users think "here's what my business does" —
 * we do the filing. Deliberately heuristic and cheap: it runs as you type.
 */
export function classifyKnowledge(text: string): Categorized {
  const t = text.trim();
  const lower = t.toLowerCase();

  const pick = (category: string, title: string, sourceType: Categorized["sourceType"] = "text"): Categorized => ({
    category,
    label: labelFor(category),
    title,
    sourceType,
  });

  if (isUrlOnly(t)) return pick("website", "Website Pages");

  // Q/A pairs — the clearest signal of an approved answer set.
  if (/(^|\n)\s*(q|question)\s*[:.\-]/i.test(t) && /(^|\n)\s*(a|answer)\s*[:.\-]/i.test(t)) {
    return pick("faqs", "Approved FAQs");
  }
  if ((t.match(/\?/g) ?? []).length >= 3 && t.length < 4000) return pick("faqs", "Approved FAQs");

  // Email threads.
  if (/(^|\n)\s*(subject|from|to|sent)\s*:/i.test(t) || /-{2,}\s*forwarded message/i.test(lower)) {
    return pick("emails", "Email Thread");
  }

  // Call / meeting transcripts — speaker-labelled dialogue.
  const speakerLines = (t.match(/(^|\n)\s*[A-Z][A-Za-z .]{1,24}:\s/g) ?? []).length;
  if (speakerLines >= 4 || /\b(rep|agent|caller|customer|client)\s*:/i.test(t)) {
    return pick("calls", "Call Transcript", "voice");
  }

  // Timestamped captions → video transcript.
  if (/\d{1,2}:\d{2}(:\d{2})?\s*(-->|–|-)\s*\d{1,2}:\d{2}/.test(t) || /^WEBVTT/i.test(t)) {
    return pick("videos", "Video Transcript");
  }

  // Pricing / package tables → catalog.
  const priceHits = (t.match(/\$\s?\d/g) ?? []).length;
  if (priceHits >= 3 && /(package|tier|plan|price|pricing|includes|warranty|sku)/i.test(lower)) {
    return pick("catalog", "Product Catalog", "file");
  }

  // Sales language.
  if (/(objection|rebuttal|opener|close the|book the appointment|qualifying question|script)/i.test(lower)) {
    return pick("scripts", "Sales Script");
  }

  // Long-form prose reads as a document; short prose is a note about the business.
  if (t.length >= 1200) return pick("documents", "Business Document", "file");
  return pick("scripts", "Business Notes");
}

/** Blank-page cures shown under the training box. */
export const TRAINING_EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Explain Your Services",
    text: "We install and repair asphalt shingle, metal, and flat roofs for homeowners in ",
  },
  {
    label: "Paste Your FAQs",
    text: "Q: Do you offer financing?\nA: Yes — 0% for 12 months on approved credit.\n\nQ: How long does a roof replacement take?\nA: ",
  },
  {
    label: "Describe Your Ideal Customer",
    text: "Our best customers are homeowners who ",
  },
  {
    label: "Paste Your Sales Script",
    text: "Opener: Thanks for reaching out! Quick question so I can help — ",
  },
  {
    label: "What You Never Promise",
    text: "Never promise: a firm price before inspection, insurance approval, or a same-day install date.",
  },
];
