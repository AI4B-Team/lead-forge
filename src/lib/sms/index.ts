import type { SmsProvider } from "./provider";
import { telnyxProvider } from "./telnyx";

// Single seam for swapping carriers. Add a Twilio implementation later and
// switch the return value here (or read from `process.env.SMS_PROVIDER`).
export function getProvider(): SmsProvider {
  return telnyxProvider;
}

export function isProviderConfigured(): boolean {
  return Boolean(
    process.env.TELNYX_API_KEY &&
      process.env.TELNYX_MESSAGING_PROFILE_ID &&
      process.env.TELNYX_PUBLIC_KEY,
  );
}

// Age-based warmup cap. Section 2 of the Telnyx build spec.
export function warmupCap(activatedAt: string | Date): number {
  const ageDays = Math.floor((Date.now() - new Date(activatedAt).getTime()) / 86_400_000);
  if (ageDays <= 1) return 200;
  if (ageDays <= 4) return 500;
  if (ageDays <= 9) return 1500;
  return 8000;
}

// Standard opt-out / help keyword matchers. Platform-standard, not user-configurable.
export const OPTOUT_RE = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|remove)\b/i;
export const HELP_RE = /^\s*help\b/i;

export const OPTOUT_CONFIRMATION =
  "You are unsubscribed and will receive no more messages. Reply HELP for help.";
export const HELP_RESPONSE =
  "Reply STOP to unsubscribe. Msg&data rates may apply. Support: support@leadtrace.app";