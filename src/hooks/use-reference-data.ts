import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_REFERENCE_DATA, type ReferenceData,
} from "@/lib/reference-data.shared";

/**
 * Database-backed reference data for the builder and settings screens.
 * Cached for the session — these rows change on the order of weeks.
 */
export function useReferenceData() {
  const { data } = useQuery<ReferenceData>({
    queryKey: ["reference-data"],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const [industries, recordTypes, coverage] = await Promise.all([
        supabase.from("industries").select("id, name, slug, parent_id, sort_order")
          .eq("active", true).order("sort_order"),
        supabase.from("record_types").select("id, name, slug, description, category, sort_order")
          .eq("active", true).order("sort_order"),
        supabase.from("county_coverage").select("county_name, state, source_type, status, fips, notes"),
      ]);
      const all = industries.data ?? [];
      return {
        industries: all.filter((i) => !i.parent_id),
        niches: all.filter((i) => Boolean(i.parent_id)),
        recordTypes: recordTypes.data ?? [],
        countyCoverage: coverage.data ?? [],
      };
    },
  });
  return data ?? EMPTY_REFERENCE_DATA;
}
