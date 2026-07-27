// ---------------------------------------------------------------------------
// Data provider abstraction. Real providers plug in behind the same shape so
// the pipeline orchestrator stays clean. Every provider gracefully falls back
// to the deterministic mock when its credentials aren't configured.
// ---------------------------------------------------------------------------

export type RawLead = {
  full_name?: string | null;
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  source_meta?: Record<string, unknown>;
};

export type BusinessScrapeParams = {
  niches: string[];
  counties: string[];
  state: string;
};

export interface BusinessScraper {
  key: string;
  isConfigured(): boolean;
  scrape(params: BusinessScrapeParams): Promise<RawLead[]>;
}

export type ScrubStatus = "clean" | "dnc" | "litigator";

export type ScrubResult = {
  provider: string;
  results: Array<{ phone: string; status: ScrubStatus }>;
  proof: Record<string, unknown>;
};

export interface DncScrubber {
  key: string;
  isConfigured(): boolean;
  scrub(phones: string[]): Promise<ScrubResult>;
}

export { getBusinessScraper } from "./apify";
export { getDncScrubber } from "./dnc";