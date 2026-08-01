import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyHubToken } from "@/lib/hub.server";

// Real Elite SSO handoff (spec §16). The hub mints a 60s HS256 token and sends
// the user here; we verify it, upsert the local user + workspace, stamp the
// canonical IDs, then hand off to a normal local Supabase session.
export const Route = createFileRoute("/api/public/hub/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const fail = (msg: string) =>
          Response.redirect(`${url.origin}/auth?hub_error=${encodeURIComponent(msg)}`, 302);
        if (!token) return fail("Missing hub token");

        let claims;
        try {
          claims = await verifyHubToken(token);
        } catch (err) {
          return fail(err instanceof Error ? err.message : "Invalid hub token");
        }

        const admin = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        // 1. Resolve the local user in the family-standard order:
        //    real_elite_user_id → email → create.
        const { data: knownPref } = await admin
          .from("user_prefs")
          .select("user_id")
          .eq("real_elite_user_id", claims.reo_user_id)
          .maybeSingle();

        let userId = knownPref?.user_id ?? null;
        if (!userId) {
          const created = await admin.auth.admin.createUser({
            email: claims.email,
            email_confirm: true,
            user_metadata: { full_name: claims.name ?? null, real_elite_user_id: claims.reo_user_id },
          });
          userId = created.data.user?.id ?? null;
        }
        if (!userId) {
          const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
          userId = list?.users.find((u) => u.email?.toLowerCase() === claims.email.toLowerCase())?.id ?? null;
        }
        if (!userId) return fail("Could not resolve your account");

        // 2. Workspace: attach to the linked one, else adopt/ create and stamp IDs.
        const { data: linked } = await admin
          .from("workspaces").select("id").eq("real_elite_org_id", claims.reo_org_id).maybeSingle();

        let workspaceId = linked?.id ?? null;
        if (!workspaceId) {
          const { data: membership } = await admin
            .from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
          workspaceId = membership?.workspace_id ?? null;

          if (!workspaceId) {
            const { data: ws } = await admin
              .from("workspaces")
              .insert({ name: claims.org_name ?? "My Workspace" })
              .select("id").maybeSingle();
            workspaceId = ws?.id ?? null;
          }
          if (workspaceId) {
            await admin.from("workspaces").update({
              real_elite_org_id: claims.reo_org_id,
              real_elite_linked_at: new Date().toISOString(),
            }).eq("id", workspaceId);
          }
        }
        if (workspaceId) {
          await admin.from("workspace_members").upsert(
            { workspace_id: workspaceId, user_id: userId, role: claims.role === "member" ? "member" : "owner" },
            { onConflict: "workspace_id,user_id" },
          );
        }
        await admin.from("user_prefs").upsert(
          { user_id: userId, real_elite_user_id: claims.reo_user_id },
          { onConflict: "user_id" },
        );

        // 3. Start a normal local session via a one-time link.
        const { data: link, error } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: claims.email,
          options: { redirectTo: `${url.origin}/app/dashboard` },
        });
        if (error || !link?.properties?.action_link) return fail("Could not start your session");

        return Response.redirect(link.properties.action_link, 302);
      },
    },
  },
});
