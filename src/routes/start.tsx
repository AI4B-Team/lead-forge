import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/start")({
  validateSearch: z.object({
    prompt: z.string().optional(),
    upload: z.boolean().optional(),
  }),
  component: StartRedirect,
});

function StartRedirect() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    (async () => {
      // Where the visitor should land once they have a session.
      const destination = search.upload
        ? "/app/new-job/upload?reattach=1"
        : `/app/assistant${search.prompt ? `?prompt=${encodeURIComponent(search.prompt)}` : ""}`;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.replace(destination);
        return;
      }
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
        search: { mode: returning ? "signin" : "signup", redirect: destination },
        replace: true,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, search.prompt, search.upload]);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
      Starting…
    </div>
  );
}
