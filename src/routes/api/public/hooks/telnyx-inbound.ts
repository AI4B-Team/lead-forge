import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getProvider } from "@/lib/sms";
import { OPTOUT_RE, HELP_RE, OPTOUT_CONFIRMATION, HELP_RESPONSE } from "@/lib/sms";

// Telnyx inbound-message webhook. Verifies signature, records the reply,
// halts the drip, and enforces STOP/HELP compliance. See Section 6 of the
// LeadTrace Telnyx build spec — these rules are non-configurable.
export const Route = createFileRoute("/api/public/hooks/telnyx-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const provider = getProvider();

        if (!(await provider.verifyWebhook(request, raw))) {
          return new Response("Invalid signature", { status: 403 });
        }

        // Rebuild a Request so parseInbound can read the body again.
        const req2 = new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: raw,
        });
        const inbound = await provider.parseInbound(req2);
        if (!inbound.from || !inbound.body) return new Response("Missing fields", { status: 400 });

        const admin = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const { data: num } = await admin
          .from("sending_numbers")
          .select("id, workspace_id, phone")
          .eq("phone", inbound.to)
          .maybeSingle();
        if (!num) return new Response("Unknown destination", { status: 404 });

        const { data: lead } = await admin
          .from("leads")
          .select("id")
          .eq("workspace_id", num.workspace_id)
          .eq("phone", inbound.from)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let campaignId: string | null = null;
        if (lead) {
          const { data: last } = await admin
            .from("messages")
            .select("campaign_id")
            .eq("workspace_id", num.workspace_id)
            .eq("lead_id", lead.id)
            .eq("direction", "outbound")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          campaignId = last?.campaign_id ?? null;
        }

        const isOptOut = OPTOUT_RE.test(inbound.body);
        const isHelp = HELP_RE.test(inbound.body);

        const { data: inboundRow } = await admin.from("messages").insert({
          workspace_id: num.workspace_id,
          campaign_id: campaignId,
          lead_id: lead?.id ?? null,
          sending_number_id: num.id,
          direction: "inbound",
          body: inbound.body,
          is_optout: isOptOut,
          status: "received",
          provider_sid: inbound.providerSid,
        }).select("id").single();

        if (isOptOut) {
          // Suppress the phone across ALL future campaigns for this workspace.
          await admin
            .from("suppression")
            .upsert({ workspace_id: num.workspace_id, phone: inbound.from, reason: "optout" });
          try {
            const send = await provider.send(inbound.to, inbound.from, OPTOUT_CONFIRMATION);
            await admin.from("messages").insert({
              workspace_id: num.workspace_id,
              lead_id: lead?.id ?? null,
              sending_number_id: num.id,
              direction: "outbound",
              body: OPTOUT_CONFIRMATION,
              status: send.status,
              provider_sid: send.providerSid,
            });
          } catch {
            /* delivery is best-effort; suppression is already recorded */
          }
        } else if (isHelp) {
          try {
            const send = await provider.send(inbound.to, inbound.from, HELP_RESPONSE);
            await admin.from("messages").insert({
              workspace_id: num.workspace_id,
              lead_id: lead?.id ?? null,
              sending_number_id: num.id,
              direction: "outbound",
              body: HELP_RESPONSE,
              status: send.status,
              provider_sid: send.providerSid,
            });
          } catch {
            /* best-effort */
          }
        } else if (campaignId) {
          // AI Warm-Up Bot — runs ONLY after opt-out and HELP are handled, so it
          // can never talk past a compliance keyword.
          const { data: campaign } = await admin
            .from("campaigns")
            .select("bot_enabled, bot_config, regulated_vertical")
            .eq("id", campaignId)
            .maybeSingle();

          if (campaign?.bot_enabled) {
            const { generateBotReply } = await import("@/lib/bot.server");
            const { buildKnowledgeBrief } = await import("@/lib/bot-training.server");
            const { data: knowledgeRows } = await admin
              .from("bot_knowledge")
              .select("title, content, source_type, source_url")
              .eq("campaign_id", campaignId)
              .order("created_at", { ascending: false })
              .limit(25);
            const outcome = await generateBotReply({
              message: inbound.body,
              config: (campaign.bot_config ?? {}) as Record<string, never>,
              regulated: !!campaign.regulated_vertical,
              knowledge: buildKnowledgeBrief(knowledgeRows ?? []),
            });

            if (outcome.action === "reply") {
              try {
                const send = await provider.send(inbound.to, inbound.from, outcome.body);
                await admin.from("messages").insert({
                  workspace_id: num.workspace_id,
                  campaign_id: campaignId,
                  lead_id: lead?.id ?? null,
                  sending_number_id: num.id,
                  direction: "outbound",
                  body: outcome.body,
                  is_bot: true,
                  status: send.status,
                  provider_sid: send.providerSid,
                });
              } catch {
                /* best-effort; thread stays in the inbox for a human */
              }
            } else if (inboundRow) {
              // Hand the thread to a human and record why the bot stepped back.
              await admin
                .from("messages")
                .update({ handoff_reason: outcome.reason })
                .eq("id", inboundRow.id);
            }
          }
        }

        return Response.json({ ok: true, optOut: isOptOut, help: isHelp });
      },
    },
  },
});