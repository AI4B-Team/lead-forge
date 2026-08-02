import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBrands } from "@/lib/brands.functions";

/**
 * One workspace = one AI agent. Legacy workspaces may hold several rows in the
 * underlying table; we surface the most recent one and ignore the rest.
 */
export function useWorkspaceAgent(workspaceId: string | null) {
  const fetchAgents = useServerFn(listBrands);
  const query = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => fetchAgents({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const rows = query.data?.brands ?? [];
  const agent =
    [...rows].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0] ?? null;
  return {
    agent,
    sourceCount: agent ? (query.data?.sources?.[agent.id] ?? 0) : 0,
    loading: query.isLoading,
  };
}
