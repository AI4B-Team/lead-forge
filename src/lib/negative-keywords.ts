/**
 * Negative keyword filtering for inbound replies.
 *
 * These are not opt-out keywords (STOP/UNSUBSCRIBE handled in lib/sms) — they
 * are the words that mean "keep texting this person and you will hear from a
 * lawyer". A hit suppresses the contact and halts their sequence immediately,
 * before any bot reply can be generated.
 */

export const DEFAULT_NEGATIVE_KEYWORDS = [
  "stop",
  "unsubscribe",
  "remove",
  "lawyer",
  "attorney",
  "tcpa",
  "sue",
];

export type NegativeKeywordHit = { matched: string } | null;

/**
 * Whole-word match, case-insensitive. Word-bounded on purpose: "sue" must not
 * fire on "Sue" inside "issued", and "remove" must not fire on "removed my
 * old number" — bounded matching keeps the false-positive rate sane while
 * still catching the phrases that matter.
 */
export function matchNegativeKeyword(body: string, keywords?: string[] | null): NegativeKeywordHit {
  const list = (keywords?.length ? keywords : DEFAULT_NEGATIVE_KEYWORDS)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const text = (body ?? "").toLowerCase();
  for (const keyword of list) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) return { matched: keyword };
  }
  return null;
}
