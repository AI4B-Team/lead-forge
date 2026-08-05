// Telnyx sends every messaging event (inbound + delivery receipts) to the ONE
// webhook_url configured on the messaging profile, so both routes share this
// handler and the inbound route dispatches DLR events here by event_type.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getProvider } from "@/lib/sms";

export async function handleTelnyxDlr(request: Request, raw: string): Promise<Response> {
  const provider = getProvider();
  const req2 = new Request(request.url, { method: "POST", headers: request.headers, body: raw });
  const dlr = await provider.parseDlr(req2);
  if (!dlr.providerSid) return new Response("Missing sid", { status: 400 });

  const admin = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  await admin
    .from("messages")
    .update({
      status: dlr.status,
      error_code: dlr.errorCode ?? null,
      ...(dlr.carrier ? { carrier: dlr.carrier } : {}),
    })
    .eq("provider_sid", dlr.providerSid);

  let paused = false;
  if (dlr.status === "delivered" || dlr.status === "failed") {
    const { recordDeliveryOutcome } = await import("@/lib/deliverability.server");
    const outcome = await recordDeliveryOutcome({
      providerSid: dlr.providerSid,
      delivered: dlr.status === "delivered",
      carrier: dlr.carrier ?? null,
    });
    paused = outcome.paused;
  }

  return Response.json({ ok: true, status: dlr.status, paused });
}
