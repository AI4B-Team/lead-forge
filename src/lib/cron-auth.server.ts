// Server-only authentication for /api/public/hooks/tick-* cron endpoints.
//
// These endpoints move real money (SMS spend, scrape + skip-trace credits) and
// send email to government agencies, so they must NEVER be gated by the
// Supabase publishable/anon key — that key ships inside the browser bundle.
//
// Two accepted credentials, both server-side only:
//   1. CRON_SECRET env var (set by an operator, for external schedulers)
//   2. public.cron_credentials.secret (random, generated in the database and
//      read by pg_cron when it builds the x-cron-secret header)
// Comparison is constant-time.

import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function presentedSecret(request: Request): string {
  return (
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ??
    ""
  ).trim();
}

async function dbSecret(): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cron_credentials")
      .select("secret")
      .eq("key", "default")
      .maybeSingle();
    return (data as { secret: string } | null)?.secret ?? null;
  } catch {
    return null;
  }
}

/** Returns null when the caller is authorised, otherwise a 401 Response. */
export async function requireCronAuth(request: Request): Promise<Response | null> {
  const presented = presentedSecret(request);
  if (!presented) return unauthorized();

  const candidates = [process.env["CRON_SECRET"] ?? "", (await dbSecret()) ?? ""].filter(Boolean);
  if (candidates.length === 0) {
    // Fail closed: no server-side secret configured means nobody gets in.
    console.error("[cron] no CRON_SECRET or cron_credentials row configured");
    return unauthorized();
  }
  const ok = candidates.some((c) => safeEqual(presented, c));
  return ok ? null : unauthorized();
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Overlap guard. Claims a tick only when the last successful claim for this key
 * is older than `minSeconds`; concurrent or replayed invocations get `false`
 * even when they present a valid secret.
 */
export async function claimTick(key: string, minSeconds = 30): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("claim_cron_tick", {
    _key: key,
    _min_interval: `${minSeconds} seconds`,
  });
  if (error) {
    console.error("[cron] claim_cron_tick failed:", error.message);
    return false;
  }
  return data === true;
}
