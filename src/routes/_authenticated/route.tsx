import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .limit(1);
      if (!memberships || memberships.length === 0) {
        navigate({ to: "/onboarding" });
        return;
      }
      setChecked(true);
    })();
  }, [navigate]);

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading Your Workspace…</div>
      </div>
    );
  }
  return <Outlet />;
}