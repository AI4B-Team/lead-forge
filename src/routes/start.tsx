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
        navigate({ to: "/app/assistant", replace: true });
      } else {
        const returning = (() => {
          try {
            if (localStorage.getItem("leadtrace_returning")) return true;
            return Object.keys(localStorage).some((k) => k.startsWith("sb-"));
          } catch {
            return false;
          }
        })();
        navigate({
          to: "/auth",
          search: { mode: returning ? "signin" : "signup" },
          replace: true,
        });
      }
    })();
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
      Starting…
    </div>
  );
}
