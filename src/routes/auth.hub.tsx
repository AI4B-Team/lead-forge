import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { connectHub } from "@/lib/hub.functions";

// Real Elite hub handoff landing (spec §16). Keeps the documented /auth/hub URL
// while the verification + session mint happen on the public endpoint.
export const Route = createFileRoute("/auth/hub")({
  head: () => ({
    meta: [
      { title: "Connecting Your Real Elite Account | LeadTrace" },
      { name: "description", content: "Signing you in to LeadTrace from your Real Elite hub." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Connecting Your Real Elite Account" },
      { property: "og:description", content: "Signing you in to LeadTrace from your Real Elite hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HubHandoff,
});

function HubHandoff() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      window.location.replace("/auth?hub_error=Missing%20hub%20token");
      return;
    }

    // Family standard §2: an already signed-in user returning with a valid token
    // links their EXISTING workspace in place. Everyone else goes through the
    // SSO callback, which resolves by canonical ID before creating anything.
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        window.location.replace(`/api/public/hub/callback?token=${encodeURIComponent(token)}`);
        return;
      }
      const { data: member } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!member?.workspace_id) {
        window.location.replace(`/api/public/hub/callback?token=${encodeURIComponent(token)}`);
        return;
      }
      try {
        await connectHub({ data: { workspaceId: member.workspace_id, token } });
        window.location.replace("/app/dashboard");
      } catch (err) {
        window.location.replace(
          `/auth?hub_error=${encodeURIComponent(err instanceof Error ? err.message : "Could not link your account")}`,
        );
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <h1 className="text-base font-medium text-foreground">Connecting Your Real Elite Account</h1>
        <p className="text-sm">Hold on while we sign you in.</p>
      </div>
    </main>
  );
}
