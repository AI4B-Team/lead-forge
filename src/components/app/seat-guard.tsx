/**
 * Seat revocation enforcement. Removing a member already cuts off their data
 * server-side (membership row is gone, RLS follows), but an open tab could keep
 * firing requests — so we poll for a revocation and hard sign-out.
 */
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkSeatRevoked } from "@/lib/accountability.functions";

export function SeatGuard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["seat-revoked"],
    queryFn: () => checkSeatRevoked(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data?.revokedAt) return;
    void (async () => {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.error("Your Access To This Workspace Was Removed.");
      navigate({ to: "/auth", replace: true });
    })();
  }, [data?.revokedAt, navigate, qc]);

  return null;
}
