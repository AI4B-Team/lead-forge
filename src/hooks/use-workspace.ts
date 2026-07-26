import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWorkspaceId() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name)")
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      setWorkspaceId(data?.workspace_id ?? null);
      const ws = (data as { workspaces?: { name?: string } | null } | null)?.workspaces;
      setWorkspaceName(ws?.name ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { workspaceId, workspaceName, loading };
}