// Carrying the homepage prompt through auth: the URL is the source of truth,
// sessionStorage is only a short-lived fallback so a stale prompt can never
// auto-fire hours later.
const KEY = "leadtrace_prompt";
const TTL_MS = 10 * 60 * 1000;

export type Handoff = { text: string; templateId: string | null };

/** The typed text and the selected template travel together through auth. */
export function stashPrompt(text: string, templateId?: string | null) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ text, templateId: templateId ?? null, ts: Date.now() }),
    );
  } catch { /* ignore */ }
}

export function clearStashedPrompt() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Returns a stashed handoff only when it is fresher than the TTL; always clears. */
export function takeStashedHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    // Older builds stashed a bare string — treat it as expired.
    if (!raw.startsWith("{")) return null;
    const parsed = JSON.parse(raw) as { text?: string; templateId?: string | null; ts?: number };
    if (!parsed.ts) return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    if (!parsed.text && !parsed.templateId) return null;
    return { text: parsed.text ?? "", templateId: parsed.templateId ?? null };
  } catch {
    return null;
  }
}

/** Back-compat helper for callers that only care about the typed text. */
export function takeStashedPrompt(): string | null {
  return takeStashedHandoff()?.text || null;
}

/** Only same-origin app paths may be used as a post-auth destination. */
export function safeRedirect(value: string | undefined | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
