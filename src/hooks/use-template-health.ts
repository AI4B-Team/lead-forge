import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FillRates, HealthStatus } from "@/lib/template-health.shared";

export type TemplateHealth = {
  template_id: string;
  status: HealthStatus;
  last_check_at: string | null;
  last_healthy_at: string | null;
  row_count: number;
  field_fill_rates: FillRates;
  eta: string | null;
  notes: string | null;
};

/**
 * Source health for every template. Read-only and readable by anyone signed in
 * — it drives the health dot on template cards and disables broken sources in
 * the picker before a customer can spend credits on an empty list.
 */
export function useTemplateHealth() {
  const query = useQuery({
    queryKey: ["template-health"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, TemplateHealth>> => {
      const { data, error } = await supabase
        .from("template_health")
        .select("template_id, status, last_check_at, last_healthy_at, row_count, field_fill_rates, eta, notes");
      if (error) throw new Error(error.message);
      const map: Record<string, TemplateHealth> = {};
      for (const row of (data ?? []) as unknown as TemplateHealth[]) map[row.template_id] = row;
      return map;
    },
  });
  return { health: query.data ?? {}, isLoading: query.isLoading };
}
