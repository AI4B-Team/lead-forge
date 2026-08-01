// Family standard §4: every UI action must also be callable as an authenticated
// HTTP endpoint so the Real Elite hub consumes this app instead of rebuilding it.
// Callers send a Supabase user access token: `Authorization: Bearer <token>`.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ApiCaller = { userId: string; workspaceIds: string[] };

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function adminClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Verifies the bearer token and returns the caller plus their workspace scope. */
export async function authenticateApiRequest(request: Request): Promise<ApiCaller | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: rows } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", data.user.id);

  return { userId: data.user.id, workspaceIds: (rows ?? []).map((r) => r.workspace_id) };
}

/** Resolves the workspace the caller asked for, defaulting to their first one. */
export function resolveWorkspace(caller: ApiCaller, requested?: string | null): string | null {
  if (requested) return caller.workspaceIds.includes(requested) ? requested : null;
  return caller.workspaceIds[0] ?? null;
}

export { adminClient as apiAdminClient };