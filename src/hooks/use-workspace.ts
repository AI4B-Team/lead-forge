import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWorkspaceId() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      setWorkspaceId(data?.workspace_id ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { workspaceId, loading };
}