import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanContext } from "@/lib/free-tier.functions";
import { useWorkspaceId } from "@/hooks/use-workspace";
import type { PlanContext } from "@/lib/free-tier.shared";

const FALLBACK: PlanContext = { plan: "free", cardOnFile: false, freeRecordsUsed: 0 };

/** Plan boundary for the current workspace. Falls back to Free while loading. */
export function usePlanContext(): { plan: PlanContext; loading: boolean } {
  const { workspaceId } = useWorkspaceId();
  const fetchPlan = useServerFn(getPlanContext);
  const { data, isLoading } = useQuery({
    queryKey: ["plan-context", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => fetchPlan({ data: { workspaceId: workspaceId! } }),
  });
  return { plan: data ?? FALLBACK, loading: isLoading };
}
