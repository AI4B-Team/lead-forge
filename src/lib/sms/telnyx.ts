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

import type { SmsProvider, SmsSendResult, InboundMessage, Dlr, BoughtNumber } from "./provider";

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

  async releaseNumber(providerSid: string): Promise<void> {
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
          to?: Array<{ status?: string }>;
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