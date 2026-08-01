// Event vocabulary + webhook dispatch (spec §15.2). Every app in the family
// writes the same event types so the Real Elite hub can subscribe later without
// a rewrite. Events are persisted first, then best-effort delivered to any
// registered endpoint with an HMAC signature.

import type { SupabaseClient } from "@supabase/supabase-js";

export { EVENT_TYPES } from "./events.shared";
import type { EventType } from "./events.shared";
export type { EventType };

type AnyClient = SupabaseClient<any, any, any>;

async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Persist an event and fan it out to the workspace's webhook endpoints.
 * Never throws — event emission must not fail the action that produced it.
 */
export async function emitEvent(
  supabase: AnyClient,
  workspaceId: string,
  type: EventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: row } = await supabase
      .from("events")
      .insert({ workspace_id: workspaceId, type, payload: payload as never })
      .select("id, created_at")
      .maybeSingle();

    const { data: endpoints } = await supabase
      .from("webhook_endpoints")
      .select("id, url, secret, event_types, active")
      .eq("workspace_id", workspaceId)
      .eq("active", true);

    const targets = (endpoints ?? []).filter(
      (e) => !e.event_types?.length || e.event_types.includes(type),
    );
    if (!targets.length || !row) return;

    const body = JSON.stringify({
      id: row.id,
      type,
      workspace_id: workspaceId,
      created_at: row.created_at,
      payload,
    });

    let error: string | null = null;
    await Promise.all(
      targets.map(async (e) => {
        try {
          const res = await fetch(e.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-leadtrace-event": type,
              "x-leadtrace-signature": await sign(e.secret, body),
            },
            body,
          });
          if (!res.ok) error = `${e.url} responded ${res.status}`;
        } catch (err) {
          error = err instanceof Error ? err.message : "Delivery failed";
        }
      }),
    );

    await supabase
      .from("events")
      .update({ delivered_at: new Date().toISOString(), delivery_error: error })
      .eq("id", row.id);
  } catch {
    /* events are observability, never a blocker */
  }
}
