import { getDncScrubber } from "@/lib/data-providers";

export type LineType = "mobile" | "landline" | "voip" | "unknown";

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D+/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export async function lookupLineType(
  phone: string,
): Promise<{ lineType: LineType; carrier: string | null; provider: string }> {
  const key = process.env.TELNYX_API_KEY;
  // No carrier lookup available means no verdict. We never guess a line type.
  if (!key) return { lineType: "unknown", carrier: null, provider: "unavailable" };
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
    return { lineType: "unknown", carrier: null, provider: "unavailable" };
  }
}

export async function lookupDnc(
  phone: string,
): Promise<{ status: "clean" | "dnc" | "litigator" | "unknown"; provider: string; checkedAt: string }> {
  const scrubber = getDncScrubber();
  const out = await scrubber.scrub([phone]);
  return {
    // Fail closed: no verdict is reported as unknown, never as clean.
    status: out.results[0]?.status ?? "unknown",
    provider: out.provider,
    checkedAt: new Date().toISOString(),
  };
}
