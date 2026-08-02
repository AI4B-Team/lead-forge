// Curated tire-kick questions for the AI Agent page. Buyer questions test what
// the agent knows about the business; coaching prompts are a separate intent and
// are surfaced in their own labeled area.

export type BuyerQuestion = {
  id: string;
  q: string;
  /** Words that suggest the fed knowledge covers this question. */
  keywords: string[];
  /** Knowledge Sources card that would fill the gap. */
  gapCard: string;
  gapLabel: string;
};

export const BUYER_QUESTIONS: BuyerQuestion[] = [
  { id: "financing", q: "What Financing Do We Offer?", keywords: ["financ", "payment plan", "monthly", "credit", "afford"], gapCard: "faqs", gapLabel: "FAQs" },
  { id: "compare", q: "How Do We Compare To Competitors?", keywords: ["competitor", "compare", "versus", "vs", "different", "why us"], gapCard: "scripts", gapLabel: "Sales Scripts" },
  { id: "warranty", q: "Summarize Our Warranty.", keywords: ["warrant", "guarantee"], gapCard: "documents", gapLabel: "Documents" },
  { id: "turnaround", q: "What's Our Turnaround Time?", keywords: ["turnaround", "timeline", "how long", "lead time", "schedule", "days"], gapCard: "faqs", gapLabel: "FAQs" },
  { id: "licensed", q: "Are We Licensed And Insured?", keywords: ["licens", "insur", "bonded", "certified"], gapCard: "faqs", gapLabel: "FAQs" },
  { id: "areas", q: "What Areas Do We Service?", keywords: ["service area", "areas we", "counties", "cities", "region", "radius"], gapCard: "website", gapLabel: "Website" },
  { id: "pricing", q: "What Does A Typical Job Cost?", keywords: ["price", "pricing", "cost", "$", "estimate", "quote"], gapCard: "catalog", gapLabel: "Product Catalog" },
  { id: "estimates", q: "Do We Offer Free Estimates?", keywords: ["free estimate", "estimate", "inspection", "quote"], gapCard: "faqs", gapLabel: "FAQs" },
  { id: "hours", q: "What Are Our Business Hours?", keywords: ["hours", "open", "monday", "weekend", "after hours"], gapCard: "website", gapLabel: "Website" },
  { id: "refund", q: "What's Our Cancellation Policy?", keywords: ["cancel", "refund", "policy", "deposit"], gapCard: "documents", gapLabel: "Documents" },
  { id: "experience", q: "How Long Have We Been In Business?", keywords: ["since", "years", "founded", "established", "family owned"], gapCard: "website", gapLabel: "Website" },
  { id: "products", q: "Which Products Or Brands Do We Install?", keywords: ["brand", "product", "model", "material", "install"], gapCard: "catalog", gapLabel: "Product Catalog" },
];

export const COACHING_PROMPTS: string[] = [
  "How Do I Handle A Price-Shopping Lead?",
  "What Do I Say If They Already Have Another Quote?",
  "How Should I Respond To A Not-Interested Reply?",
  "What Do I Say If They Want To Think About It?",
];

export type QuestionSource = { title: string; excerpt: string; category: string };

/** True when the fed knowledge plausibly covers the question. */
export function isLikelyAnswerable(q: BuyerQuestion, sources: QuestionSource[]): boolean {
  if (!sources.length) return false;
  const hay = sources.map((s) => `${s.title} ${s.excerpt}`.toLowerCase()).join("\n");
  return q.keywords.some((k) => hay.includes(k.toLowerCase()));
}

function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Pick a small rotating set, favouring questions the agent can actually answer. */
export function pickBuyerQuestions(
  sources: QuestionSource[],
  seed: number,
  count = 6,
): BuyerQuestion[] {
  const pool = shuffle(BUYER_QUESTIONS, seed);
  const covered = pool.filter((q) => isLikelyAnswerable(q, sources));
  const rest = pool.filter((q) => !covered.includes(q));
  return [...covered, ...rest].slice(0, count);
}