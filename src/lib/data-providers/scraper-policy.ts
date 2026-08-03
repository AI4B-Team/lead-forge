// ---------------------------------------------------------------------------
// Shared crawl etiquette for every county source we touch.
//
// Hard rule: we never solve a CAPTCHA programmatically. No solving services,
// no image recognition, no bypass attempts. Portals that gate behind a CAPTCHA
// are authenticated ONCE by a human team member (see portal_sessions) and the
// captured session is reused until it expires, at which point the portal is
// flagged for manual re-auth.
// ---------------------------------------------------------------------------

export const BOT_CONTACT_URL = "https://leadtrace.app/compliance";
export const BOT_USER_AGENT = `LeadTraceBot/1.0 (+${BOT_CONTACT_URL})`;

/** One request every 2–3 seconds per host, jittered. */
const MIN_DELAY_MS = 2_000;
const MAX_DELAY_MS = 3_000;
const lastHit = new Map<string, number>();

export function politeDelayMs(): number {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(host: string) {
  const now = Date.now();
  const wait = (lastHit.get(host) ?? 0) + politeDelayMs() - now;
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

/** robots.txt check, cached per host. Fails open only on network error. */
const robotsCache = new Map<string, string[]>();

async function disallowedPaths(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let rules: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": BOT_USER_AGENT } });
    if (res.ok) {
      const text = await res.text();
      let applies = false;
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.split("#")[0]!.trim();
        const [k, ...rest] = line.split(":");
        const key = (k ?? "").trim().toLowerCase();
        const val = rest.join(":").trim();
        if (key === "user-agent") applies = val === "*" || val.toLowerCase().includes("leadtrace");
        else if (key === "disallow" && applies && val) rules.push(val);
      }
    }
  } catch {
    rules = [];
  }
  robotsCache.set(origin, rules);
  return rules;
}

export async function robotsAllows(url: string): Promise<boolean> {
  const u = new URL(url);
  const rules = await disallowedPaths(u.origin);
  return !rules.some((p) => u.pathname.startsWith(p));
}

/**
 * Rate-limited, honestly identified fetch with exponential backoff on
 * 429/503. Throws on anything else non-OK so callers can mark the source
 * failed instead of silently returning nothing.
 */
export async function politeFetch(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const host = new URL(url).host;
  if (attempt === 0 && !(await robotsAllows(url))) {
    throw new Error(`robots.txt Disallows ${url}`);
  }
  await throttle(host);
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", "User-Agent": BOT_USER_AGENT, ...(init.headers ?? {}) },
  });
  if ((res.status === 429 || res.status === 503) && attempt < 4) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2_000 * Math.pow(2, attempt);
    await sleep(backoff);
    return politeFetch(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`Source Returned HTTP ${res.status}`);
  return res;
}

export async function politeJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await politeFetch(url, init);
  return (await res.json()) as T;
}
