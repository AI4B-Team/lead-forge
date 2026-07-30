// Helpers for brand training sources. Kept out of the *.functions.ts wrapper so
// server-fn splitting cannot strip them.

const MAX_CHARS = 20000;

/** Collapse whitespace and hard-cap extracted text. */
export function normalizeContent(raw: string): string {
  return raw.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
}

/** Strip HTML to readable text without any DOM. */
export function htmlToText(html: string): string {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return normalizeContent(
    body
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  );
}

export function titleFromHtml(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const t = m?.[1]?.trim();
  return (t && t.slice(0, 120)) || fallback;
}

/** Fetch a public page and return readable text. Never throws a raw network error. */
export async function fetchUrlText(url: string): Promise<{ title: string; content: string }> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": "LeadTraceBot/1.0 (+brand training)" } });
  } catch {
    throw new Error("Could Not Reach That URL");
  }
  if (!res.ok) throw new Error(`URL Returned ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  if (type.includes("html")) {
    const content = htmlToText(raw);
    if (!content) throw new Error("No Readable Text Found On That Page");
    return { title: titleFromHtml(raw, new URL(url).hostname), content };
  }
  const content = normalizeContent(raw);
  if (!content) throw new Error("No Readable Text Found At That URL");
  return { title: new URL(url).hostname, content };
}

/** Compact the knowledge rows into a prompt-safe brand brief. */
export function buildKnowledgeBrief(
  rows: Array<{ title: string; content: string; source_type: string; source_url?: string | null }>,
  budget = 8000,
): string {
  let used = 0;
  const parts: string[] = [];
  for (const r of rows) {
    const head = `# ${r.title}${r.source_url ? ` (${r.source_url})` : ""} [${r.source_type}]`;
    const remaining = budget - used;
    if (remaining <= 200) break;
    const body = r.content.slice(0, remaining - head.length - 2);
    parts.push(`${head}\n${body}`);
    used += head.length + body.length + 2;
  }
  return parts.join("\n\n");
}
