// Provider-agnostic SMS interface. Every carrier implementation (Telnyx now,
// Twilio later) satisfies this contract; the rest of the app never touches a
// concrete provider directly — only through `getProvider()`.

export interface SmsSendResult {
  providerSid: string;
  status: string;
}

export interface InboundMessage {
  from: string;
  to: string;
  body: string;
  providerSid: string;
  receivedAt: string;
}

export interface Dlr {
  providerSid: string;
  status: "delivered" | "failed" | "sent" | "queued";
  errorCode?: string;
}

export interface BoughtNumber {
  phone: string;
  providerSid: string;
}

export interface SmsProvider {
  readonly name: string;
  buyNumber(areaCode: string): Promise<BoughtNumber>;
  releaseNumber(providerSid: string): Promise<void>;
  send(from: string, to: string, body: string): Promise<SmsSendResult>;
  parseInbound(req: Request): Promise<InboundMessage>;
  parseDlr(req: Request): Promise<Dlr>;
  verifyWebhook(req: Request, rawBody: string): Promise<boolean>;
}