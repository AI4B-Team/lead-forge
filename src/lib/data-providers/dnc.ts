import type { DncScrubber, ScrubResult, ScrubStatus } from "./index";

// DNC + litigator scrubber abstraction. Uses RealPhoneValidation or Blacklist
// Alliance style HTTP API when DNC_API_URL + DNC_API_KEY are configured;
// otherwise falls back to a deterministic mock split so the pipeline still
// runs end-to-end.

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
    proof: { note: "Mock scrub. Configure DNC_API_URL + DNC_API_KEY for real scrubbing." },
  };
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
      if (!url || !apiKey || phones.length === 0) return mockScrub(phones);
      try {
        return await httpScrub(url, apiKey, phones);
      } catch (err) {
        console.error("[dnc] scrub failed, falling back to mock:", err);
        return mockScrub(phones);
      }
    },
  };
}