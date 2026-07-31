import { getDncScrubber } from "@/lib/data-providers";

export type LineType = "mobile" | "landline" | "voip" | "unknown";

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D+/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Deterministic stand-in so the tool works before a carrier key is configured. */
function mockLineType(phone: string): LineType {
  const n = Number(phone.replace(/\D/g, "").slice(-4)) % 10;
  if (n <= 5) return "mobile";
  if (n <= 8) return "landline";
  return "voip";
}

export async function lookupLineType(
  phone: string,
): Promise<{ lineType: LineType; carrier: string | null; provider: string }> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) return { lineType: mockLineType(phone), carrier: null, provider: "estimate" };
  try {
    const res = await fetch(
      `https://api.telnyx.com/v2/number_lookup/${encodeURIComponent(phone)}?type=carrier`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as {
      data?: { carrier?: { type?: string; name?: string } };
    };
    const raw = (body.data?.carrier?.type ?? "").toLowerCase();
    const lineType: LineType =
      raw.includes("mobile") || raw.includes("wireless")
        ? "mobile"
        : raw.includes("voip")
          ? "voip"
          : raw.includes("landline") || raw.includes("fixed")
            ? "landline"
            : "unknown";
    return { lineType, carrier: body.data?.carrier?.name ?? null, provider: "telnyx" };
  } catch {
    return { lineType: mockLineType(phone), carrier: null, provider: "estimate" };
  }
}

export async function lookupDnc(
  phone: string,
): Promise<{ status: "clean" | "dnc" | "litigator"; provider: string; checkedAt: string }> {
  const scrubber = getDncScrubber();
  const out = await scrubber.scrub([phone]);
  return {
    status: out.results[0]?.status ?? "clean",
    provider: out.provider,
    checkedAt: new Date().toISOString(),
  };
}
