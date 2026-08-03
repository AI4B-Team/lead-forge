import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  EMPTY_REFERENCE_DATA, type ReferenceData,
} from "./reference-data.shared";

type Client = SupabaseClient<Database>;

let cache: { data: ReferenceData; at: number } | null = null;
/** Reference data changes rarely — 5 minutes is plenty fresh for a worker. */
const TTL_MS = 5 * 60 * 1000;

/** Loads industries, niches, record types and county coverage (cached). */
export async function loadReferenceData(supabase: Client): Promise<ReferenceData> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const [industries, recordTypes, coverage] = await Promise.all([
    supabase.from("industries").select("id, name, slug, parent_id, sort_order")
      .eq("active", true).order("sort_order"),
    supabase.from("record_types").select("id, name, slug, description, category, sort_order")
      .eq("active", true).order("sort_order"),
    supabase.from("county_coverage").select("county_name, state, source_type, status, fips, notes"),
  ]);
  if (industries.error || recordTypes.error || coverage.error) {
    return cache?.data ?? EMPTY_REFERENCE_DATA;
  }
  const all = industries.data ?? [];
  const data: ReferenceData = {
    industries: all.filter((i) => !i.parent_id),
    niches: all.filter((i) => Boolean(i.parent_id)),
    recordTypes: recordTypes.data ?? [],
    countyCoverage: coverage.data ?? [],
  };
  cache = { data, at: Date.now() };
  return data;
}
