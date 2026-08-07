// Telnyx concrete implementation of the SmsProvider interface.
// Docs: https://developers.telnyx.com/docs/messaging
//
// Env (server-only):
//   TELNYX_API_KEY                — Bearer token for the Messaging API
//   TELNYX_MESSAGING_PROFILE_ID   — Profile the numbers + sends attach to
//   TELNYX_PUBLIC_KEY             — base64 Ed25519 public key for webhook verify
//
// Webhook signature: Telnyx signs each webhook with `${timestamp}|${rawBody}`
// using Ed25519. Verify with the Telnyx-Signature-Ed25519 + Telnyx-Timestamp
// headers against TELNYX_PUBLIC_KEY.

import type {
  SmsProvider,
  SmsSendResult,
  InboundMessage,
  Dlr,
  BoughtNumber,
  AvailableNumber,
  BrandSubmission,
  CampaignSubmission,
} from "./provider";

const TELNYX_API = "https://api.telnyx.com/v2";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function tx(path: string, init: RequestInit = {}): Promise<unknown> {
  const key = requireEnv("TELNYX_API_KEY");
  const res = await fetch(`${TELNYX_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telnyx ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

export const telnyxProvider: SmsProvider = {
  name: "telnyx",

  async buyNumber(areaCode: string): Promise<BoughtNumber> {
    const profile = requireEnv("TELNYX_MESSAGING_PROFILE_ID");
    // 1) search available numbers in area code
    const search = (await tx(
      `/available_phone_numbers?filter[national_destination_code]=${areaCode}&filter[features][]=sms&filter[limit]=1`,
    )) as { data: Array<{ phone_number: string }> };
    const phone = search.data?.[0]?.phone_number;
    if (!phone) throw new Error(`No Telnyx numbers available for area code ${areaCode}`);

    // 2) order the number
    const order = (await tx("/number_orders", {
      method: "POST",
      body: JSON.stringify({ phone_numbers: [{ phone_number: phone }] }),
    })) as { data: { id: string } };

    // 3) attach to messaging profile so it can send SMS
    await tx(`/phone_numbers/${encodeURIComponent(phone)}/messaging`, {
      method: "PATCH",
      body: JSON.stringify({ messaging_profile_id: profile }),
    });

    return { phone, providerSid: order.data.id };
  },

  async searchAvailable(areaCode: string, limit = 20): Promise<AvailableNumber[]> {
    const search = (await tx(
      `/available_phone_numbers?filter[national_destination_code]=${areaCode}&filter[features][]=sms&filter[limit]=${limit}`,
    )) as { data: Array<{ phone_number: string; region_information?: Array<{ region_name?: string }> }> };
    return (search.data ?? []).map((r) => ({
      phone: r.phone_number,
      areaCode,
      region: r.region_information?.[0]?.region_name,
    }));
  },

  async buySpecific(phone: string): Promise<BoughtNumber> {
    const profile = requireEnv("TELNYX_MESSAGING_PROFILE_ID");
    const order = (await tx("/number_orders", {
      method: "POST",
      body: JSON.stringify({ phone_numbers: [{ phone_number: phone }] }),
    })) as { data: { id: string } };
    await tx(`/phone_numbers/${encodeURIComponent(phone)}/messaging`, {
      method: "PATCH",
      body: JSON.stringify({ messaging_profile_id: profile }),
    });
    return { phone, providerSid: order.data.id };
  },

  async submitBrand(brand: BrandSubmission): Promise<{ providerId: string; status: string }> {
    // Telnyx 10DLC brand registration.
    // Docs: https://developers.telnyx.com/api/messaging/tag/Brand
    const resp = (await tx("/10dlc/brand", {
      method: "POST",
      body: JSON.stringify({
        entityType: "PRIVATE_PROFIT",
        brandRelationship: "BASIC_ACCOUNT",
        vertical: "TECHNOLOGY",
        displayName: brand.legalName,
        companyName: brand.legalName,
        ein: brand.ein,
        website: brand.website,
        email: brand.contactEmail,
        country: "US",
      }),
    })) as { brandId?: string; identityStatus?: string; id?: string; status?: string };
    return {
      providerId: resp.brandId ?? resp.id ?? "",
      status: resp.identityStatus ?? resp.status ?? "pending",
    };
  },

  async submitCampaign(campaign: CampaignSubmission): Promise<{ providerId: string; status: string }> {
    const profile = requireEnv("TELNYX_MESSAGING_PROFILE_ID");
    const resp = (await tx("/10dlc/campaign", {
      method: "POST",
      body: JSON.stringify({
        brandId: campaign.brandProviderId,
        usecase: "ACCOUNT_NOTIFICATION",
        subUsecases: ["LEAD_MANAGEMENT"],
        description: campaign.useCase,
        messageFlow: campaign.optInFlow,
        sample1: campaign.sampleMessages[0] ?? "",
        sample2: campaign.sampleMessages[1] ?? campaign.sampleMessages[0] ?? "",
        hasEmbeddedLinks: true,
        hasEmbeddedPhone: false,
        messagingProfileId: profile,
      }),
    })) as { campaignId?: string; id?: string; status?: string };
    return {
      providerId: resp.campaignId ?? resp.id ?? "",
      status: resp.status ?? "pending",
    };
  },

  async releaseNumber(providerSid: string): Promise<void> {
    // (see fetchBrandStatus / fetchCampaignStatus above for 10DLC polling)
    // providerSid stores the phone_number id or E.164 — accept either.
    await tx(`/phone_numbers/${encodeURIComponent(providerSid)}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  },

  async send(from: string, to: string, body: string): Promise<SmsSendResult> {
    const profile = requireEnv("TELNYX_MESSAGING_PROFILE_ID");
    const resp = (await tx("/messages", {
      method: "POST",
      body: JSON.stringify({ from, to, text: body, messaging_profile_id: profile }),
    })) as { data: { id: string; to?: Array<{ status?: string }> } };
    return { providerSid: resp.data.id, status: resp.data.to?.[0]?.status ?? "queued" };
  },

  async parseInbound(req: Request): Promise<InboundMessage> {
    const payload = (await req.clone().json()) as {
      data?: {
        event_type?: string;
        payload?: {
          from?: { phone_number?: string };
          to?: Array<{ phone_number?: string }>;
          text?: string;
          id?: string;
          received_at?: string;
        };
      };
    };
    const p = payload.data?.payload ?? {};
    return {
      from: p.from?.phone_number ?? "",
      to: p.to?.[0]?.phone_number ?? "",
      body: p.text ?? "",
      providerSid: p.id ?? "",
      receivedAt: p.received_at ?? new Date().toISOString(),
    };
  },

  async parseDlr(req: Request): Promise<Dlr> {
    const payload = (await req.clone().json()) as {
      data?: {
        payload?: {
          id?: string;
          to?: Array<{ status?: string; carrier?: string }>;
          errors?: Array<{ code?: string }>;
        };
      };
    };
    const p = payload.data?.payload ?? {};
    const raw = p.to?.[0]?.status ?? "sent";
    const status: Dlr["status"] =
      raw === "delivered" ? "delivered" :
      raw === "sending_failed" || raw === "delivery_failed" ? "failed" :
      raw === "sent" ? "sent" : "queued";
    return {
      providerSid: p.id ?? "",
      status,
      errorCode: p.errors?.[0]?.code,
      carrier: p.to?.[0]?.carrier ?? null,
    };
  },

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const sig = req.headers.get("telnyx-signature-ed25519");
    const ts = req.headers.get("telnyx-timestamp");
    const pub = process.env.TELNYX_PUBLIC_KEY;
    if (!sig || !ts || !pub) return false;

    // Reject stale timestamps (>5 min drift).
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;

    try {
      const key = await crypto.subtle.importKey(
        "raw",
        b64ToBuf(pub),
        { name: "Ed25519" },
        false,
        ["verify"],
      );
      const signedBuf = new TextEncoder().encode(`${ts}|${rawBody}`).slice().buffer;
      return await crypto.subtle.verify("Ed25519", key, b64ToBuf(sig), signedBuf);
    } catch {
      return false;
    }
  },
};