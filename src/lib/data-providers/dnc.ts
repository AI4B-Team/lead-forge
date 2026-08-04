import { DncUnavailableError, type DncScrubber, type ScrubResult, type ScrubStatus } from "./index";

// DNC + litigator scrubber abstraction. Uses a RealPhoneValidation or
// Blacklist Alliance style HTTP API when DNC_API_URL + DNC_API_KEY are set.
//
// FAIL-CLOSED CONTRACT: if no provider is configured, or the provider errors,
// this module THROWS. It never invents a clean/dnc split. The deterministic
// mock exists only for local development and runs solely when
// LEADTRACE_USE_MOCK_DATA === 'true', and every row it returns is stamped
// sample_data so no surface can mistake it for a real scrub.

function mockScrub(phones: string[]): ScrubResult {
  const results = phones.map((phone, i) => {
    let status: ScrubStatus;
    const r = i % 20;
    if (r === 0) status = "litigator";
    else if (r < 4) status = "dnc";
    else status = "clean";
    return { phone, status };
  });
  return {
    provider: "mock-scrubber-v1",
    results,
    proof: {
      sample_data: true,
      note: "Development mock scrub (LEADTRACE_USE_MOCK_DATA). NOT a compliance record.",
    },
  };
}

function useMockScrub(): boolean {
  return process.env.LEADTRACE_USE_MOCK_DATA === "true";
}

async function httpScrub(url: string, apiKey: string, phones: string[]): Promise<ScrubResult> {
  // Generic contract: POST { phones: string[] } → { results: [{ phone, dnc, litigator }] }
  // Works with a thin proxy in front of BlacklistAlliance / RealPhoneValidation.
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ phones }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DNC scrub failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    results: Array<{ phone: string; dnc?: boolean; litigator?: boolean }>;
    proof?: Record<string, unknown>;
  };
  const results = body.results.map((r) => {
    let status: ScrubStatus = "clean";
    if (r.litigator) status = "litigator";
    else if (r.dnc) status = "dnc";
    return { phone: r.phone, status };
  });
  return {
    provider: new URL(url).hostname,
    results,
    proof: body.proof ?? { source: url, count: phones.length, scrubbed_at: new Date().toISOString() },
  };
}

export function getDncScrubber(): DncScrubber {
  return {
    key: "dnc.http",
    isConfigured() {
      return Boolean(process.env.DNC_API_URL && process.env.DNC_API_KEY);
    },
    async scrub(phones) {
      const url = process.env.DNC_API_URL;
      const apiKey = process.env.DNC_API_KEY;
      if (phones.length === 0) {
        return {
          provider: url ? new URL(url).hostname : "none",
          results: [],
          proof: { count: 0, scrubbed_at: new Date().toISOString() },
        };
      }
      if (!url || !apiKey) {
        if (useMockScrub()) return mockScrub(phones);
        throw new DncUnavailableError(
          "DNC and litigator scrubbing is not configured. Add DNC_API_URL and DNC_API_KEY before any list is scrubbed or sent.",
        );
      }
      try {
        return await httpScrub(url, apiKey, phones);
      } catch (err) {
        // Deliberately NO mock fallback: a scrub that did not happen must
        // never look like a scrub that came back clean.
        console.error("[dnc] scrub failed — failing closed:", err);
        throw new DncUnavailableError(
          `DNC and litigator scrubbing could not be completed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };
}