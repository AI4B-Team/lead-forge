import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/start")({
  component: StartRedirect,
});

function StartRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/app/new-job/business", replace: true });
      } else {
        navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
      }
    })();
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
      Starting…
    </div>
  );
}
